/**
 * SignalTrace — screens/log.js
 * Log Interaction screen.
 *
 * Entry points:
 *   renderLog(logContext)               — called by app.js SCREENS registry
 *                                         context = { personId, type } | null
 *
 *   renderLogInteraction(personId, isFirstLog)
 *                                       — direct entry, used internally and
 *                                         exposed as a public API
 *
 * On save: calls addInteraction(data) → detectSignals(personId) → navigate('person', { personId })
 */

/* ─────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────── */

const INTERACTION_TYPES = [
  { value: 'text',       emoji: '📱', label: 'Text' },
  { value: 'call',       emoji: '📞', label: 'Call' },
  { value: 'date',       emoji: '☕',  label: 'Date' },
  { value: 'voice_note', emoji: '🎙️', label: 'Voice Note' },
  { value: 'social',     emoji: '👁️', label: 'Social' },
  { value: 'ghosted',    emoji: '👻', label: 'Ghosted' },
];

const MOOD_OPTIONS = [
  { value: 'off',   emoji: '😔', label: 'Off' },
  { value: 'meh',   emoji: '😐', label: 'Meh' },
  { value: 'good',  emoji: '✨', label: 'Good' },
  { value: 'great', emoji: '🔥', label: 'Great' },
];

const RESPONSE_TIME_OPTIONS = [
  { value: 'fast',        label: 'Instant' },
  { value: 'normal',      label: 'Normal' },
  { value: 'slow',        label: 'Slow' },
  { value: 'no_response', label: 'Left on read' },
];

const INITIATED_BY_OPTIONS = [
  { value: 'them',   label: 'They did' },
  { value: 'mutual', label: 'Mutual' },
  { value: 'me',     label: 'I did' },
];

const RED_FLAGS = [
  'Hot & cold',
  'Cancelled plans',
  'Vague about availability',
  'Kept it surface level',
  'Talked about ex',
  'Future-faked',
  'Inconsistent energy',
  'Other',
];

const GREEN_FLAGS = [
  'Made concrete plans',
  'Remembered details',
  'Consistent effort',
  'Checked in',
  'Opened up',
  'Followed through',
];

// Types where response time field is relevant
const RESPONSE_TIME_TYPES = new Set(['text', 'call']);


/* ─────────────────────────────────────────────────────────────────
   LOCAL FORM STATE
   Scoped to this module. Reset fresh on every renderLogInteraction call.
───────────────────────────────────────────────────────────────── */

let _form = _makeDefaultForm();

function _makeDefaultForm() {
  return {
    personId:      null,
    interactionId: null,      // null = new interaction; string = editing existing
    editMode:      false,     // true when editing an existing interaction
    date:          _todayISO(),
    type:          null,      // null = not selected
    initiatedBy:   null,
    mood:          null,
    responseTime:  null,
    redFlags:      new Set(),
    greenFlags:    new Set(),
    notes:         '',
    screenshots:   [],        // array of base64 data URLs, max 3
  };
}

function _todayISO() {
  return new Date().toISOString().slice(0, 10);
}


/* ─────────────────────────────────────────────────────────────────
   PUBLIC ENTRY POINTS
───────────────────────────────────────────────────────────────── */

/**
 * Called by app.js SCREENS registry via:
 *   renderLog(AppState.logContext)
 *
 * @param {{ personId?: string, type?: string, interactionId?: string } | null} context
 */
function renderLog(context) {
  const personId      = context?.personId      ?? null;
  const interactionId = context?.interactionId ?? null;

  // Edit mode: open the form pre-filled with an existing interaction
  if (interactionId) {
    renderEditLog(interactionId, personId);
    return;
  }

  // Determine first-log status for this person
  let isFirstLog = false;
  if (personId && typeof getInteractions === 'function') {
    try {
      isFirstLog = getInteractions(personId).length === 0;
    } catch (_) {
      isFirstLog = false;
    }
  }

  renderLogInteraction(personId, isFirstLog);
}

/**
 * Open the log form in EDIT mode, pre-filled from an existing interaction.
 *
 * @param {string}      interactionId  — ID of the interaction to edit
 * @param {string|null} personId       — optional hint; resolved from the record if omitted
 */
function renderEditLog(interactionId, personId) {
  const ix = (typeof getInteraction === 'function') ? getInteraction(interactionId) : null;

  if (!ix) {
    // Fall back to a fresh form if the record can't be found
    renderLogInteraction(personId, false);
    return;
  }

  // Rebuild the MOOD_TO_MODEL reverse map to get the raw mood from data model mood
  // data.js stores "positive" | "neutral" | "negative", but log.js UI uses 4-option raw value.
  // We stored moodRaw at save time; use it if available, else approximate.
  const rawMood = ix.moodRaw || _modelMoodToRaw(ix.mood);

  _form = {
    personId:      ix.personId,
    interactionId: ix.id,
    editMode:      true,
    date:          ix.date || _todayISO(),
    type:          ix.type          || null,
    initiatedBy:   ix.initiatedBy   || null,
    mood:          rawMood,
    responseTime:  ix.responseTime  || null,
    redFlags:      new Set(Array.isArray(ix.redFlags)   ? ix.redFlags   : []),
    greenFlags:    new Set(Array.isArray(ix.greenFlags) ? ix.greenFlags : []),
    notes:         ix.notes || '',
  };

  const el = document.getElementById('screen-log');
  if (!el) return;

  const person = _resolvePerson(ix.personId);
  el.innerHTML = _buildHTML({ person, allPersons: [], isFirstLog: false, editMode: true });
  _bindEvents(el);
  _restoreFormUI(el);
}

/** Map data-model mood back to the closest raw 4-option value for UI. */
function _modelMoodToRaw(mood) {
  switch (mood) {
    case 'positive': return 'good';
    case 'negative': return 'off';
    default:         return 'meh';
  }
}

/**
 * Main render function. Resets local state and injects HTML into #screen-log.
 *
 * @param {string|null} personId    — pre-selected person; null shows person picker
 * @param {boolean}     isFirstLog  — shows first-interaction banner when true
 */
function renderLogInteraction(personId, isFirstLog = false) {
  _ensureScreenshotStyles();

  // Reset form state fresh each render
  _form = _makeDefaultForm();
  _form.personId = personId;

  const el = document.getElementById('screen-log');
  if (!el) return;

  // Resolve person info for header / banner
  const person = _resolvePerson(personId);

  // People list for the inline picker (only needed when no person pre-set)
  const allPersons = (!personId && typeof getAllPersons === 'function')
    ? getAllPersons()
    : [];

  el.innerHTML = _buildHTML({ person, allPersons, isFirstLog, editMode: false });
  _bindEvents(el);
}


/* ─────────────────────────────────────────────────────────────────
   RESOLUTION HELPERS
───────────────────────────────────────────────────────────────── */

function _resolvePerson(personId) {
  if (!personId) return null;
  try {
    return typeof getPerson === 'function' ? getPerson(personId) : null;
  } catch (_) {
    return null;
  }
}


/* ─────────────────────────────────────────────────────────────────
   HTML BUILDER
───────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────
   VOICE HELPERS  (safe-fail if voice.js is not loaded)
───────────────────────────────────────────────────────────────── */

/** Inline microphone SVG icon. */
function _micSVG(size) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="${size}" height="${size}" aria-hidden="true">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8"  y1="22" x2="16" y2="22"/>
  </svg>`;
}

/** Inline stop-square SVG icon (shown while recording). */
function _stopSVG(size) {
  return `<svg viewBox="0 0 24 24" fill="currentColor"
    width="${size}" height="${size}" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>`;
}

/** Voice Mode entry row + collapsible panel HTML (injected at top of the form). */
function _buildVoiceModeHTML() {
  return `
  <!-- ── Voice Mode ─────────────────────────── -->
  <div class="voice-mode-entry" id="voice-mode-entry">
    <div class="voice-mode-entry__info">
      <span class="voice-mode-entry__label">${_micSVG(13)} Voice Mode</span>
      <span class="voice-mode-entry__desc">Describe what happened — I'll fill in the fields</span>
    </div>
    <button type="button" class="voice-mode-trigger" id="voice-mode-trigger"
            aria-label="Start Voice Mode" aria-pressed="false">
      ${_micSVG(18)}
    </button>
  </div>

  <!-- Voice Mode active panel (hidden until triggered) -->
  <div class="voice-mode-panel" id="voice-mode-panel" hidden aria-hidden="true">
    <div class="voice-mode-panel__header">
      <span class="voice-mode-panel__status" id="voice-mode-status">Listening…</span>
      <button type="button"
              class="voice-mode-trigger voice-mode-trigger--sm voice-mode-trigger--recording"
              id="voice-mode-stop" aria-label="Stop recording">
        ${_stopSVG(14)}
      </button>
    </div>
    <div class="voice-mode-panel__transcript" id="voice-mode-transcript"
         aria-live="polite" aria-atomic="false">
      <span class="voice-mode-panel__placeholder">Start talking…</span>
    </div>
    <div class="voice-mode-panel__actions">
      <button type="button" class="btn btn--ghost btn--sm" id="voice-mode-cancel">Cancel</button>
      <button type="button" class="btn btn--primary btn--sm" id="voice-mode-apply" disabled>
        Apply to form
      </button>
    </div>
  </div>
  `.trim();
}


function _buildHTML({ person, allPersons, isFirstLog, editMode = false }) {
  const name = person ? _esc(person.name) : '';
  const headerTitle = editMode
    ? (person ? `Edit · ${name}` : 'Edit Interaction')
    : (person ? `Log with ${name}` : 'Log Interaction');

  return `
<div class="log-screen">

  <!-- ── Header ─────────────────────────────────── -->
  <header class="log-header">
    <button class="log-header__back icon-btn" type="button"
            data-action="go-back" aria-label="Go back">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           width="20" height="20" aria-hidden="true">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
    <h1 class="log-header__title">${headerTitle}</h1>
    <div class="log-header__spacer" aria-hidden="true"></div>
  </header>

  <!-- ── First-log banner ───────────────────────── -->
  ${isFirstLog && person ? `
  <div class="log-first-banner" role="status" aria-live="polite">
    <span aria-hidden="true">👀</span>
    First interaction with <strong>${name}</strong> — you got this.
  </div>
  ` : ''}

  <!-- ── Form ───────────────────────────────────── -->
  <form class="log-form" id="log-form" novalidate>

    \${_buildVoiceModeHTML()}

    <!-- ────────────────────────────────────────────
         CARD 1 — Who & When
    ─────────────────────────────────────────────── -->
    <section class="log-card" aria-label="Who and when">
      <h2 class="log-card__title">Who &amp; When</h2>

      ${!person ? `
      <!-- Person picker (shown only when arriving without a pre-set person) -->
      <div class="log-field" id="field-person">
        <label class="log-field__label" for="log-person-select">Person</label>
        ${allPersons.length > 0 ? `
        <select class="log-field__select" id="log-person-select" required>
          <option value="">Select person…</option>
          ${allPersons.map(p => `
          <option value="${_esc(p.id)}">${_esc(p.name)}</option>
          `).join('')}
        </select>
        ` : `
        <p class="log-field__empty-note">
          No one tracked yet.
          <button type="button" class="log-inline-link" data-action="go-dashboard">
            Add someone first →
          </button>
        </p>
        `}
      </div>
      ` : ''}

      <div class="log-field">
        <label class="log-field__label" for="log-date">Date</label>
        <input
          class="log-field__input log-field__input--date"
          type="date"
          id="log-date"
          name="date"
          value="${_todayISO()}"
          max="${_todayISO()}"
          required
          aria-required="true"
        />
      </div>
    </section>

    <!-- ────────────────────────────────────────────
         CARD 2 — What Happened
    ─────────────────────────────────────────────── -->
    <section class="log-card" aria-label="What happened">
      <h2 class="log-card__title">What happened</h2>

      <!-- Interaction type — visual grid, not a dropdown -->
      <div class="log-field">
        <span class="log-field__label">
          Type <span class="log-field__optional">optional</span>
        </span>
        <div class="log-type-grid" role="group" aria-label="Interaction type">
          ${INTERACTION_TYPES.map(t => `
          <button
            type="button"
            class="log-type-btn"
            data-type="${t.value}"
            aria-pressed="false"
          >
            <span class="log-type-btn__emoji" aria-hidden="true">${t.emoji}</span>
            <span class="log-type-btn__label">${t.label}</span>
          </button>
          `).join('')}
        </div>
      </div>

      <!-- Who initiated — 3-option toggle -->
      <div class="log-field">
        <span class="log-field__label">
          Who reached out <span class="log-field__optional">optional</span>
        </span>
        <div class="log-toggle-group" role="group" aria-label="Who initiated">
          ${INITIATED_BY_OPTIONS.map(o => `
          <button
            type="button"
            class="log-toggle-btn"
            data-initiated="${o.value}"
            aria-pressed="false"
          >${o.label}</button>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- ────────────────────────────────────────────
         CARD 3 — How It Felt
    ─────────────────────────────────────────────── -->
    <section class="log-card" aria-label="How it felt">
      <h2 class="log-card__title">How it felt</h2>

      <!-- Mood — 4-option selector -->
      <div class="log-field">
        <span class="log-field__label">
          Overall <span class="log-field__optional">optional</span>
        </span>
        <div class="log-mood-row" role="group" aria-label="Overall feeling">
          ${MOOD_OPTIONS.map(m => `
          <button
            type="button"
            class="log-mood-btn"
            data-mood="${m.value}"
            aria-pressed="false"
          >
            <span class="log-mood-btn__emoji" aria-hidden="true">${m.emoji}</span>
            <span class="log-mood-btn__label">${m.label}</span>
          </button>
          `).join('')}
        </div>
      </div>

      <!-- Response time — shown only for text / call -->
      <div class="log-field log-field--conditional" id="field-response-time" hidden aria-hidden="true">
        <span class="log-field__label">
          Response time <span class="log-field__optional">optional</span>
        </span>
        <div class="log-toggle-group log-toggle-group--4col" role="group" aria-label="Response time">
          ${RESPONSE_TIME_OPTIONS.map(o => `
          <button
            type="button"
            class="log-toggle-btn log-toggle-btn--sm"
            data-response="${o.value}"
            aria-pressed="false"
          >${o.label}</button>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- ────────────────────────────────────────────
         CARD 4 — Red Flags
    ─────────────────────────────────────────────── -->
    <section class="log-card log-card--red-tint" aria-label="Red flags">
      <h2 class="log-card__title">
        <span aria-hidden="true">🚩</span> Red flags
        <span class="log-field__optional">optional, multi-select</span>
      </h2>
      <div class="log-chips" role="group" aria-label="Red flag chips" id="chips-red">
        ${RED_FLAGS.map(flag => `
        <button
          type="button"
          class="log-chip log-chip--red"
          data-flag-red="${_esc(flag)}"
          aria-pressed="false"
        >${_esc(flag)}</button>
        `).join('')}
      </div>
    </section>

    <!-- ────────────────────────────────────────────
         CARD 5 — Green Flags
    ─────────────────────────────────────────────── -->
    <section class="log-card log-card--green-tint" aria-label="Green flags">
      <h2 class="log-card__title">
        <span aria-hidden="true">✅</span> Green flags
        <span class="log-field__optional">optional, multi-select</span>
      </h2>
      <div class="log-chips" role="group" aria-label="Green flag chips" id="chips-green">
        ${GREEN_FLAGS.map(flag => `
        <button
          type="button"
          class="log-chip log-chip--green"
          data-flag-green="${_esc(flag)}"
          aria-pressed="false"
        >${_esc(flag)}</button>
        `).join('')}
      </div>
    </section>

    <!-- ────────────────────────────────────────────
         CARD 6 — Notes
    ─────────────────────────────────────────────── -->
    <section class="log-card" aria-label="Notes">
      <div class="log-card__title-row">
        <h2 class="log-card__title">
          Notes <span class="log-field__optional">optional</span>
        </h2>
        <button type="button" class="voice-mic-btn" id="voice-notes-btn"
                aria-label="Dictate notes" aria-pressed="false">
          ${_micSVG(16)}
        </button>
      </div>
      <div class="log-field">
        <label class="sr-only" for="log-notes">Notes</label>
        <textarea
          class="log-field__textarea"
          id="log-notes"
          name="notes"
          rows="4"
          maxlength="1000"
          placeholder="What happened, how you felt..."
        ></textarea>
        <div class="log-char-count" id="log-notes-count" aria-live="polite" aria-atomic="true">
          <span id="log-notes-remaining">1000</span> characters remaining
        </div>
      </div>
    </section>

    <!-- ────────────────────────────────────────────
         CARD 7 — Screenshots
    ─────────────────────────────────────────────── -->
    <section class="log-card" aria-label="Screenshots" id="log-screenshots-card">
      <h2 class="log-card__title">
        <span aria-hidden="true">📷</span> Screenshots
        <span class="log-field__optional">optional · max 3</span>
      </h2>

      <!-- Thumbnails row (populated dynamically) -->
      <div class="log-ss-thumbs" id="log-ss-thumbs"></div>

      <!-- Drop zone / add button — hidden once 3 screenshots added -->
      <div class="log-ss-dropzone" id="log-ss-dropzone" role="button" tabindex="0"
           aria-label="Add screenshot">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span class="log-ss-dropzone__label">Add screenshot</span>
        <span class="log-ss-dropzone__hint">tap or drag &amp; drop</span>
      </div>

      <input type="file" id="log-ss-input" accept="image/*"
             style="display:none; position:absolute; pointer-events:none;">
    </section>

    <!-- ── Submit ──────────────────────────────── -->
    <div class="log-footer">
      <p class="log-validation-error" id="log-error" role="alert" hidden aria-hidden="true"></p>
      <button type="submit" class="btn btn--primary btn--full" id="log-submit">
        ${editMode ? 'Save changes' : 'Save interaction'}
      </button>
    </div>

  </form>
</div>
  `.trim();
}


/* ─────────────────────────────────────────────────────────────────
   EVENT BINDING
───────────────────────────────────────────────────────────────── */

function _bindEvents(screenEl) {
  const form = screenEl.querySelector('#log-form');
  if (!form) return;

  // ── Person selector ──────────────────────────────
  const personSelect = form.querySelector('#log-person-select');
  if (personSelect) {
    personSelect.addEventListener('change', () => {
      _form.personId = personSelect.value || null;
    });
  }

  // ── Date input ───────────────────────────────────
  const dateInput = form.querySelector('#log-date');
  if (dateInput) {
    dateInput.addEventListener('change', () => {
      _form.date = dateInput.value || _todayISO();
    });
  }

  // ── Interaction type grid ────────────────────────
  form.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.type;
      // Toggle: clicking active type deselects it
      _form.type = (_form.type === val) ? null : val;

      form.querySelectorAll('[data-type]').forEach(b => {
        const active = b.dataset.type === _form.type;
        b.classList.toggle('log-type-btn--active', active);
        b.setAttribute('aria-pressed', String(active));
      });

      _syncResponseTimeVisibility(form);
    });
  });

  // ── Initiated-by toggle ──────────────────────────
  form.querySelectorAll('[data-initiated]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.initiated;
      _form.initiatedBy = (_form.initiatedBy === val) ? null : val;

      form.querySelectorAll('[data-initiated]').forEach(b => {
        const active = b.dataset.initiated === _form.initiatedBy;
        b.classList.toggle('log-toggle-btn--active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    });
  });

  // ── Mood buttons ─────────────────────────────────
  form.querySelectorAll('[data-mood]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.mood;
      _form.mood = (_form.mood === val) ? null : val;

      form.querySelectorAll('[data-mood]').forEach(b => {
        const active = b.dataset.mood === _form.mood;
        b.classList.toggle('log-mood-btn--active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    });
  });

  // ── Response time buttons ────────────────────────
  form.querySelectorAll('[data-response]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.response;
      _form.responseTime = (_form.responseTime === val) ? null : val;

      form.querySelectorAll('[data-response]').forEach(b => {
        const active = b.dataset.response === _form.responseTime;
        b.classList.toggle('log-toggle-btn--active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    });
  });

  // ── Red flag chips (multi-select) ────────────────
  form.querySelectorAll('[data-flag-red]').forEach(btn => {
    btn.addEventListener('click', () => {
      _toggleChip(btn, 'flagRed', _form.redFlags);
    });
  });

  // ── Green flag chips (multi-select) ─────────────
  form.querySelectorAll('[data-flag-green]').forEach(btn => {
    btn.addEventListener('click', () => {
      _toggleChip(btn, 'flagGreen', _form.greenFlags);
    });
  });

  // ── Notes textarea ───────────────────────────────
  const textarea = form.querySelector('#log-notes');
  const charCount = form.querySelector('#log-notes-remaining');
  if (textarea) {
    textarea.addEventListener('input', () => {
      _form.notes = textarea.value;
      if (charCount) {
        charCount.textContent = String(1000 - textarea.value.length);
      }
    });
  }

  // ── Screenshot upload ────────────────────────────
  _bindScreenshotEvents(form);

  // ── Form submit ──────────────────────────────────
  form.addEventListener('submit', _handleSubmit);

  // ── Voice input ──────────────────────────────────
  _bindVoiceEvents(screenEl);
}


/* ─────────────────────────────────────────────────────────────────
   CHIP TOGGLE HELPER
───────────────────────────────────────────────────────────────── */

/**
 * Toggle a flag chip's selected state and mirror it into a Set.
 *
 * @param {HTMLElement} btn       — the chip button
 * @param {string}      dataKey   — dataset key on the button ('flagRed' | 'flagGreen')
 * @param {Set<string>} flagSet   — the Set to mutate (_form.redFlags or _form.greenFlags)
 */
function _toggleChip(btn, dataKey, flagSet) {
  // Convert camelCase dataset key → kebab: 'flagRed' → 'flag-red'
  const rawKey = dataKey.replace(/([A-Z])/g, '-$1').toLowerCase();
  const flag = btn.dataset[dataKey];
  if (!flag) return;

  if (flagSet.has(flag)) {
    flagSet.delete(flag);
    btn.classList.remove('log-chip--active');
    btn.setAttribute('aria-pressed', 'false');
  } else {
    flagSet.add(flag);
    btn.classList.add('log-chip--active');
    btn.setAttribute('aria-pressed', 'true');
  }
}


/* ─────────────────────────────────────────────────────────────────
   SCREENSHOTS
───────────────────────────────────────────────────────────────── */

const MAX_SCREENSHOTS = 3;

/**
 * Bind all screenshot-related events on the form.
 * Handles: drop zone click, keyboard activation, file input change, drag-and-drop.
 * @param {HTMLElement} form
 */
function _bindScreenshotEvents(form) {
  const dropZone = form.querySelector('#log-ss-dropzone');
  const fileInput = form.querySelector('#log-ss-input');
  if (!dropZone || !fileInput) return;

  // Click / keyboard open file dialog
  dropZone.addEventListener('click', () => {
    if (_form.screenshots.length < MAX_SCREENSHOTS) fileInput.click();
  });
  dropZone.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && _form.screenshots.length < MAX_SCREENSHOTS) {
      e.preventDefault();
      fileInput.click();
    }
  });

  // File input change
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files || []);
    fileInput.value = '';  // reset so same file can be re-selected
    files.forEach(file => _processScreenshot(file));
  });

  // Drag-and-drop
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    if (_form.screenshots.length < MAX_SCREENSHOTS) {
      dropZone.classList.add('log-ss-dropzone--dragover');
    }
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('log-ss-dropzone--dragover');
  });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('log-ss-dropzone--dragover');
    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
    files.forEach(file => _processScreenshot(file));
  });
}

/**
 * Compress a screenshot file and add it to form state + DOM.
 * @param {File} file
 */
async function _processScreenshot(file) {
  if (_form.screenshots.length >= MAX_SCREENSHOTS) return;
  if (typeof Photos === 'undefined') {
    console.warn('[log.js] Photos module not loaded');
    return;
  }
  try {
    // Screenshots use wider max dimension (800px) since they're usually horizontal
    const dataUrl = await Photos.processImage(file, 800, 0.75);
    _form.screenshots.push(dataUrl);
    _renderScreenshotThumbs();
  } catch (err) {
    console.warn('[log.js] Screenshot processing failed:', err);
  }
}

/**
 * Remove a screenshot by index.
 * @param {number} idx
 */
function _removeScreenshot(idx) {
  _form.screenshots.splice(idx, 1);
  _renderScreenshotThumbs();
}

/**
 * Re-render the thumbnails area and toggle drop zone visibility.
 */
function _renderScreenshotThumbs() {
  const thumbsEl  = document.getElementById('log-ss-thumbs');
  const dropZone  = document.getElementById('log-ss-dropzone');
  if (!thumbsEl) return;

  // Render thumbnails
  if (_form.screenshots.length === 0) {
    thumbsEl.innerHTML = '';
  } else {
    thumbsEl.innerHTML = _form.screenshots.map((url, idx) => `
      <div class="log-ss-thumb">
        <img src="${url}" class="log-ss-thumb__img" alt="Screenshot ${idx + 1}">
        <button type="button" class="log-ss-thumb__del"
                onclick="_logRemoveScreenshot(${idx})" aria-label="Remove screenshot">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <line x1="3" y1="3" x2="13" y2="13"/>
            <line x1="13" y1="3" x2="3" y2="13"/>
          </svg>
        </button>
      </div>
    `).join('');
  }

  // Show/hide drop zone
  if (dropZone) {
    const atMax = _form.screenshots.length >= MAX_SCREENSHOTS;
    dropZone.style.display = atMax ? 'none' : '';
    dropZone.setAttribute('aria-hidden', String(atMax));
  }
}

/** Global shim so inline onclick can reach _removeScreenshot. */
window._logRemoveScreenshot = function(idx) { _removeScreenshot(idx); };


/* ─────────────────────────────────────────────────────────────────
   CONDITIONAL FIELD: RESPONSE TIME
───────────────────────────────────────────────────────────────── */

/**
 * Show or hide the Response Time field based on the selected interaction type.
 * Clears the selection when hiding.
 *
 * @param {HTMLElement} form
 */
function _syncResponseTimeVisibility(form) {
  const rtField = form.querySelector('#field-response-time');
  if (!rtField) return;

  const shouldShow = RESPONSE_TIME_TYPES.has(_form.type);
  rtField.hidden = !shouldShow;
  rtField.setAttribute('aria-hidden', String(!shouldShow));

  if (!shouldShow && _form.responseTime !== null) {
    _form.responseTime = null;
    form.querySelectorAll('[data-response]').forEach(b => {
      b.classList.remove('log-toggle-btn--active');
      b.setAttribute('aria-pressed', 'false');
    });
  }
}


/* ─────────────────────────────────────────────────────────────────
   VOICE: APPLY NLP RESULT TO FORM
───────────────────────────────────────────────────────────────── */

/**
 * Take a VoiceNLP.parse() result and update both `_form` state and
 * the visible UI controls to reflect the detected values.
 *
 * @param {HTMLElement} form
 * @param {{ type, initiatedBy, mood, responseTime, notes }} parsed
 */
function _applyVoiceParsed(form, parsed) {
  if (!form || !parsed) return;

  // ── Interaction type ──────────────────────────
  if (parsed.type) {
    _form.type = parsed.type;
    form.querySelectorAll('[data-type]').forEach(b => {
      const active = b.dataset.type === parsed.type;
      b.classList.toggle('log-type-btn--active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    _syncResponseTimeVisibility(form);
  }

  // ── Who initiated ─────────────────────────────
  if (parsed.initiatedBy) {
    _form.initiatedBy = parsed.initiatedBy;
    form.querySelectorAll('[data-initiated]').forEach(b => {
      const active = b.dataset.initiated === parsed.initiatedBy;
      b.classList.toggle('log-toggle-btn--active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }

  // ── Mood ──────────────────────────────────────
  if (parsed.mood) {
    _form.mood = parsed.mood;
    form.querySelectorAll('[data-mood]').forEach(b => {
      const active = b.dataset.mood === parsed.mood;
      b.classList.toggle('log-mood-btn--active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }

  // ── Response time (only apply if field is visible) ──
  if (parsed.responseTime) {
    _form.responseTime = parsed.responseTime;
    form.querySelectorAll('[data-response]').forEach(b => {
      const active = b.dataset.response === parsed.responseTime;
      b.classList.toggle('log-toggle-btn--active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    _syncResponseTimeVisibility(form);
  }

  // ── Notes ─────────────────────────────────────
  if (parsed.notes) {
    const textarea  = form.querySelector('#log-notes');
    const charCount = form.querySelector('#log-notes-remaining');
    if (textarea) {
      textarea.value = parsed.notes;
      _form.notes    = parsed.notes;
      if (charCount) charCount.textContent = String(1000 - parsed.notes.length);
    }
  }
}


/* ─────────────────────────────────────────────────────────────────
   VOICE: EVENT BINDING
───────────────────────────────────────────────────────────────── */

/**
 * Wire up all voice UI inside `screenEl`.
 * Gracefully hides all voice elements if the browser doesn't support
 * the Web Speech API or if voice.js hasn't loaded.
 *
 * @param {HTMLElement} screenEl
 */
function _bindVoiceEvents(screenEl) {
  const voiceSupported =
    typeof window.VoiceInput !== 'undefined' && window.VoiceInput.isSupported();

  if (!voiceSupported) {
    // Hide all voice UI — unsupported browser (e.g. some iOS Safari versions)
    screenEl.querySelectorAll(
      '.voice-mic-btn, .voice-mode-entry, .voice-mode-panel'
    ).forEach(el => { el.style.display = 'none'; });
    return;
  }

  const form = screenEl.querySelector('#log-form');
  if (!form) return;

  /* ────────────────────────────────────────────────
     NOTES MIC BUTTON
     Tapping starts/stops dictation directly into the notes textarea.
  ─────────────────────────────────────────────── */
  const notesMicBtn   = form.querySelector('#voice-notes-btn');
  const notesTextarea = form.querySelector('#log-notes');
  const notesCount    = form.querySelector('#log-notes-remaining');

  if (notesMicBtn && notesTextarea) {
    let _notesBase = '';   // text in textarea before the current dictation session

    notesMicBtn.addEventListener('click', () => {
      if (window.VoiceInput.isListening) {
        // — Stop —
        window.VoiceInput.stop();
        _setMicRecording(notesMicBtn, false);
      } else {
        // — Start —
        _notesBase = notesTextarea.value;
        if (_notesBase && !_notesBase.endsWith(' ')) _notesBase += ' ';

        window.VoiceInput.start(
          ({ interim, final, isFinal }) => {
            // Show live transcript: base text + finalized + current interim
            const display = _notesBase + (isFinal ? final : (final || '') + interim);
            notesTextarea.value = display;
            _form.notes = display;
            if (notesCount) notesCount.textContent = String(1000 - display.length);

            // Advance the base once a result is finalized
            if (isFinal) {
              _notesBase = (_notesBase + final).replace(/  +/g, ' ');
            }
          },
          (err) => {
            _setMicRecording(notesMicBtn, false);
            console.warn('[SignalTrace/voice] Notes mic error:', err);
          }
        );

        _setMicRecording(notesMicBtn, true);
      }
    });
  }

  /* ────────────────────────────────────────────────
     VOICE MODE
     Full-form voice entry: speak a description → NLP → apply fields.
  ─────────────────────────────────────────────── */
  const vmTrigger    = form.querySelector('#voice-mode-trigger');
  const vmPanel      = form.querySelector('#voice-mode-panel');
  const vmTranscript = form.querySelector('#voice-mode-transcript');
  const vmStatus     = form.querySelector('#voice-mode-status');
  const vmStop       = form.querySelector('#voice-mode-stop');
  const vmCancel     = form.querySelector('#voice-mode-cancel');
  const vmApply      = form.querySelector('#voice-mode-apply');

  if (!vmTrigger || !vmPanel) return;

  let _vmFinalText   = '';
  let _vmInterimText = '';

  function _startVoiceMode() {
    _vmFinalText   = '';
    _vmInterimText = '';
    vmPanel.hidden = false;
    vmPanel.setAttribute('aria-hidden', 'false');
    vmTrigger.classList.add('voice-mode-trigger--recording');
    vmTrigger.setAttribute('aria-pressed', 'true');
    vmApply.disabled = true;
    vmStatus.textContent = 'Listening…';
    vmTranscript.innerHTML = '<span class="voice-mode-panel__placeholder">Start talking…</span>';

    window.VoiceInput.start(
      ({ interim, final, isFinal }) => {
        if (isFinal) _vmFinalText = final;
        _vmInterimText = interim;

        const display = (_vmFinalText + (interim ? ' ' + interim : '')).trim();
        if (display) {
          // Final text in normal weight, interim in muted italic
          const finalPart   = _vmFinalText
            ? _escHTML(_vmFinalText)
            : '';
          const interimPart = interim
            ? `<em class="voice-mode-panel__interim">${_escHTML(interim)}</em>`
            : '';
          vmTranscript.innerHTML = [finalPart, interimPart].filter(Boolean).join(' ');
        } else {
          vmTranscript.innerHTML = '<span class="voice-mode-panel__placeholder">Start talking…</span>';
        }

        vmApply.disabled = !display;
        vmStatus.textContent = 'Listening…';
      },
      (err) => {
        vmStatus.textContent = 'Mic error — try again';
        vmTrigger.classList.remove('voice-mode-trigger--recording');
        vmTrigger.setAttribute('aria-pressed', 'false');
        console.warn('[SignalTrace/voice] Voice Mode error:', err);
      }
    );
  }

  function _stopAndCloseVoiceMode(apply) {
    window.VoiceInput.stop();
    vmTrigger.classList.remove('voice-mode-trigger--recording');
    vmTrigger.setAttribute('aria-pressed', 'false');

    if (apply) {
      const fullText = (_vmFinalText + ' ' + _vmInterimText).trim();
      if (fullText && typeof window.VoiceNLP !== 'undefined') {
        const parsed = window.VoiceNLP.parse(fullText);
        _applyVoiceParsed(form, parsed);
      }
    }

    vmPanel.hidden = true;
    vmPanel.setAttribute('aria-hidden', 'true');
    _vmFinalText   = '';
    _vmInterimText = '';
  }

  // Open Voice Mode
  vmTrigger.addEventListener('click', () => {
    if (!window.VoiceInput.isListening) {
      _startVoiceMode();
    }
  });

  // Stop button (inside the panel) — stops recording but keeps panel open
  vmStop.addEventListener('click', () => {
    if (window.VoiceInput.isListening) {
      window.VoiceInput.stop();
      vmStatus.textContent = 'Stopped — apply or cancel';
      vmTrigger.classList.remove('voice-mode-trigger--recording');
      vmTrigger.setAttribute('aria-pressed', 'false');
    }
  });

  vmCancel.addEventListener('click', () => _stopAndCloseVoiceMode(false));
  vmApply.addEventListener('click',  () => _stopAndCloseVoiceMode(true));
}


/* ─────────────────────────────────────────────────────────────────
   VOICE UTILITY
───────────────────────────────────────────────────────────────── */

/** Toggle the recording visual state on a mic button. */
function _setMicRecording(btn, recording) {
  btn.classList.toggle('voice-mic-btn--recording', recording);
  btn.setAttribute('aria-pressed', String(recording));
  btn.setAttribute('aria-label', recording ? 'Stop dictation' : 'Dictate notes');
}

/** Minimal HTML escape for inline transcript display. */
function _escHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


/* ─────────────────────────────────────────────────────────────────
   FORM SUBMISSION
───────────────────────────────────────────────────────────────── */

function _handleSubmit(e) {
  e.preventDefault();

  // ── Validate ─────────────────────────────────────
  if (!_form.personId) {
    _showError('Please select a person before saving.');
    return;
  }
  if (!_form.date) {
    _showError('Please select a date.');
    return;
  }

  _clearError();

  // ── Map mood to data-model value ──────────────────
  // data.js expects: "positive" | "neutral" | "negative"
  // We store the raw 4-option value in moodRaw for richer display elsewhere.
  const MOOD_TO_MODEL = { off: 'negative', meh: 'neutral', good: 'positive', great: 'positive' };

  // ── Build interaction record ──────────────────────
  const interactionData = {
    personId:     _form.personId,
    date:         _form.date,
    type:         _form.type         ?? 'text',
    initiatedBy:  _form.initiatedBy  ?? 'mutual',
    mood:         MOOD_TO_MODEL[_form.mood] ?? 'neutral',
    moodRaw:      _form.mood,                               // preserved for UI
    responseTime: _form.responseTime ?? 'normal',
    redFlags:     Array.from(_form.redFlags),
    greenFlags:   Array.from(_form.greenFlags),
    notes:        _form.notes.trim(),
  };

  // ── Persist ───────────────────────────────────────
  let savedId = null;

  if (_form.editMode && _form.interactionId) {
    if (typeof updateInteraction === 'function') {
      updateInteraction(_form.interactionId, interactionData);
    }
    savedId = _form.interactionId;
  } else {
    if (typeof addInteraction === 'function') {
      const saved = addInteraction(interactionData);
      savedId = saved?.id ?? null;
    } else {
      console.warn('[SignalTrace/log] addInteraction() not found — check data.js load order.');
    }
  }

  // ── Persist screenshots ───────────────────────────
  if (savedId && _form.screenshots.length > 0 && typeof Photos !== 'undefined') {
    Photos.saveInteractionPhotos(savedId, _form.screenshots);
  }

  // ── Re-compute signals ────────────────────────────
  if (typeof detectSignals === 'function') {
    try { detectSignals(_form.personId); } catch (_) { /* non-fatal */ }
  }

  // ── Navigate to person profile ────────────────────
  if (typeof navigate === 'function') {
    navigate('person', { personId: _form.personId });
  }
}


/* ─────────────────────────────────────────────────────────────────
   VALIDATION UI
───────────────────────────────────────────────────────────────── */

function _showError(message) {
  const el = document.getElementById('log-error');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  el.setAttribute('aria-hidden', 'false');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function _clearError() {
  const el = document.getElementById('log-error');
  if (!el) return;
  el.textContent = '';
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
}


/* ─────────────────────────────────────────────────────────────────
   UTILITY
───────────────────────────────────────────────────────────────── */

/** Minimal HTML escape. Prevents XSS from user-entered person names etc. */
function _esc(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/* ─────────────────────────────────────────────────────────────────
   EDIT MODE — RESTORE UI STATE
   After _buildHTML() is inserted, re-apply the saved _form values
   to all the toggle buttons / chips so they appear pre-selected.
───────────────────────────────────────────────────────────────── */

/**
 * Walk all interactive controls inside `screenEl` and mark them
 * active/pressed according to the current `_form` state.
 * Called only in edit mode, after HTML has been injected.
 *
 * @param {HTMLElement} screenEl
 */
function _restoreFormUI(screenEl) {
  const form = screenEl.querySelector('#log-form');
  if (!form) return;

  // Date input
  const dateInput = form.querySelector('#log-date');
  if (dateInput && _form.date) dateInput.value = _form.date;

  // Interaction type
  if (_form.type) {
    form.querySelectorAll('[data-type]').forEach(b => {
      const active = b.dataset.type === _form.type;
      b.classList.toggle('log-type-btn--active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    _syncResponseTimeVisibility(form);
  }

  // Initiated-by
  if (_form.initiatedBy) {
    form.querySelectorAll('[data-initiated]').forEach(b => {
      const active = b.dataset.initiated === _form.initiatedBy;
      b.classList.toggle('log-toggle-btn--active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }

  // Mood
  if (_form.mood) {
    form.querySelectorAll('[data-mood]').forEach(b => {
      const active = b.dataset.mood === _form.mood;
      b.classList.toggle('log-mood-btn--active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }

  // Response time
  if (_form.responseTime) {
    form.querySelectorAll('[data-response]').forEach(b => {
      const active = b.dataset.response === _form.responseTime;
      b.classList.toggle('log-toggle-btn--active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }

  // Red flag chips
  _form.redFlags.forEach(flag => {
    const btn = form.querySelector(`[data-flag-red="${CSS.escape(flag)}"]`);
    if (btn) {
      btn.classList.add('log-chip--active');
      btn.setAttribute('aria-pressed', 'true');
    }
  });

  // Green flag chips
  _form.greenFlags.forEach(flag => {
    const btn = form.querySelector(`[data-flag-green="${CSS.escape(flag)}"]`);
    if (btn) {
      btn.classList.add('log-chip--active');
      btn.setAttribute('aria-pressed', 'true');
    }
  });

  // Notes
  const textarea  = form.querySelector('#log-notes');
  const charCount = form.querySelector('#log-notes-remaining');
  if (textarea && _form.notes) {
    textarea.value = _form.notes;
    if (charCount) charCount.textContent = String(1000 - _form.notes.length);
  }
}


/* ─────────────────────────────────────────────────────────────────
   SCREENSHOT STYLES
   Injected once into <head>. Uses log-ss- prefix throughout.
───────────────────────────────────────────────────────────────── */

let _logSSStylesInjected = false;

function _ensureScreenshotStyles() {
  if (_logSSStylesInjected) return;
  _logSSStylesInjected = true;

  const style = document.createElement('style');
  style.id = 'log-ss-styles';
  style.textContent = `

    /* ── Screenshot card ── */

    #log-screenshots-card { gap: 12px; }

    /* ── Thumbnails row ── */

    .log-ss-thumbs {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .log-ss-thumb {
      position: relative;
      width: 80px;
      height: 80px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
      background: rgba(255,255,255,0.05);
    }

    .log-ss-thumb__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .log-ss-thumb__del {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(0,0,0,0.65);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      color: rgba(255,255,255,0.9);
      transition: background 0.15s;
    }

    .log-ss-thumb__del:hover  { background: rgba(233,69,96,0.8); }
    .log-ss-thumb__del svg { width: 10px; height: 10px; }

    /* ── Drop zone ── */

    .log-ss-dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 18px 16px;
      border: 1.5px dashed rgba(255,255,255,0.15);
      border-radius: 12px;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      user-select: none;
    }

    .log-ss-dropzone:hover,
    .log-ss-dropzone--dragover {
      border-color: rgba(233,69,96,0.5);
      background: rgba(233,69,96,0.04);
    }

    .log-ss-dropzone svg {
      width: 22px;
      height: 22px;
      color: rgba(240,238,255,0.3);
    }

    .log-ss-dropzone__label {
      font-size: 13px;
      font-weight: 600;
      color: rgba(240,238,255,0.5);
    }

    .log-ss-dropzone__hint {
      font-size: 11px;
      color: rgba(240,238,255,0.25);
    }

  `;
  document.head.appendChild(style);
}


/* ─────────────────────────────────────────────────────────────────
   GLOBAL REGISTRATION
   app.js SCREENS calls renderLog(); external callers use renderLogInteraction().
───────────────────────────────────────────────────────────────── */
window.renderLog            = renderLog;
window.renderLogInteraction = renderLogInteraction;
window.renderEditLog        = renderEditLog;
