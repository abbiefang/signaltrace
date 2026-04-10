/**
 * SignalTrace — voice.js
 * Web Speech API wrapper + keyword NLP for voice-assisted log entry.
 *
 * Exports (window):
 *   VoiceInput  — start / stop / isSupported
 *   VoiceNLP    — parse(transcript) → { type, initiatedBy, mood, responseTime, notes }
 *
 * No server required. Runs entirely in the browser.
 */


/* ─────────────────────────────────────────────────────────────────
   VOICE INPUT MODULE
   Wraps SpeechRecognition with continuous listening + auto-restart.
───────────────────────────────────────────────────────────────── */

const VoiceInput = (() => {
  const SpeechRecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;

  let _rec            = null;
  let _isListening    = false;
  let _onResultCb     = null;
  let _onErrorCb      = null;
  let _onEndCb        = null;
  let _accumulated    = '';   // all finalized text so far
  let _lastInterim    = '';   // most recent interim chunk
  let _lang           = localStorage.getItem('st_voice_lang') || 'zh-CN';

  /** Returns true if the browser supports the Web Speech API. */
  function isSupported() {
    return !!SpeechRecognitionAPI;
  }

  /** Get / set the recognition language. Persists across sessions. */
  function getLang() { return _lang; }
  function setLang(lang) {
    _lang = lang;
    localStorage.setItem('st_voice_lang', lang);
  }

  function _buildRecognition(lang) {
    const rec = new SpeechRecognitionAPI();
    rec.lang             = lang || _lang;
    rec.interimResults   = true;
    rec.continuous       = true;
    rec.maxAlternatives  = 1;

    rec.onresult = (event) => {
      let newFinal  = '';
      let interim   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          newFinal += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }

      if (newFinal) {
        _accumulated += (_accumulated && !_accumulated.endsWith(' ') ? ' ' : '') + newFinal;
      }
      _lastInterim = interim;

      if (_onResultCb) {
        _onResultCb({
          interim:  interim.trim(),
          final:    _accumulated.trim(),
          isFinal:  !!newFinal,
        });
      }
    };

    rec.onerror = (event) => {
      // 'no-speech' just means silence — not a real error
      if (event.error === 'no-speech') return;
      _isListening = false;
      if (_onErrorCb) _onErrorCb(event.error);
    };

    rec.onend = () => {
      // Auto-restart to keep listening until the user explicitly stops
      if (_isListening) {
        try {
          rec.start();
        } catch (_) {
          _isListening = false;
          if (_onEndCb) _onEndCb(_accumulated.trim());
        }
      } else {
        if (_onEndCb) _onEndCb(_accumulated.trim());
      }
    };

    return rec;
  }

  /**
   * Start listening.
   *
   * @param {function} onResult  — ({ interim, final, isFinal }) => void
   * @param {function} onError   — (errorString) => void
   * @param {function} onEnd     — (accumulatedText) => void  (fires when stop() completes)
   */
  function start(onResult, onError, onEnd) {
    if (!isSupported()) {
      if (onError) onError('Speech recognition is not supported in this browser.');
      return;
    }
    if (_isListening) return;

    _onResultCb  = onResult;
    _onErrorCb   = onError;
    _onEndCb     = onEnd;
    _accumulated = '';
    _lastInterim = '';
    _isListening = true;
    _rec         = _buildRecognition(_lang);

    try {
      _rec.start();
    } catch (e) {
      _isListening = false;
      if (onError) onError(e.message);
    }
  }

  /** Stop listening. onEnd fires asynchronously when recognition fully stops. */
  function stop() {
    if (!_rec || !_isListening) return;
    _isListening = false;
    try {
      _rec.stop();
    } catch (_) { /* ignore */ }
  }

  /**
   * Returns the full transcript including any pending interim text.
   * Call just before stop() to capture everything the user said.
   */
  function getFullTranscript() {
    const parts = [_accumulated.trim(), _lastInterim.trim()].filter(Boolean);
    return parts.join(' ');
  }

  return {
    isSupported,
    start,
    stop,
    getFullTranscript,
    getLang,
    setLang,
    get isListening() { return _isListening; },
  };
})();


/* ─────────────────────────────────────────────────────────────────
   VOICE NLP PARSER
   Keyword/regex heuristics — extracts structured fields from a
   free-form spoken description of an interaction.
───────────────────────────────────────────────────────────────── */

const VoiceNLP = (() => {

  /** Interaction type — English + Chinese */
  function _type(t) {
    // English
    if (/\b(texted|text message|sent a text|dmed|dm|messaged)\b/i.test(t))            return 'text';
    if (/\b(called|phone call|voice call|rang|facetimed|facetime)\b/i.test(t))         return 'call';
    if (/\b(met|date|coffee|dinner|drinks|lunch|hung out|hangout|in person|saw (him|her|them))\b/i.test(t)) return 'date';
    if (/\b(voice note|voice message|audio message|voice memo)\b/i.test(t))            return 'voice_note';
    if (/\b(story|instagram|tiktok|liked (my|a)|posted|social media|seen my)\b/i.test(t)) return 'social';
    if (/\b(ghosted|ignored me|stopped replying|disappeared|vanished|no contact)\b/i.test(t)) return 'ghosted';
    // Chinese
    if (/(发消息|微信|短信|发短信|发了条|聊天|信息)/.test(t))                           return 'text';
    if (/(打电话|电话|视频通话|语音通话|FaceTime|facetime|通话)/.test(t))               return 'call';
    if (/(见面|约会|喝咖啡|喝酒|见了|碰面|出去玩|约了|线下|当面)/.test(t))              return 'date';
    if (/(语音消息|语音留言|发了语音|录了个语音|发语音|发了个语音|发条语音|发了条语音)/.test(t)) return 'voice_note';
    if (/语音/.test(t) && !/(语音通话|电话|FaceTime|facetime)/.test(t))               return 'voice_note';
    if (/(朋友圈|点赞|Instagram|小红书|抖音|TikTok|发帖|看了我)/.test(t))              return 'social';
    if (/(消失了|不回消息|拉黑|屏蔽|不理我|读了不回|消失|失联)/.test(t))               return 'ghosted';
    return null;
  }

  /** Who initiated — English + Chinese */
  function _initiatedBy(t) {
    // English
    if (/\bi (texted|called|reached out|messaged|initiated|wrote|sent|dm[e']d|rang)\b/i.test(t)) return 'me';
    if (/\b(he|she|they|him|her) (texted|called|reached out|messaged|initiated|wrote|sent|dm[e']d|rang)\b/i.test(t)) return 'them';
    if (/\bmutual\b/i.test(t)) return 'mutual';
    // Chinese
    if (/(我主动|我先|我发|我打|我约|我联系|我找他|我找她)/.test(t))                    return 'me';
    if (/(他主动|她主动|对方先|他找我|她找我|他发|她发|他打|她打|他约|她约|他先|她先|他联系|她联系)/.test(t)) return 'them';
    if (/(互相|双方|一起|同时)/.test(t))                                               return 'mutual';
    return null;
  }

  /** Mood — English + Chinese */
  function _mood(t) {
    // English
    if (/\b(amazing|incredible|perfect|wonderful|on fire|so good|so great|really great|really good|felt great|felt amazing|brilliant|fantastic|excellent)\b/i.test(t)) return 'great';
    if (/\b(felt good|went well|great vibe|solid|positive|happy|connected|warm|nice|good energy)\b/i.test(t)) return 'good';
    if (/\b(felt off|felt weird|felt awkward|felt distant|felt cold|felt strange|uncomfortable|uneasy|bad vibe|not great|didn.?t feel right|off energy|bit off|kind of off)\b/i.test(t)) return 'off';
    if (/\b(meh|okay|ok|fine|neutral|so.?so|alright|average|mediocre|whatever|not much|nothing special)\b/i.test(t)) return 'meh';
    // Chinese
    if (/(太好了|超棒|完美|很棒|棒极了|很开心|很愉快|超好|超级好|感觉很好)/.test(t))   return 'great';
    if (/(还不错|挺好的|不错|开心|愉快|感觉好|有感觉|有氛围)/.test(t))                 return 'good';
    if (/(怪怪的|别扭|冷淡|感觉不对|有点奇怪|不舒服|很冷|距离感|有点远)/.test(t))      return 'off';
    if (/(一般|还行|普通|马马虎虎|凑合|没什么感觉|平平|还好)/.test(t))                 return 'meh';
    return null;
  }

  /** Response time — English + Chinese */
  function _responseTime(t) {
    // English
    if (/\b(left on read|no reply|didn.?t reply|didn.?t respond|no response|ghosted me|ignored|never replied|still waiting)\b/i.test(t)) return 'no_response';
    if (/\b(replied (right away|immediately|instantly|super fast|fast|quickly|straight away)|instant reply|quick response|responded (fast|immediately|right away))\b/i.test(t)) return 'fast';
    if (/\b(took (forever|a while|so long|hours|a long time|ages|days)|slow (reply|response)|replied slow(ly)?|responded slow(ly)?|after (a few|3|4|5|6|7|8|several) hours)\b/i.test(t)) return 'slow';
    // Chinese
    if (/(没回|不回|不理|读了不回|消息已读|已读不回|没有回复|不回复)/.test(t))          return 'no_response';
    if (/(马上回|秒回|立刻回|很快回|回得很快|即时回复)/.test(t))                        return 'fast';
    if (/(很久才回|好久才回|回得很慢|慢慢才回|隔了很久|拖了很久)/.test(t))              return 'slow';
    if (/(只回了|就回了|只说了|就说了).{0,4}(嗯|哦|好|噢|哈|呵|唉|啊|嗯嗯|ok|OK|好的)/.test(t)) return 'minimal';
    return null;
  }

  /**
   * Parse a voice transcript into structured form fields.
   *
   * @param  {string} transcript
   * @returns {{ type, initiatedBy, mood, responseTime, notes }}
   *          — any field can be null if not detected
   */
  function parse(transcript) {
    if (!transcript || !transcript.trim()) return {};
    return {
      type:         _type(transcript),
      initiatedBy:  _initiatedBy(transcript),
      mood:         _mood(transcript),
      responseTime: _responseTime(transcript),
      notes:        transcript.trim(),
    };
  }

  return { parse };
})();


/* ─────────────────────────────────────────────────────────────────
   GLOBAL REGISTRATION
───────────────────────────────────────────────────────────────── */
window.VoiceInput = VoiceInput;
window.VoiceNLP   = VoiceNLP;
