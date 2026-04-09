/**
 * SignalTrace — screens/person.js
 * Add / Edit Person screen.
 *
 * Renders into: #screen-add-person
 *
 * ─── Public API ──────────────────────────────────────────────────────────────
 *   renderAddPerson()            — Add mode (blank form)
 *   renderEditPerson(personId)   — Edit mode (pre-filled form)
 *
 * ─── Dependencies (expected as globals) ──────────────────────────────────────
 *   addPerson(data)          ← data.js
 *   updatePerson(id, data)   ← data.js
 *   getPerson(id)            ← data.js
 *   navigate(screen, params) ← app.js
 *
 * ─── Required: add to index.html (inside #app, before bottom-nav) ────────────
 *   <div class="screen" id="screen-add-person" data-screen="add-person"
 *        aria-hidden="true"></div>
 *
 * ─── Required: register in app.js SCREENS object ────────────────────────────
 *   'add-person': {
 *     render: () => {
 *       if (AppState.editPersonId) renderEditPerson(AppState.editPersonId);
 *       else renderAddPerson();
 *     },
 *     navTab: 'dashboard',
 *     hideNav: false,
 *   },
 *
 * ─── NOTE on vibeTags ────────────────────────────────────────────────────────
 *   data.js's addPerson() explicitly maps Person fields and does not forward
 *   vibeTags. To persist vibeTags on creation, add `vibeTags` to the Person
 *   object inside addPerson():
 *     vibeTags: Array.isArray(data.vibeTags) ? data.vibeTags : [],
 *   updatePerson() already persists it via spread.
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */

const PF_PLATFORMS = [
  { value: 'Hinge',     emoji: '🌟', label: 'Hinge'     },
  { value: 'Bumble',    emoji: '🐝', label: 'Bumble'    },
  { value: 'Tinder',    emoji: '🔥', label: 'Tinder'    },
  { value: 'IRL',       emoji: '🌍', label: 'IRL'       },
  { value: 'Instagram', emoji: '📸', label: 'Instagram' },
  { value: 'Friends',   emoji: '👥', label: 'Friends'   },
  { value: 'Work',      emoji: '💼', label: 'Work'      },
  { value: 'Other',     emoji: '✨', label: 'Other'     },
];

const PF_VIBE_TAGS = [
  { value: 'Promising',     emoji: '↑',  label: 'Promising'    },
  { value: 'Cautious',      emoji: '⚑',  label: 'Cautious'     },
  { value: 'Just seeing',   emoji: '👀', label: 'Just seeing'  },
  { value: 'Entertaining',  emoji: '⚡', label: 'Entertaining' },
];

/** Avatar palette — deterministic per name, consistent across renders. */
const PF_AVATAR_PALETTE = [
  '#9E6B8A', '#6B7BA8', '#8A9B6B', '#A87B6B',
  '#6B98A8', '#A8886B', '#7D6BA8', '#6BA89E',
];

/* ─────────────────────────────────────────────────────────────────────────────
   MODULE STATE
   Private. Holds the form's chip-selection state between interactions.
   Cleared on every render call.
───────────────────────────────────────────────────────────────────────────── */

let _pf = {
  mode:       'add',          // 'add' | 'edit'
  personId:   null,           // string | null
  platform:   '',             // selected platform value
  vibeTags:   new Set(),      // selected vibe tag values
};

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC RENDER FUNCTIONS
───────────────────────────────────────────────────────────────────────────── */

/**
 * Render the Add Person screen into #screen-add-person.
 * Starts with a blank form.
 */
function renderAddPerson() {
  _pf = { mode: 'add', personId: null, platform: '', vibeTags: new Set() };
  _ensureStyles();
  _renderIntoContainer(null);
}

/**
 * Render the Edit Person screen into #screen-add-person.
 * Pre-fills all fields from the stored person record.
 *
 * @param {string} personId
 */
function renderEditPerson(personId) {
  const person = (typeof getPerson === 'function') ? getPerson(personId) : null;

  _pf = {
    mode:     'edit',
    personId: personId,
    platform: person?.platform ?? '',
    vibeTags: new Set(Array.isArray(person?.vibeTags) ? person.vibeTags : []),
  };

  _ensureStyles();
  _renderIntoContainer(person);
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRIVATE — RENDERING
───────────────────────────────────────────────────────────────────────────── */

function _renderIntoContainer(person) {
  const container = document.getElementById('screen-add-person');
  if (!container) {
    console.warn('[SignalTrace] #screen-add-person not found in DOM.');
    return;
  }

  const isEdit   = _pf.mode === 'edit';
  const title    = isEdit ? `Edit ${person?.name ?? ''}` : 'Add someone new';
  const name     = person?.name ?? '';
  const metDate  = person?.metDate ?? '';
  const notes    = person?.notes ?? '';

  container.innerHTML = `
    <div class="pf-root">

      <!-- ── Header ── -->
      <header class="pf-header">
        <button class="pf-back-btn" type="button" aria-label="Go back"
                onclick="_pfHandleBack()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 class="pf-title">${_escHtml(title)}</h1>
        <div class="pf-header-spacer" aria-hidden="true"></div>
      </header>

      <!-- ── Scrollable body ── -->
      <div class="pf-body">

        <!-- Avatar preview -->
        <div class="pf-avatar-wrap" aria-hidden="true">
          <div class="pf-avatar" id="pf-avatar">
            ${_renderAvatarContent(name)}
          </div>
          <span class="pf-avatar-hint">Updates as you type</span>
        </div>

        <!-- Form -->
        <form id="pf-form" class="pf-form" novalidate autocomplete="off">

          <!-- Name -->
          <div class="pf-field" id="pf-field-name">
            <label class="pf-label" for="pf-name">Name or nickname <span class="pf-required">*</span></label>
            <input
              class="pf-input"
              id="pf-name"
              type="text"
              name="name"
              placeholder="e.g. Marcus, Hinge guy, The architect"
              value="${_escHtml(name)}"
              autocomplete="off"
              spellcheck="false"
              oninput="_pfHandleNameInput(this.value)"
            />
            <span class="pf-error" id="pf-name-error" role="alert" aria-live="polite"></span>
          </div>

          <!-- Platform -->
          <div class="pf-field">
            <label class="pf-label">How you met</label>
            <div class="pf-platform-grid" role="group" aria-label="How you met">
              ${PF_PLATFORMS.map(p => `
                <button type="button"
                  class="pf-platform-chip${_pf.platform === p.value ? ' pf-platform-chip--selected' : ''}"
                  data-platform="${_escHtml(p.value)}"
                  aria-pressed="${_pf.platform === p.value}"
                  onclick="_pfSelectPlatform('${_escHtml(p.value)}')">
                  <span class="pf-platform-emoji" aria-hidden="true">${p.emoji}</span>
                  <span class="pf-platform-label">${_escHtml(p.label)}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- When you met -->
          <div class="pf-field">
            <label class="pf-label" for="pf-met-date">When you met <span class="pf-optional">optional</span></label>
            <div class="pf-date-wrap">
              <input
                class="pf-input pf-input--date"
                id="pf-met-date"
                type="date"
                name="metDate"
                value="${_escHtml(metDate)}"
                max="${_todayISO()}"
              />
              <span class="pf-date-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="1.8" stroke-linecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </span>
            </div>
          </div>

          <!-- First impression / notes -->
          <div class="pf-field">
            <label class="pf-label" for="pf-notes">
              First impression <span class="pf-optional">optional</span>
            </label>
            <textarea
              class="pf-input pf-textarea"
              id="pf-notes"
              name="notes"
              rows="3"
              placeholder="What was your initial read? Anything worth noting."
              spellcheck="false"
            >${_escHtml(notes)}</textarea>
            <span class="pf-field-hint">Stick to observations. Avoid interpretations.</span>
          </div>

          <!-- Vibe tags -->
          <div class="pf-field">
            <label class="pf-label">Vibe <span class="pf-optional">optional · multi-select</span></label>
            <div class="pf-vibe-group" role="group" aria-label="Vibe tags">
              ${PF_VIBE_TAGS.map(tag => `
                <button type="button"
                  class="pf-vibe-chip${_pf.vibeTags.has(tag.value) ? ' pf-vibe-chip--selected' : ''}"
                  data-vibe="${_escHtml(tag.value)}"
                  aria-pressed="${_pf.vibeTags.has(tag.value)}"
                  onclick="_pfToggleVibe('${_escHtml(tag.value)}')">
                  <span class="pf-vibe-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2.5" stroke-linecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                  <span aria-hidden="true">${tag.emoji}</span>
                  ${_escHtml(tag.label)}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Bottom padding so submit btn clears the fixed bar -->
          <div style="height: 96px;"></div>

        </form>
      </div>

      <!-- ── Fixed submit button ── -->
      <div class="pf-submit-bar">
        <button class="pf-submit-btn" type="button" id="pf-submit"
                onclick="_pfHandleSubmit()">
          ${isEdit ? 'Save changes' : 'Add person →'}
        </button>
      </div>

    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRIVATE — EVENT HANDLERS (called from inline onclick)
   All prefixed _pf to minimise global namespace pollution.
───────────────────────────────────────────────────────────────────────────── */

/** Called on each keystroke in the name input. Updates avatar, clears error. */
function _pfHandleNameInput(value) {
  const avatar = document.getElementById('pf-avatar');
  if (avatar) avatar.innerHTML = _renderAvatarContent(value.trim());

  // Clear error eagerly as soon as user starts typing
  if (value.trim()) _pfClearNameError();
}

/** Select a platform chip — single-select behaviour. */
function _pfSelectPlatform(value) {
  _pf.platform = (_pf.platform === value) ? '' : value; // toggle off if re-clicked

  document.querySelectorAll('.pf-platform-chip').forEach(el => {
    const isSelected = el.dataset.platform === _pf.platform;
    el.classList.toggle('pf-platform-chip--selected', isSelected);
    el.setAttribute('aria-pressed', String(isSelected));
  });
}

/** Toggle a vibe tag — multi-select behaviour. */
function _pfToggleVibe(value) {
  if (_pf.vibeTags.has(value)) {
    _pf.vibeTags.delete(value);
  } else {
    _pf.vibeTags.add(value);
  }

  const chipEl = document.querySelector(`.pf-vibe-chip[data-vibe="${value}"]`);
  if (chipEl) {
    chipEl.classList.toggle('pf-vibe-chip--selected', _pf.vibeTags.has(value));
    chipEl.setAttribute('aria-pressed', String(_pf.vibeTags.has(value)));
  }
}

/** Navigate back — use browser history when available, else go to dashboard. */
function _pfHandleBack() {
  if (history.length > 1) {
    history.back();
  } else {
    navigate('dashboard');
  }
}

/** Validate and submit the form. */
function _pfHandleSubmit() {
  // ── Collect field values ──
  const nameInput   = document.getElementById('pf-name');
  const metDateInput = document.getElementById('pf-met-date');
  const notesInput  = document.getElementById('pf-notes');

  const name    = nameInput?.value.trim() ?? '';
  const metDate = metDateInput?.value.trim() ?? '';
  const notes   = notesInput?.value.trim() ?? '';

  // ── Validate ──
  if (!name) {
    _pfShowNameError('Name is required.');
    nameInput?.focus();
    return;
  }

  // ── Build data payload ──
  const data = {
    name,
    platform:  _pf.platform,
    metDate,
    notes,
    vibeTags:  Array.from(_pf.vibeTags),
    // avatar_initial derived by addPerson/updatePerson from name
  };

  // ── Disable submit to prevent double-submit ──
  const submitBtn = document.getElementById('pf-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = _pf.mode === 'edit' ? 'Saving…' : 'Adding…';
  }

  try {
    if (_pf.mode === 'edit') {
      // ── Edit mode ──
      const updated = updatePerson(_pf.personId, data);
      if (!updated) {
        console.error('[SignalTrace] updatePerson returned null for id:', _pf.personId);
        _pfResetSubmitBtn();
        return;
      }
      navigate('person', { personId: _pf.personId });

    } else {
      // ── Add mode ──
      const newPerson = addPerson(data);
      // Use logContext format so renderLog receives personId correctly
      navigate('log', { logContext: { personId: newPerson.id } });
    }

  } catch (err) {
    console.error('[SignalTrace] person.js submit error:', err);
    _pfResetSubmitBtn();
  }
}

/** Show an inline error below the name field. */
function _pfShowNameError(message) {
  const fieldEl = document.getElementById('pf-field-name');
  const errorEl = document.getElementById('pf-name-error');
  const inputEl = document.getElementById('pf-name');

  if (fieldEl) fieldEl.classList.add('pf-field--error');
  if (errorEl) errorEl.textContent = message;
  if (inputEl) inputEl.setAttribute('aria-invalid', 'true');
}

/** Clear the name field error state. */
function _pfClearNameError() {
  const fieldEl = document.getElementById('pf-field-name');
  const errorEl = document.getElementById('pf-name-error');
  const inputEl = document.getElementById('pf-name');

  if (fieldEl) fieldEl.classList.remove('pf-field--error');
  if (errorEl) errorEl.textContent = '';
  if (inputEl) inputEl.removeAttribute('aria-invalid');
}

/** Re-enable submit button (used after an error). */
function _pfResetSubmitBtn() {
  const submitBtn = document.getElementById('pf-submit');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = _pf.mode === 'edit' ? 'Save changes' : 'Add person →';
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRIVATE — UTILITIES
───────────────────────────────────────────────────────────────────────────── */

/**
 * Render the avatar content (initials + background) for a given name.
 * Returns an HTML string suitable for .innerHTML assignment.
 */
function _renderAvatarContent(name) {
  if (!name) {
    return `<span class="pf-avatar-placeholder" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    </span>`;
  }

  const initial = name.trim()[0]?.toUpperCase() ?? '?';
  const bg      = _avatarColour(name);

  return `<span class="pf-avatar-initial" style="background:${bg}" aria-hidden="true">${initial}</span>`;
}

/**
 * Derive a background colour for an avatar deterministically from a name.
 * Returns the same colour for the same name every time.
 */
function _avatarColour(name) {
  if (!name) return PF_AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PF_AVATAR_PALETTE[Math.abs(hash) % PF_AVATAR_PALETTE.length];
}

/** Return today's date in YYYY-MM-DD format (used as max for date input). */
function _todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Minimal HTML escape to prevent XSS from user-supplied strings in innerHTML. */
function _escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES
   Injected once into <head>. Uses pf- prefix throughout.
   Inherits CSS custom properties from the app's root stylesheet.
───────────────────────────────────────────────────────────────────────────── */

let _pfStylesInjected = false;

function _ensureStyles() {
  if (_pfStylesInjected) return;
  _pfStylesInjected = true;

  const style = document.createElement('style');
  style.id = 'pf-styles';
  style.textContent = `

    /* ── Root layout ── */

    .pf-root {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--color-bg, #12101c);
      color: var(--color-text, #f0eeff);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      overflow: hidden;
    }

    /* ── Header ── */

    .pf-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px 12px;
      flex-shrink: 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .pf-back-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.06);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      color: rgba(240,238,255,0.7);
      transition: background 0.2s, color 0.2s;
      flex-shrink: 0;
    }

    .pf-back-btn:hover { background: rgba(255,255,255,0.1); color: #f0eeff; }
    .pf-back-btn:active { transform: scale(0.95); }
    .pf-back-btn svg { width: 18px; height: 18px; }

    .pf-title {
      font-size: 17px;
      font-weight: 700;
      color: #f0eeff;
      text-align: center;
      flex: 1;
      margin: 0 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pf-header-spacer { width: 36px; flex-shrink: 0; }

    /* ── Scrollable body ── */

    .pf-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px 20px 0;
      -webkit-overflow-scrolling: touch;
    }

    .pf-body::-webkit-scrollbar { display: none; }

    /* ── Avatar preview ── */

    .pf-avatar-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 24px;
    }

    .pf-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
      border: 2px dashed rgba(255,255,255,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      margin-bottom: 8px;
      transition: border-color 0.2s;
    }

    .pf-avatar-initial {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: 28px;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
      border: none;
    }

    .pf-avatar-placeholder {
      color: rgba(240,238,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pf-avatar-placeholder svg { width: 32px; height: 32px; }

    .pf-avatar-hint {
      font-size: 11px;
      color: rgba(240,238,255,0.3);
      letter-spacing: 0.3px;
    }

    /* ── Form ── */

    .pf-form { display: flex; flex-direction: column; gap: 20px; }

    /* ── Field ── */

    .pf-field { display: flex; flex-direction: column; gap: 6px; }

    .pf-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.7px;
      text-transform: uppercase;
      color: rgba(240,238,255,0.4);
    }

    .pf-required { color: #e94560; }

    .pf-optional {
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
      font-size: 11px;
      color: rgba(240,238,255,0.3);
    }

    /* ── Text input & textarea ── */

    .pf-input {
      width: 100%;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 13px 16px;
      font-size: 16px;
      color: #f0eeff;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s, background 0.2s;
      -webkit-appearance: none;
    }

    .pf-input::placeholder { color: rgba(240,238,255,0.25); }

    .pf-input:focus {
      border-color: rgba(233,69,96,0.5);
      background: rgba(233,69,96,0.04);
    }

    .pf-textarea {
      resize: none;
      line-height: 1.55;
    }

    /* ── Date input wrapper ── */

    .pf-date-wrap {
      position: relative;
    }

    .pf-input--date {
      padding-right: 44px;
      color-scheme: dark;
    }

    .pf-date-icon {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: rgba(240,238,255,0.3);
      pointer-events: none;
    }

    .pf-date-icon svg { width: 18px; height: 18px; display: block; }

    /* ── Error state ── */

    .pf-field--error .pf-input {
      border-color: rgba(239,68,68,0.6);
      background: rgba(239,68,68,0.04);
    }

    .pf-error {
      font-size: 13px;
      color: #ef4444;
      min-height: 18px;
      display: block;
    }

    /* ── Field hint ── */

    .pf-field-hint {
      font-size: 11px;
      color: rgba(240,238,255,0.3);
      line-height: 1.4;
    }

    /* ── Platform grid ── */

    .pf-platform-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .pf-platform-chip {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      padding: 10px 6px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.09);
      background: rgba(255,255,255,0.04);
      cursor: pointer;
      transition: border-color 0.18s, background 0.18s, transform 0.12s;
      font-family: inherit;
    }

    .pf-platform-chip:hover {
      border-color: rgba(233,69,96,0.35);
      background: rgba(233,69,96,0.06);
    }

    .pf-platform-chip:active { transform: scale(0.96); }

    .pf-platform-chip--selected {
      border-color: #e94560;
      background: rgba(233,69,96,0.12);
    }

    .pf-platform-emoji {
      font-size: 20px;
      line-height: 1;
      display: block;
    }

    .pf-platform-label {
      font-size: 11px;
      font-weight: 500;
      color: rgba(240,238,255,0.6);
      text-align: center;
      white-space: nowrap;
    }

    .pf-platform-chip--selected .pf-platform-label { color: #f0eeff; }

    /* ── Vibe tags ── */

    .pf-vibe-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .pf-vibe-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 14px;
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: rgba(240,238,255,0.6);
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: border-color 0.18s, background 0.18s, color 0.18s, transform 0.12s;
    }

    .pf-vibe-chip:hover {
      border-color: rgba(240,147,251,0.4);
      color: #f0eeff;
    }

    .pf-vibe-chip:active { transform: scale(0.97); }

    .pf-vibe-chip--selected {
      border-color: #f093fb;
      background: rgba(240,147,251,0.1);
      color: #f0eeff;
    }

    /* Checkmark icon inside vibe chip */
    .pf-vibe-check {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.18s, border-color 0.18s;
    }

    .pf-vibe-check svg {
      width: 9px;
      height: 9px;
      opacity: 0;
      transition: opacity 0.15s;
    }

    .pf-vibe-chip--selected .pf-vibe-check {
      background: #f093fb;
      border-color: #f093fb;
    }

    .pf-vibe-chip--selected .pf-vibe-check svg { opacity: 1; }

    /* ── Fixed submit bar ── */

    .pf-submit-bar {
      flex-shrink: 0;
      padding: 14px 20px;
      padding-bottom: max(14px, env(safe-area-inset-bottom));
      background: linear-gradient(
        to top,
        #12101c 60%,
        rgba(18,16,28,0)
      );
      border-top: 1px solid rgba(255,255,255,0.05);
    }

    .pf-submit-btn {
      display: block;
      width: 100%;
      padding: 16px;
      border-radius: 14px;
      background: linear-gradient(135deg, #e94560 0%, #f093fb 100%);
      color: #fff;
      font-size: 16px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      letter-spacing: 0.2px;
      transition: opacity 0.2s, transform 0.15s;
      font-family: inherit;
    }

    .pf-submit-btn:hover  { opacity: 0.9; }
    .pf-submit-btn:active { transform: scale(0.98); }

    .pf-submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

  `;

  document.head.appendChild(style);
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORTS
   Functions exposed on window for global access (inline onclick handlers
   + external calls from app.js).
───────────────────────────────────────────────────────────────────────────── */

window.renderAddPerson  = renderAddPerson;
window.renderEditPerson = renderEditPerson;

// Internal handlers exposed to window for inline onclick use.
// Prefixed _pf to signal they are implementation details.
window._pfHandleNameInput = _pfHandleNameInput;
window._pfSelectPlatform  = _pfSelectPlatform;
window._pfToggleVibe      = _pfToggleVibe;
window._pfHandleBack      = _pfHandleBack;
window._pfHandleSubmit    = _pfHandleSubmit;


/* ═════════════════════════════════════════════════════════════════════════════
   PERSON DETAIL SCREEN — renderPerson(personId)

   Renders into: #screen-person
   Dependencies (globals): getPerson, getInteractions, getStats,
                           analyzeSignals (signals.js), getPersonSignalSummary,
                           deletePerson, navigate
═════════════════════════════════════════════════════════════════════════════ */

/**
 * Render the Person Detail screen into #screen-person.
 * Called by app.js whenever the 'person' route is activated.
 *
 * @param {string} personId
 */
function renderPerson(personId) {
  const container = document.getElementById('screen-person');
  if (!container) {
    console.error('[SignalTrace] #screen-person not found in DOM.');
    return;
  }

  const person = (typeof getPerson === 'function') ? getPerson(personId) : null;
  if (!person) {
    container.innerHTML = `
      <div class="pd-root">
        <div class="pd-error">
          <p>Person not found.</p>
          <button class="pd-btn pd-btn--secondary" onclick="navigate('dashboard')">← Back</button>
        </div>
      </div>`;
    return;
  }

  const interactions = (typeof getInteractions === 'function')
    ? getInteractions(personId)
    : [];
  const stats = (typeof getStats === 'function') ? getStats(personId) : {};
  const signalSummary = (typeof getPersonSignalSummary === 'function')
    ? getPersonSignalSummary(personId)
    : { level: 'none', topSignal: null, signals: [] };
  const signals = (typeof analyzeSignals === 'function')
    ? analyzeSignals(personId)
    : [];

  const initial = (person.name || '?').charAt(0).toUpperCase();
  const avatarBg = _avatarColour(person.name);

  // ── Signal level pill ──
  const levelMeta = {
    high:   { label: 'Strong signals',  cls: 'pd-pill--high'   },
    medium: { label: 'Mixed signals',   cls: 'pd-pill--medium' },
    low:    { label: 'Weak signals',    cls: 'pd-pill--low'    },
    none:   { label: 'No signals yet',  cls: 'pd-pill--none'   },
  };
  const lvl = levelMeta[signalSummary.level] || levelMeta.none;

  // ── Format stats ──
  const totalInteractions = stats.totalInteractions || interactions.length || 0;
  const themInitPct = (stats.initiatedByThemPct != null)
    ? stats.initiatedByThemPct + '%'
    : '—';
  const lastSeen = stats.lastInteractionDate
    ? _pdRelativeTime(stats.lastInteractionDate)
    : (interactions.length ? _pdRelativeTime(interactions[0].date) : 'Never');

  // ── Build signal cards HTML ──
  let signalCardsHtml = '';
  const displaySignals = Array.isArray(signals) ? signals.slice(0, 4) : [];
  if (displaySignals.length > 0) {
    signalCardsHtml = displaySignals.map(sig => {
      const severityCls = {
        high:   'pd-signal-card--high',
        medium: 'pd-signal-card--medium',
        low:    'pd-signal-card--low',
      }[sig.severity] || 'pd-signal-card--low';
      const icon = sig.severity === 'high' ? '⚠' : (sig.severity === 'medium' ? '◈' : '◉');
      return `
        <div class="pd-signal-card ${severityCls}">
          <span class="pd-signal-icon" aria-hidden="true">${icon}</span>
          <div class="pd-signal-body">
            <div class="pd-signal-type">${_escHtml(sig.title || sig.type || '')}</div>
            <div class="pd-signal-msg">${_escHtml(sig.description || sig.message || '')}</div>
          </div>
        </div>`;
    }).join('');
  } else if (totalInteractions === 0) {
    signalCardsHtml = `<p class="pd-empty-hint">Log some interactions to start seeing patterns.</p>`;
  } else {
    signalCardsHtml = `<p class="pd-empty-hint">Not enough data yet — keep logging.</p>`;
  }

  // ── Build interaction list HTML ──
  const recentInteractions = [...interactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  let interactionListHtml = '';
  if (recentInteractions.length === 0) {
    interactionListHtml = `<p class="pd-empty-hint">No interactions logged yet.</p>`;
  } else {
    interactionListHtml = recentInteractions.map(intr => {
      const moodCls  = { positive: 'pd-mood--pos', neutral: 'pd-mood--neu', negative: 'pd-mood--neg' }[intr.mood] || 'pd-mood--neu';
      const moodIcon = { positive: '↑', neutral: '→', negative: '↓' }[intr.mood] || '→';
      const typeLabel = {
        text: 'Text', call: 'Call', date: 'Date',
        voice_note: 'Voice', social: 'Social',
      }[intr.type] || intr.type || 'Interaction';
      const initLabel = { me: 'Me', them: 'Them', mutual: 'Both' }[intr.initiatedBy] || '—';
      const flagsHtml = [
        ...(intr.redFlags || []).map(f => `<span class="pd-flag pd-flag--red">${_escHtml(f)}</span>`),
        ...(intr.greenFlags || []).map(f => `<span class="pd-flag pd-flag--green">${_escHtml(f)}</span>`),
      ].join('');
      return `
        <div class="pd-interaction">
          <div class="pd-interaction-row">
            <span class="pd-interaction-date">${_escHtml(_pdRelativeTime(intr.date))}</span>
            <span class="pd-interaction-type">${_escHtml(typeLabel)}</span>
            <span class="pd-interaction-init">Init: ${_escHtml(initLabel)}</span>
            <span class="pd-mood ${moodCls}" aria-label="Mood: ${intr.mood}">${moodIcon}</span>
          </div>
          ${flagsHtml ? `<div class="pd-flags">${flagsHtml}</div>` : ''}
          ${intr.notes ? `<p class="pd-interaction-notes">${_escHtml(intr.notes)}</p>` : ''}
        </div>`;
    }).join('');
  }

  container.innerHTML = `
    <div class="pd-root">

      <!-- ── Header ── -->
      <header class="pd-header">
        <button class="pd-back-btn" type="button" aria-label="Back"
                onclick="navigate('dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 class="pd-header-title">${_escHtml(person.name)}</h1>
        <button class="pd-edit-btn icon-btn" type="button" aria-label="Edit person"
                onclick="_pdHandleEdit('${_escHtml(personId)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </header>

      <!-- ── Scrollable body ── -->
      <div class="pd-body">

        <!-- Profile hero -->
        <div class="pd-hero">
          <div class="pd-avatar" style="background:${avatarBg}" aria-hidden="true">
            ${_escHtml(initial)}
          </div>
          <div class="pd-hero-info">
            <div class="pd-name">${_escHtml(person.name)}</div>
            <div class="pd-meta">
              ${person.platform ? `<span class="pd-platform">${_escHtml(person.platform)}</span>` : ''}
              ${person.metDate ? `<span class="pd-met">Met ${_escHtml(_pdRelativeTime(person.metDate))}</span>` : ''}
            </div>
            <span class="pd-level-pill ${lvl.cls}">${lvl.label}</span>
          </div>
        </div>

        <!-- Stats row -->
        <div class="pd-stats-row">
          <div class="pd-stat">
            <span class="pd-stat-value">${totalInteractions}</span>
            <span class="pd-stat-label">Interactions</span>
          </div>
          <div class="pd-stat-divider" aria-hidden="true"></div>
          <div class="pd-stat">
            <span class="pd-stat-value">${themInitPct}</span>
            <span class="pd-stat-label">Them-initiated</span>
          </div>
          <div class="pd-stat-divider" aria-hidden="true"></div>
          <div class="pd-stat">
            <span class="pd-stat-value">${_escHtml(lastSeen)}</span>
            <span class="pd-stat-label">Last seen</span>
          </div>
        </div>

        <!-- Notes -->
        ${person.notes ? `
        <div class="pd-section">
          <h2 class="pd-section-title">Notes</h2>
          <p class="pd-notes-text">${_escHtml(person.notes)}</p>
        </div>` : ''}

        <!-- Signal analysis -->
        <div class="pd-section">
          <h2 class="pd-section-title">Signals</h2>
          <div class="pd-signals-list">
            ${signalCardsHtml}
          </div>
        </div>

        <!-- Interaction history -->
        <div class="pd-section">
          <h2 class="pd-section-title">Recent interactions</h2>
          <div class="pd-interactions-list">
            ${interactionListHtml}
          </div>
          ${interactions.length > 10 ? `<p class="pd-show-more">Showing 10 of ${interactions.length}</p>` : ''}
        </div>

        <!-- Danger zone -->
        <div class="pd-section pd-danger-section">
          <button class="pd-delete-btn" type="button"
                  onclick="_pdHandleDelete('${_escHtml(personId)}', '${_escHtml(person.name)}')">
            Remove ${_escHtml(person.name)}
          </button>
        </div>

        <div style="height: 88px;"></div>
      </div>

      <!-- ── Fixed bottom bar ── -->
      <div class="pd-action-bar">
        <button class="pd-log-btn" type="button"
                onclick="navigate('log', { logContext: { personId: '${_escHtml(personId)}' } })">
          + Log interaction
        </button>
      </div>

    </div>
  `;

  _ensurePdStyles();
}

/* ─────────────────────────────────────────────────────────────────────────────
   PERSON DETAIL — event handlers
───────────────────────────────────────────────────────────────────────────── */

function _pdHandleEdit(personId) {
  if (typeof updateState === 'function') updateState({ editPersonId: personId });
  navigate('add-person', { personId });
}

function _pdHandleDelete(personId, name) {
  if (!confirm(`Remove ${name}? All their interactions will also be deleted. This cannot be undone.`)) return;
  if (typeof deletePerson === 'function') deletePerson(personId);
  navigate('dashboard');
}

/* ─────────────────────────────────────────────────────────────────────────────
   PERSON DETAIL — utilities
───────────────────────────────────────────────────────────────────────────── */

function _pdRelativeTime(timestamp) {
  if (!timestamp) return '—';
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  if (isNaN(diffMs) || diffMs < 0) return '—';
  const diffDay = Math.floor(diffMs / 86400000);
  const diffWk  = Math.floor(diffDay / 7);
  const diffMo  = Math.floor(diffDay / 30);
  if (diffDay === 0) return 'Today';
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7)   return `${diffDay} days ago`;
  if (diffWk < 5)    return `${diffWk}w ago`;
  return `${diffMo}mo ago`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   PERSON DETAIL — styles (injected once)
───────────────────────────────────────────────────────────────────────────── */

let _pdStylesInjected = false;

function _ensurePdStyles() {
  if (_pdStylesInjected) return;
  _pdStylesInjected = true;
  const style = document.createElement('style');
  style.id = 'pd-styles';
  style.textContent = `
    .pd-root {
      display: flex; flex-direction: column; height: 100%;
      background: var(--color-bg, #12101c);
      color: var(--color-text, #f0eeff);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      overflow: hidden;
    }
    .pd-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px 12px; flex-shrink: 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .pd-back-btn, .pd-edit-btn {
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.06); border: none; border-radius: 50%;
      cursor: pointer; color: rgba(240,238,255,0.7);
      transition: background 0.2s; flex-shrink: 0;
    }
    .pd-back-btn:hover, .pd-edit-btn:hover { background: rgba(255,255,255,0.12); color: #f0eeff; }
    .pd-back-btn svg, .pd-edit-btn svg { width: 18px; height: 18px; }
    .pd-header-title {
      font-size: 17px; font-weight: 700; color: #f0eeff;
      text-align: center; flex: 1; margin: 0 8px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .pd-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .pd-body::-webkit-scrollbar { display: none; }

    /* Hero */
    .pd-hero {
      display: flex; align-items: center; gap: 16px; padding: 20px 20px 16px;
    }
    .pd-avatar {
      width: 60px; height: 60px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700; color: rgba(255,255,255,0.9);
    }
    .pd-hero-info { display: flex; flex-direction: column; gap: 4px; }
    .pd-name { font-size: 20px; font-weight: 700; color: #f0eeff; }
    .pd-meta { display: flex; gap: 8px; align-items: center; }
    .pd-platform, .pd-met {
      font-size: 13px; color: rgba(240,238,255,0.45);
    }
    .pd-level-pill {
      display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 10px;
      border-radius: 20px; letter-spacing: 0.3px; margin-top: 2px;
    }
    .pd-pill--high   { background: rgba(239,68,68,0.15);   color: #f87171; }
    .pd-pill--medium { background: rgba(251,146,60,0.15);  color: #fb923c; }
    .pd-pill--low    { background: rgba(250,204,21,0.12);  color: #facc15; }
    .pd-pill--none   { background: rgba(255,255,255,0.06); color: rgba(240,238,255,0.4); }

    /* Stats row */
    .pd-stats-row {
      display: flex; align-items: stretch; margin: 0 16px 8px;
      background: rgba(255,255,255,0.04); border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.07);
    }
    .pd-stat { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 14px 8px; }
    .pd-stat-value { font-size: 20px; font-weight: 700; color: #f0eeff; }
    .pd-stat-label { font-size: 11px; color: rgba(240,238,255,0.4); margin-top: 3px; text-align: center; }
    .pd-stat-divider { width: 1px; background: rgba(255,255,255,0.07); margin: 12px 0; }

    /* Section */
    .pd-section { padding: 16px 20px 0; }
    .pd-section-title {
      font-size: 12px; font-weight: 600; letter-spacing: 0.7px;
      text-transform: uppercase; color: rgba(240,238,255,0.35); margin-bottom: 10px;
    }
    .pd-notes-text {
      font-size: 14px; color: rgba(240,238,255,0.6); line-height: 1.6;
      background: rgba(255,255,255,0.04); border-radius: 10px; padding: 12px 14px;
    }
    .pd-empty-hint { font-size: 13px; color: rgba(240,238,255,0.3); padding: 4px 0; }

    /* Signal cards */
    .pd-signals-list { display: flex; flex-direction: column; gap: 8px; }
    .pd-signal-card {
      display: flex; gap: 10px; align-items: flex-start;
      padding: 12px 14px; border-radius: 12px; border: 1px solid transparent;
    }
    .pd-signal-card--high   { background: rgba(239,68,68,0.1);  border-color: rgba(239,68,68,0.2);  }
    .pd-signal-card--medium { background: rgba(251,146,60,0.1); border-color: rgba(251,146,60,0.2); }
    .pd-signal-card--low    { background: rgba(250,204,21,0.07); border-color: rgba(250,204,21,0.15); }
    .pd-signal-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
    .pd-signal-body { display: flex; flex-direction: column; gap: 2px; }
    .pd-signal-type { font-size: 12px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; color: rgba(240,238,255,0.5); }
    .pd-signal-msg  { font-size: 14px; color: rgba(240,238,255,0.85); line-height: 1.45; }

    /* Interactions */
    .pd-interactions-list { display: flex; flex-direction: column; gap: 1px; }
    .pd-interaction {
      padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .pd-interaction:last-child { border-bottom: none; }
    .pd-interaction-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .pd-interaction-date { font-size: 12px; color: rgba(240,238,255,0.4); min-width: 72px; }
    .pd-interaction-type { font-size: 13px; font-weight: 600; color: rgba(240,238,255,0.7); }
    .pd-interaction-init { font-size: 12px; color: rgba(240,238,255,0.4); margin-left: auto; }
    .pd-mood { font-size: 14px; font-weight: 700; }
    .pd-mood--pos { color: #4ade80; }
    .pd-mood--neu { color: rgba(240,238,255,0.4); }
    .pd-mood--neg { color: #f87171; }
    .pd-flags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .pd-flag {
      font-size: 11px; padding: 3px 8px; border-radius: 20px; font-weight: 500;
    }
    .pd-flag--red   { background: rgba(239,68,68,0.15);  color: #fca5a5; }
    .pd-flag--green { background: rgba(74,222,128,0.12); color: #86efac; }
    .pd-interaction-notes { font-size: 13px; color: rgba(240,238,255,0.45); margin-top: 4px; line-height: 1.4; }
    .pd-show-more { font-size: 12px; color: rgba(240,238,255,0.3); text-align: center; padding: 8px 0; }

    /* Danger */
    .pd-danger-section { padding-top: 24px; padding-bottom: 8px; }
    .pd-delete-btn {
      width: 100%; padding: 13px; border-radius: 12px;
      background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
      color: #f87171; font-size: 14px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: background 0.2s;
    }
    .pd-delete-btn:hover { background: rgba(239,68,68,0.15); }

    /* Action bar */
    .pd-action-bar {
      flex-shrink: 0; padding: 12px 20px;
      padding-bottom: max(12px, env(safe-area-inset-bottom));
      background: linear-gradient(to top, #12101c 60%, rgba(18,16,28,0));
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .pd-log-btn {
      display: block; width: 100%; padding: 15px; border-radius: 14px;
      background: linear-gradient(135deg, #e94560 0%, #f093fb 100%);
      color: #fff; font-size: 15px; font-weight: 700; border: none;
      cursor: pointer; font-family: inherit; letter-spacing: 0.2px;
      transition: opacity 0.2s;
    }
    .pd-log-btn:hover { opacity: 0.88; }
    .pd-error {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%; gap: 16px; padding: 40px 24px;
      color: rgba(240,238,255,0.5); font-size: 15px;
    }
    .pd-btn--secondary {
      padding: 12px 24px; border-radius: 12px;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      color: rgba(240,238,255,0.7); font-size: 14px; cursor: pointer;
      font-family: inherit;
    }
  `;
  document.head.appendChild(style);
}

window.renderPerson    = renderPerson;
window._pdHandleEdit   = _pdHandleEdit;
window._pdHandleDelete = _pdHandleDelete;
