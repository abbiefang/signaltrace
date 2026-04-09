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

  /** Returns true if the browser supports the Web Speech API. */
  function isSupported() {
    return !!SpeechRecognitionAPI;
  }

  function _buildRecognition() {
    const rec = new SpeechRecognitionAPI();
    rec.lang             = 'en-US';
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
    _rec         = _buildRecognition();

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
    get isListening() { return _isListening; },
  };
})();


/* ─────────────────────────────────────────────────────────────────
   VOICE NLP PARSER
   Keyword/regex heuristics — extracts structured fields from a
   free-form spoken description of an interaction.
───────────────────────────────────────────────────────────────── */

const VoiceNLP = (() => {

  /** Interaction type */
  function _type(t) {
    if (/\b(texted|text message|sent a text|dmed|dm|messaged)\b/i.test(t))            return 'text';
    if (/\b(called|phone call|voice call|rang|facetimed|facetime)\b/i.test(t))         return 'call';
    if (/\b(met|date|coffee|dinner|drinks|lunch|hung out|hangout|in person|saw (him|her|them))\b/i.test(t)) return 'date';
    if (/\b(voice note|voice message|audio message|voice memo)\b/i.test(t))            return 'voice_note';
    if (/\b(story|instagram|tiktok|liked (my|a)|posted|social media|seen my)\b/i.test(t)) return 'social';
    if (/\b(ghosted|ignored me|stopped replying|disappeared|vanished|no contact)\b/i.test(t)) return 'ghosted';
    return null;
  }

  /** Who initiated */
  function _initiatedBy(t) {
    // "I texted / I called / I reached out / I initiated / I messaged / I wrote"
    if (/\bi (texted|called|reached out|messaged|initiated|wrote|sent|dm[e']d|rang)\b/i.test(t)) return 'me';
    // "he / she / they texted / called / reached out / messaged"
    if (/\b(he|she|they|him|her) (texted|called|reached out|messaged|initiated|wrote|sent|dm[e']d|rang)\b/i.test(t)) return 'them';
    if (/\bmutual\b/i.test(t)) return 'mutual';
    return null;
  }

  /** Mood */
  function _mood(t) {
    if (/\b(amazing|incredible|perfect|wonderful|on fire|so good|so great|really great|really good|felt great|felt amazing|brilliant|fantastic|excellent)\b/i.test(t)) return 'great';
    if (/\b(felt good|went well|great vibe|solid|positive|happy|connected|warm|nice|good energy)\b/i.test(t)) return 'good';
    if (/\b(felt off|felt weird|felt awkward|felt distant|felt cold|felt strange|uncomfortable|uneasy|bad vibe|not great|didn.?t feel right|off energy|bit off|kind of off)\b/i.test(t)) return 'off';
    if (/\b(meh|okay|ok|fine|neutral|so.?so|alright|average|mediocre|whatever|not much|nothing special)\b/i.test(t)) return 'meh';
    return null;
  }

  /** Response time */
  function _responseTime(t) {
    if (/\b(left on read|no reply|didn.?t reply|didn.?t respond|no response|ghosted me|ignored|never replied|still waiting)\b/i.test(t)) return 'no_response';
    if (/\b(replied (right away|immediately|instantly|super fast|fast|quickly|straight away)|instant reply|quick response|responded (fast|immediately|right away))\b/i.test(t)) return 'fast';
    if (/\b(took (forever|a while|so long|hours|a long time|ages|days)|slow (reply|response)|replied slow(ly)?|responded slow(ly)?|after (a few|3|4|5|6|7|8|several) hours)\b/i.test(t)) return 'slow';
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
