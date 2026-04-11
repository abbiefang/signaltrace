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
  let _lang           = (() => { try { return localStorage.getItem('st_voice_lang') || navigator.language || 'zh-CN'; } catch (_) { return navigator.language || 'zh-CN'; } })();

  /** Returns true if the browser supports the Web Speech API. */
  function isSupported() {
    return !!SpeechRecognitionAPI;
  }

  /** Get / set the recognition language. Persists across sessions. */
  function getLang() { return _lang; }
  function setLang(lang) {
    _lang = lang;
    try { localStorage.setItem('st_voice_lang', lang); } catch (_) { /* private mode — no-op */ }
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
    if (/\b(texted|text message|sent a text|dmed|dm|messaged|double texted|double-texted|texted twice|sent two messages)\b/i.test(t))            return 'text';
    if (/\b(called|phone call|voice call|rang|facetimed|facetime)\b/i.test(t))         return 'call';
    if (/\b(met|date|coffee|dinner|drinks|lunch|hung out|hangout|in person|saw (him|her|them))\b/i.test(t)) return 'date';
    if (/\b(voice note|voice message|audio message|voice memo)\b/i.test(t))            return 'voice_note';
    if (/\b(story|instagram|tiktok|liked (my|a)|posted|social media|seen my)\b/i.test(t)) return 'social';
    if (/\b(ghosted|ignored me|stopped replying|disappeared|vanished|no contact)\b/i.test(t)) return 'ghosted';
    // Chinese
    if (/(\u53d1\u6d88\u606f|\u5fae\u4fe1|\u77ed\u4fe1|\u53d1\u77ed\u4fe1|\u53d1\u4e86\u6761|\u804a\u5929|\u4fe1\u606f)/.test(t))                           return 'text';
    if (/(\u6253\u7535\u8bdd|\u7535\u8bdd|\u89c6\u9891\u901a\u8bdd|\u8bed\u97f3\u901a\u8bdd|FaceTime|facetime|\u901a\u8bdd)/.test(t))               return 'call';
    if (/(\u89c1\u9762|\u7ea6\u4f1a|\u559d\u5496\u5561|\u559d\u9152|\u89c1\u4e86|\u78b0\u9762|\u51fa\u53bb\u73a9|\u7ea6\u4e86|\u7ebf\u4e0b|\u5f53\u9762)/.test(t))              return 'date';
    if (/(\u8bed\u97f3\u6d88\u606f|\u8bed\u97f3\u7559\u8a00|\u53d1\u4e86\u8bed\u97f3|\u5f55\u4e86\u4e2a\u8bed\u97f3|\u53d1\u8bed\u97f3|\u53d1\u4e86\u4e2a\u8bed\u97f3|\u53d1\u6761\u8bed\u97f3|\u53d1\u4e86\u6761\u8bed\u97f3)/.test(t)) return 'voice_note';
    if (/\u8bed\u97f3/.test(t) && !/(\u8bed\u97f3\u901a\u8bdd|\u7535\u8bdd|FaceTime|facetime)/.test(t))               return 'voice_note';
    if (/(\u670b\u53cb\u5708|\u70b9\u8d5e|Instagram|\u5c0f\u7ea2\u4e66|\u6296\u97f3|TikTok|\u53d1\u5e16|\u770b\u4e86\u6211)/.test(t))              return 'social';
    if (/(\u6d88\u5931\u4e86|\u4e0d\u56de\u6d88\u606f|\u62c9\u9ed1|\u5c4f\u853d|\u4e0d\u7406\u6211|\u8bfb\u4e86\u4e0d\u56de|\u6d88\u5931|\u5931\u8054)/.test(t))               return 'ghosted';
    return null;
  }

  /** Who initiated — English + Chinese */
  function _initiatedBy(t) {
    // English
    if (/\bi (texted|called|reached out|messaged|initiated|wrote|sent|dm[e']d|rang)\b/i.test(t)) return 'me';
    if (/\b(he|she|they|him|her) (texted|called|reached out|messaged|initiated|wrote|sent|dm[e']d|rang)\b/i.test(t)) return 'them';
    if (/\bmutual\b/i.test(t)) return 'mutual';
    // Chinese
    if (/(\u6211\u4e3b\u52a8|\u6211\u5148|\u6211\u53d1|\u6211\u6253|\u6211\u7ea6|\u6211\u8054\u7cfb|\u6211\u627e\u4ed6|\u6211\u627e\u5979|\u6211\u56de|\u6211\u56de\u590d|\u6211\u56de\u4e86)/.test(t))   return 'me';
    if (/(\u4ed6\u4e3b\u52a8|\u5979\u4e3b\u52a8|\u5bf9\u65b9\u5148|\u4ed6\u627e\u6211|\u5979\u627e\u6211|\u4ed6\u53d1|\u5979\u53d1|\u4ed6\u6253|\u5979\u6253|\u4ed6\u7ea6|\u5979\u7ea6|\u4ed6\u5148|\u5979\u5148|\u4ed6\u8054\u7cfb|\u5979\u8054\u7cfb|\u4ed6\u56de|\u5979\u56de|\u5bf9\u65b9\u56de|\u4ed6\u56de\u590d|\u5979\u56de\u590d|\u4ed6\u56de\u4e86|\u5979\u56de\u4e86|\u5bf9\u65b9\u56de\u4e86|\u56de\u6211\u4e86|\u56de\u6211)/.test(t)) return 'them';
    if (/(\u4e92\u76f8|\u53cc\u65b9|\u4e00\u8d77|\u540c\u65f6)/.test(t))                                               return 'mutual';
    return null;
  }

  /** Mood — English + Chinese */
  function _mood(t) {
    // English
    if (/\b(amazing|incredible|perfect|wonderful|on fire|so good|so great|really great|really good|felt great|felt amazing|brilliant|fantastic|excellent|asked me questions|showed interest|remembered what I said)\b/i.test(t)) return 'great';
    if (/\b(felt good|went well|great vibe|solid|positive|happy|connected|warm|nice|good energy)\b/i.test(t)) return 'good';
    if (/\b(felt off|felt weird|felt awkward|felt distant|felt cold|felt strange|uncomfortable|uneasy|bad vibe|not great|didn.?t feel right|off energy|bit off|kind of off|cancelled on me|bailed|flaked|stood me up)\b/i.test(t)) return 'off';
    if (/\b(meh|okay|ok|fine|neutral|so.?so|alright|average|mediocre|whatever|not much|nothing special)\b/i.test(t)) return 'meh';
    // Chinese
    if (/(\u592a\u597d\u4e86|\u8d85\u68d2|\u5b8c\u7f8e|\u5f88\u68d2|\u68d2\u6781\u4e86|\u5f88\u5f00\u5fc3|\u5f88\u6109\u5feb|\u8d85\u597d|\u8d85\u7ea7\u597d|\u611f\u89c9\u5f88\u597d)/.test(t))   return 'great';
    if (/(\u8fd8\u4e0d\u9519|\u633a\u597d\u7684|\u4e0d\u9519|\u5f00\u5fc3|\u6109\u5feb|\u611f\u89c9\u597d|\u6709\u611f\u89c9|\u6709\u6c1b\u56f4)/.test(t))                 return 'good';
    if (/(\u602a\u602a\u7684|\u522b\u626d|\u51b7\u6de1|\u611f\u89c9\u4e0d\u5bf9|\u6709\u70b9\u5947\u602a|\u4e0d\u8212\u670d|\u5f88\u51b7|\u8ddd\u79bb\u611f|\u6709\u70b9\u8fdc)/.test(t))      return 'off';
    if (/(\u4e00\u822c|\u8fd8\u884c|\u666e\u901a|\u9a6c\u9a6c\u864e\u864e|\u51d1\u5408|\u6ca1\u4ec0\u4e48\u611f\u89c9|\u5e73\u5e73|\u8fd8\u597d)/.test(t))                 return 'meh';
    return null;
  }

  /** Response time — English + Chinese */
  function _responseTime(t) {
    // English
    if (/\b(left on read|no reply|didn.?t reply|didn.?t respond|no response|ghosted me|ignored|never replied|still waiting)\b/i.test(t)) return 'no_response';
    if (/\b(replied (right away|immediately|instantly|super fast|fast|quickly|straight away)|instant reply|quick response|responded (fast|immediately|right away))\b/i.test(t)) return 'fast';
    if (/\b(took (forever|a while|so long|hours|a long time|ages|days)|slow (reply|response)|replied slow(ly)?|responded slow(ly)?|after (a few|3|4|5|6|7|8|several) hours|took all day|replied the next day|days later)\b/i.test(t)) return 'slow';
    if (/\b(left me on read then replied|read it and replied later)\b/i.test(t)) return 'slow';
    // Chinese
    if (/(\u6ca1\u56de|\u4e0d\u56de|\u4e0d\u7406|\u8bfb\u4e86\u4e0d\u56de|\u6d88\u606f\u5df2\u8bfb|\u5df2\u8bfb\u4e0d\u56de|\u6ca1\u6709\u56de\u590d|\u4e0d\u56de\u590d)/.test(t))          return 'no_response';
    if (/(\u9a6c\u4e0a\u56de|\u79d2\u56de|\u7acb\u523b\u56de|\u5f88\u5feb\u56de|\u56de\u5f97\u5f88\u5feb|\u5373\u65f6\u56de\u590d)/.test(t))                        return 'fast';
    if (/(\u5f88\u4e45\u624d\u56de|\u597d\u4e45\u624d\u56de|\u56de\u5f97\u5f88\u6162|\u6162\u6162\u624d\u56de|\u9694\u4e86\u5f88\u4e45|\u62d6\u4e86\u5f88\u4e45)/.test(t))              return 'slow';
    if (/(\u53ea\u56de\u4e86|\u5c31\u56de\u4e86|\u53ea\u8bf4\u4e86|\u5c31\u8bf4\u4e86).{0,4}(\u55ef|\u54e6|\u597d|\u5662|\u54c8|\u5475|\u5509|\u554a|\u55ef\u55ef|ok|OK|\u597d\u7684)/.test(t)) return 'slow';
    return null;
  }

  /** Red flags — English + Chinese */
  function _redFlags(t) {
    const flags = [];
    // English
    if (/\b(cancelled (on me|last minute)|bailed (on me|last minute)|flaked (on me|last minute)|stood me up|cancelled plans)\b/i.test(t))
      flags.push('Cancelled plans');
    if (/\b(talked about someone else|kept checking (their|his|her) phone)\b/i.test(t))
      flags.push('Other');
    return flags.length > 0 ? flags : null;
  }

  /** Green flags — English + Chinese */
  function _greenFlags(t) {
    const flags = [];
    // English
    if (/\b(asked me questions|showed interest|remembered what I said|planned ahead|followed up)\b/i.test(t))
      flags.push('Asked follow-up questions');
    return flags.length > 0 ? flags : null;
  }

  /**
   * Parse a voice transcript into structured form fields.
   *
   * @param  {string} transcript
   * @returns {{ type, initiatedBy, mood, responseTime, redFlags, greenFlags, notes }}
   *          — any field can be null if not detected
   */
  function parse(transcript) {
    if (!transcript || !transcript.trim()) return {};
    return {
      type:         _type(transcript),
      initiatedBy:  _initiatedBy(transcript),
      mood:         _mood(transcript),
      responseTime: _responseTime(transcript),
      redFlags:     _redFlags(transcript),
      greenFlags:   _greenFlags(transcript),
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
