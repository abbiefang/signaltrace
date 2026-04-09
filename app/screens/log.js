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
    personId:     null,
    date:         _todayISO(),
    type:         null,       // null = not selected
    initiatedBy:  null,
    mood:         null,
    responseTime: null,
    redFlags:     new Set(),
    greenFlags:   new Set(),
    notes:        '',
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
 * @param {{ personId?: string, type?: string } | null} context
 */
function renderLog(context) {
  const personId = context?.personId ?? null;

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
 * Main render function. Resets local state and injects HTML into #screen-log.
 *
 * @param {string|null} personId    — pre-selected person; null shows person picker
 * @param {boolean}     isFirstLog  — shows first-interaction banner when true
 */
function renderLogInteraction(personId, isFirstLog = false) {
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

  el.innerHTML = _buildHTML({ person, allPersons, isFirstLog });
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

function _buildHTML({ person, allPersons, isFirstLog }) {
  const name = person ? _esc(person.name) : '';

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
    <h1 class="log-header__title">
      ${person ? `Log with ${name}` : 'Log Interaction'}
    </h1>
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
      <h2 class="log-card__title">
        Notes <span class="log-field__optional">optional</span>
      </h2>
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

    <!-- ── Submit ──────────────────────────────── -->
    <div class="log-footer">
      <p class="log-validation-error" id="log-error" role="alert" hidden aria-hidden="true"></p>
      <button type="submit" class="btn btn--primary btn--full" id="log-submit">
        Save interaction
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

  // ── Form submit ──────────────────────────────────
  form.addEventListener('submit', _handleSubmit);
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
  if (typeof addInteraction === 'function') {
    addInteraction(interactionData);
  } else {
    console.warn('[SignalTrace/log] addInteraction() not found — check data.js load order.');
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
   GLOBAL REGISTRATION
   app.js SCREENS calls renderLog(); external callers use renderLogInteraction().
───────────────────────────────────────────────────────────────── */
window.renderLog            = renderLog;
window.renderLogInteraction = renderLogInteraction;
