/**
 * SignalTrace — screens/profile.js
 * Person Profile / Detail screen.
 *
 * Renders into: #screen-profile
 *
 * ─── Public API ──────────────────────────────────────────────────────────────
 *   renderProfile(personId)   — renders the full profile for the given person
 *
 * ─── Dependencies (expected as globals) ──────────────────────────────────────
 *   getPerson(id)                      ← data.js
 *   getInteractions(personId)          ← data.js
 *   getStats(personId)                 ← data.js
 *   deletePerson(id)                   ← data.js
 *   analyzeSignals(personId)           ← signals.js
 *   navigate(screen, params)           ← app.js
 *   AppState                           ← app.js
 *
 * ─── Required: add to index.html ─────────────────────────────────────────────
 *   <div class="screen" id="screen-profile" data-screen="profile"
 *        aria-hidden="true"></div>
 *
 * ─── Required: register in app.js SCREENS object ────────────────────────────
 *   profile: {
 *     render: () => renderProfile(AppState.currentPersonId),
 *     navTab: 'dashboard',
 *     hideNav: false,
 *   },
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */

/** Avatar background colours — deterministic per name (same palette as dashboard). */
const PRF_AVATAR_PALETTE = [
  '#9E6B8A', '#6B7BA8', '#8A9B6B', '#A87B6B',
  '#6B98A8', '#A8886B', '#7D6BA8', '#6BA89E',
];

/** Platform display map: value → { emoji, label }. */
const PRF_PLATFORMS = {
  'Hinge':     { emoji: '🌟', label: 'Hinge' },
  'Bumble':    { emoji: '🐝', label: 'Bumble' },
  'Tinder':    { emoji: '🔥', label: 'Tinder' },
  'IRL':       { emoji: '🌍', label: 'IRL' },
  'Instagram': { emoji: '📸', label: 'Instagram' },
  'Friends':   { emoji: '👥', label: 'Friends' },
  'Work':      { emoji: '💼', label: 'Work' },
  'Other':     { emoji: '✨', label: 'Other' },
};

/** Interaction type → emoji. */
const PRF_TYPE_EMOJI = {
  text:        '💬',
  call:        '📞',
  date:        '☕',
  voice_note:  '🎙️',
  social:      '📱',
};

/** Interaction type → human label. */
const PRF_TYPE_LABEL = {
  text:        'Text',
  call:        'Call',
  date:        'Date',
  voice_note:  'Voice note',
  social:      'Social media',
};

/** Mood → colour dot class suffix. */
const PRF_MOOD_COLOR = {
  positive: '#34d399',   // green
  neutral:  '#94a3b8',   // grey
  negative: '#f87171',   // red
};

/** Response time label map. */
const PRF_RESPONSE_LABELS = {
  fast:        'Fast',
  normal:      'Normal',
  slow:        'Slow',
  no_response: 'No response',
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODULE STATE
   Tracks which interaction cards are expanded (inline detail view).
   Cleared on each renderProfile() call.
───────────────────────────────────────────────────────────────────────────── */

let _prf = {
  personId:   null,
  expanded:   new Set(),   // Set<interactionId> — which cards are open
};

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────────────────── */

/**
 * Render the Person Profile screen into #screen-profile.
 *
 * @param {string} personId  — ID of the person to display.
 *                            Falls back to AppState.currentPersonId if omitted.
 */
function renderProfile(personId) {
  const id = personId
    || (typeof AppState !== 'undefined' && AppState.currentPersonId)
    || null;

  if (!id) {
    // Called from Insights nav tab with no current person — show aggregate view
    _renderInsightsHome();
    return;
  }

  const person = (typeof getPerson === 'function') ? getPerson(id) : null;

  if (!person) {
    _renderError('Person not found. They may have been deleted.');
    return;
  }

  // Reset module state for a clean render
  _prf = { personId: id, expanded: new Set() };

  _ensureStyles();

  const container = document.getElementById('screen-profile');
  if (!container) return;

  container.innerHTML = _buildHTML(person);
  _attachEvents(container, person);
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRIVATE — HTML BUILDERS
───────────────────────────────────────────────────────────────────────────── */

function _buildHTML(person) {
  const stats        = (typeof getStats === 'function') ? getStats(person.id) : _emptyStats();
  const interactions = (typeof getInteractions === 'function') ? getInteractions(person.id) : [];
  const signals      = (typeof analyzeSignals === 'function') ? analyzeSignals(person.id) : [];

  // Compute days since met
  const daysSinceMet = person.metDate ? _daysSince(person.metDate) : null;

  // Compute average interval between interactions (days)
  const avgInterval = _calcAvgInterval(interactions);

  return /* html */`
    <div class="prf-root">

      ${_buildHeader(person, daysSinceMet)}

      <div class="prf-body">
        ${_buildStatsBar(stats, avgInterval)}
        ${_buildSignalsSection(signals, interactions.length)}
        ${_buildTimeline(interactions)}
        ${_buildDangerZone(person)}
      </div>

    </div>
  `;
}

/* ── Header ──────────────────────────────────────────────────────────────── */

function _buildHeader(person, daysSinceMet) {
  const initial     = person.avatar_initial || (person.name ? person.name[0].toUpperCase() : '?');
  const avatarColor = _avatarColor(person.name || '');
  const platform    = PRF_PLATFORMS[person.platform] || { emoji: '✨', label: person.platform || 'Unknown' };
  const metLine     = daysSinceMet !== null
    ? `Met ${daysSinceMet} day${daysSinceMet === 1 ? '' : 's'} ago`
    : 'Date unknown';

  // Use real photo if available, fall back to initial
  const photoUrl   = (typeof Photos !== 'undefined') ? Photos.getPersonPhoto(person.id) : null;
  const avatarHTML = photoUrl
    ? `<div class="prf-avatar prf-avatar--photo"><img src="${photoUrl}" alt="${_esc(person.name || '')}"></div>`
    : `<div class="prf-avatar" style="background:${avatarColor}">${_esc(initial)}</div>`;

  return /* html */`
    <header class="prf-header">
      <div class="prf-header-top">
        <button class="prf-btn-icon" data-action="back" aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 4l-6 6 6 6"/>
          </svg>
        </button>
        <button class="prf-btn-icon" data-action="edit" aria-label="Edit person">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 3.3a1 1 0 011.4 1.4L5.6 15.2 3 16l.8-2.6L14.7 3.3z"/>
          </svg>
        </button>
      </div>

      <div class="prf-avatar-wrap">
        ${avatarHTML}
      </div>

      <div class="prf-identity">
        <h1 class="prf-name">${_esc(person.name || 'Unknown')}</h1>
        <div class="prf-meta">
          <span class="prf-platform-chip">
            <span>${platform.emoji}</span>
            <span>${_esc(platform.label)}</span>
          </span>
          <span class="prf-meta-dot">·</span>
          <span class="prf-met-line">${_esc(metLine)}</span>
        </div>
      </div>
    </header>
  `;
}

/* ── Stats Bar ───────────────────────────────────────────────────────────── */

function _buildStatsBar(stats, avgInterval) {
  const total      = stats.totalInteractions || 0;
  const themPct    = stats.initiatedByThemPct || 0;
  const mePct      = stats.initiatedByMePct   || 0;
  const lastLine   = stats.daysSinceLastInteraction !== null
    ? (stats.daysSinceLastInteraction === 0
        ? 'Today'
        : `${stats.daysSinceLastInteraction} day${stats.daysSinceLastInteraction === 1 ? '' : 's'} ago`)
    : '—';
  const avgLine    = avgInterval !== null ? `${avgInterval} day${avgInterval === 1 ? '' : 's'}` : '—';

  // Bar widths: them is left (ideally > 50%), me is right
  const themWidth = themPct;
  const meWidth   = mePct;

  return /* html */`
    <section class="prf-section prf-stats-bar">
      <div class="prf-stat-grid">

        <div class="prf-stat">
          <div class="prf-stat-value">${total}</div>
          <div class="prf-stat-label">Interactions</div>
        </div>

        <div class="prf-stat prf-stat--wide">
          <div class="prf-initiation-label-row">
            <span class="prf-initiation-label-them">Them ${themPct}%</span>
            <span class="prf-initiation-label-me">You ${mePct}%</span>
          </div>
          <div class="prf-initiation-bar" aria-label="Initiation split: them ${themPct}%, you ${mePct}%">
            <div class="prf-initiation-fill--them" style="width:${themWidth}%"></div>
            <div class="prf-initiation-fill--me"   style="width:${meWidth}%"></div>
          </div>
          <div class="prf-stat-label">Who reaches out</div>
        </div>

        <div class="prf-stat">
          <div class="prf-stat-value prf-stat-value--sm">${lastLine}</div>
          <div class="prf-stat-label">Last contact</div>
        </div>

        <div class="prf-stat">
          <div class="prf-stat-value prf-stat-value--sm">${avgLine}</div>
          <div class="prf-stat-label">Avg. gap</div>
        </div>

      </div>
    </section>
  `;
}

/* ── Signals ─────────────────────────────────────────────────────────────── */

function _buildSignalsSection(signals, totalInteractions) {
  const MIN_FOR_SIGNALS = 3;
  const notEnough = totalInteractions < MIN_FOR_SIGNALS;
  const concernSignals = signals.filter(s => s.type !== 'consistent_effort');
  const greenSignals   = signals.filter(s => s.type === 'consistent_effort');
  const allGreen       = signals.length > 0 && concernSignals.length === 0;

  let bodyHTML;

  if (notEnough) {
    bodyHTML = /* html */`
      <div class="prf-signal-empty">
        <div class="prf-signal-empty-icon">📊</div>
        <div class="prf-signal-empty-text">Not enough data yet. Keep logging.</div>
        <div class="prf-signal-empty-sub">Signals appear after ${MIN_FOR_SIGNALS} interactions.</div>
      </div>`;
  } else if (allGreen && greenSignals.length > 0) {
    const g = greenSignals[0];
    bodyHTML = /* html */`
      <div class="prf-signal-green-banner">
        <div class="prf-signal-green-icon">✓</div>
        <div>
          <div class="prf-signal-green-title">${_esc(g.title)}</div>
          <div class="prf-signal-green-desc">${_esc(g.description)}</div>
        </div>
      </div>`;
  } else if (signals.length === 0) {
    bodyHTML = /* html */`
      <div class="prf-signal-empty">
        <div class="prf-signal-empty-icon">—</div>
        <div class="prf-signal-empty-text">No clear patterns yet.</div>
        <div class="prf-signal-empty-sub">Patterns emerge as you log more interactions.</div>
      </div>`;
  } else {
    // Sort: high → medium → low, with green signals always last
    const sorted = [
      ...concernSignals.sort((a, b) => _severityRank(b.severity) - _severityRank(a.severity)),
      ...greenSignals,
    ];

    bodyHTML = sorted.map(s => _buildSignalCard(s)).join('');
  }

  return /* html */`
    <section class="prf-section">
      <h2 class="prf-section-title">What the data says</h2>
      <div class="prf-signals-list">
        ${bodyHTML}
      </div>
    </section>
  `;
}

function _buildSignalCard(signal) {
  const borderColor = signal.type === 'consistent_effort'
    ? '#34d399'   // green
    : signal.severity === 'high'
      ? '#f87171'   // red
      : signal.severity === 'medium'
        ? '#fbbf24'   // amber
        : '#94a3b8';  // grey (low)

  const severityLabel = signal.type === 'consistent_effort'
    ? 'Positive'
    : signal.severity.charAt(0).toUpperCase() + signal.severity.slice(1);

  const severityCls = signal.type === 'consistent_effort'
    ? 'prf-severity--green'
    : `prf-severity--${signal.severity}`;

  return /* html */`
    <div class="prf-signal-card" style="border-left-color:${borderColor}">
      <div class="prf-signal-top">
        <span class="prf-signal-title">${_esc(signal.title)}</span>
        <span class="prf-severity ${severityCls}">${severityLabel}</span>
      </div>
      <p class="prf-signal-desc">${_esc(signal.description)}</p>
      ${signal.evidenceCount > 0
        ? `<div class="prf-signal-evidence">Based on ${signal.evidenceCount} interaction${signal.evidenceCount === 1 ? '' : 's'}</div>`
        : ''}
    </div>
  `;
}

/* ── Timeline ────────────────────────────────────────────────────────────── */

function _buildTimeline(interactions) {
  const isEmpty = !interactions || interactions.length === 0;

  return /* html */`
    <section class="prf-section prf-timeline-section">
      <div class="prf-section-header">
        <h2 class="prf-section-title">Interaction history</h2>
        <span class="prf-interaction-count">${interactions.length}</span>
      </div>

      <div class="prf-timeline" id="prf-timeline">
        ${isEmpty
          ? '<div class="prf-timeline-empty">No interactions logged yet.</div>'
          : interactions.map((ix, idx) => _buildInteractionRow(ix, idx, interactions.length)).join('')}
      </div>

      <button class="prf-log-btn" data-action="log-new">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
             stroke-width="1.6" stroke-linecap="round">
          <path d="M8 3v10M3 8h10"/>
        </svg>
        Log new interaction
      </button>
    </section>
  `;
}

function _buildInteractionRow(ix, idx, total) {
  const isLast     = idx === total - 1;
  const emoji      = PRF_TYPE_EMOJI[ix.type]  || '📌';
  const typeLabel  = PRF_TYPE_LABEL[ix.type]  || ix.type;
  const moodColor  = PRF_MOOD_COLOR[ix.mood]  || '#94a3b8';
  const initiator  = _initiatorLabel(ix.initiatedBy);
  const dateStr    = _formatDate(ix.date);
  const notesPreview = ix.notes ? _truncate(ix.notes, 72) : null;
  const hasFlags   = (ix.redFlags && ix.redFlags.length > 0) || (ix.greenFlags && ix.greenFlags.length > 0);
  const photos     = (typeof Photos !== 'undefined') ? Photos.getInteractionPhotos(ix.id) : [];

  return /* html */`
    <div class="prf-ix-row${isLast ? ' prf-ix-row--last' : ''}" id="prf-ix-${_esc(ix.id)}">
      <!-- Timeline stem -->
      <div class="prf-ix-stem">
        <div class="prf-ix-dot" style="background:${moodColor}"></div>
        ${!isLast ? '<div class="prf-ix-line"></div>' : ''}
      </div>

      <!-- Card -->
      <div class="prf-ix-card">
        <div class="prf-ix-card-top" data-action="expand-ix" data-ix-id="${_esc(ix.id)}">
          <div class="prf-ix-left">
            <span class="prf-ix-emoji" aria-label="${typeLabel}">${emoji}</span>
            <div class="prf-ix-info">
              <div class="prf-ix-headline">
                <span class="prf-ix-type">${typeLabel}</span>
                <span class="prf-ix-sep">·</span>
                <span class="prf-ix-initiator">${initiator}</span>
              </div>
              <div class="prf-ix-date">${dateStr}</div>
              ${notesPreview ? `<div class="prf-ix-preview">${_esc(notesPreview)}</div>` : ''}
              ${photos.length > 0 ? `<div class="prf-ix-photo-badge">📷 ${photos.length}</div>` : ''}
            </div>
          </div>
          <div class="prf-ix-right">
            <button class="prf-btn-icon prf-ix-edit-btn" data-action="edit-ix"
                    data-ix-id="${_esc(ix.id)}" aria-label="Edit interaction">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11.7 2.3a1 1 0 011.4 1.4L4.6 12.2 3 13l.8-2.1L11.7 2.3z"/>
              </svg>
            </button>
            <div class="prf-ix-chevron" data-ix-id="${_esc(ix.id)}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 5l4 4 4-4"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Expanded detail (hidden by default) -->
        <div class="prf-ix-detail" id="prf-ix-detail-${_esc(ix.id)}" style="display:none">
          ${_buildInteractionDetail(ix)}
        </div>
      </div>
    </div>
  `;
}

function _buildInteractionDetail(ix) {
  const responseLabel = PRF_RESPONSE_LABELS[ix.responseTime] || ix.responseTime || '—';

  const redFlagsHTML = ix.redFlags && ix.redFlags.length > 0
    ? ix.redFlags.map(f => `<span class="prf-flag prf-flag--red">${_esc(f)}</span>`).join('')
    : null;
  const greenFlagsHTML = ix.greenFlags && ix.greenFlags.length > 0
    ? ix.greenFlags.map(f => `<span class="prf-flag prf-flag--green">${_esc(f)}</span>`).join('')
    : null;

  // Screenshots
  const photos     = (typeof Photos !== 'undefined') ? Photos.getInteractionPhotos(ix.id) : [];
  const photosHTML = photos.length > 0
    ? `<div class="prf-detail-photos">${photos.map((url, i) => `
        <button type="button" class="prf-photo-thumb-btn"
                data-action="view-photo" data-photo-url="${_esc(url)}"
                aria-label="View screenshot ${i + 1}">
          <img src="${url}" class="prf-photo-thumb-img" alt="Screenshot ${i + 1}">
        </button>
      `).join('')}</div>`
    : '';

  return /* html */`
    <div class="prf-detail-grid">
      <div class="prf-detail-row">
        <span class="prf-detail-label">Response</span>
        <span class="prf-detail-val">${_esc(responseLabel)}</span>
      </div>
      <div class="prf-detail-row">
        <span class="prf-detail-label">Mood</span>
        <span class="prf-detail-val prf-detail-mood">
          <span class="prf-mood-dot" style="background:${PRF_MOOD_COLOR[ix.mood] || '#94a3b8'}"></span>
          ${_esc(ix.mood ? ix.mood.charAt(0).toUpperCase() + ix.mood.slice(1) : '—')}
        </span>
      </div>
    </div>
    ${ix.notes ? `<div class="prf-detail-notes">${_esc(ix.notes)}</div>` : ''}
    ${greenFlagsHTML ? `<div class="prf-flags-row">${greenFlagsHTML}</div>` : ''}
    ${redFlagsHTML   ? `<div class="prf-flags-row">${redFlagsHTML}</div>`   : ''}
    ${photosHTML}
  `;
}

/* ── Danger Zone ─────────────────────────────────────────────────────────── */

function _buildDangerZone(person) {
  return /* html */`
    <section class="prf-section prf-danger-zone">
      <button class="prf-delete-btn" data-action="delete" data-person-id="${_esc(person.id)}">
        Delete ${_esc(person.name || 'this person')}
      </button>
    </section>
  `;
}

/* ── Error State ─────────────────────────────────────────────────────────── */

function _renderError(message) {
  const container = document.getElementById('screen-profile');
  if (!container) return;
  container.innerHTML = /* html */`
    <div class="prf-root prf-error-root">
      <button class="prf-btn-icon prf-error-back" data-action="back">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
             stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 4l-6 6 6 6"/>
        </svg>
      </button>
      <div class="prf-error-msg">${_esc(message)}</div>
    </div>
  `;
  container.querySelector('[data-action="back"]')?.addEventListener('click', _handleBack);
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRIVATE — EVENT HANDLING
───────────────────────────────────────────────────────────────────────────── */

function _attachEvents(container, person) {
  // Use delegation on the root container
  container.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;

    switch (action) {

      case 'back':
        _handleBack();
        break;

      case 'edit':
        _handleEdit(person.id);
        break;

      case 'expand-ix': {
        const ixId = btn.dataset.ixId;
        if (ixId) _toggleInteraction(ixId);
        break;
      }

      case 'edit-ix': {
        e.stopPropagation();   // don't also trigger expand
        const ixId = btn.dataset.ixId;
        if (ixId) _handleEditInteraction(person.id, ixId);
        break;
      }

      case 'log-new':
        _handleLogNew(person.id);
        break;

      case 'delete':
        _handleDelete(person);
        break;

      case 'view-photo': {
        const photoUrl = btn.dataset.photoUrl;
        if (photoUrl) _openLightbox(photoUrl);
        break;
      }
    }
  });
}

function _handleBack() {
  if (typeof navigate === 'function') {
    navigate('dashboard');
  }
}

function _handleEdit(personId) {
  if (typeof navigate === 'function') {
    // Pass editPersonId as a navigate param so app.js can manage it in state.
    // Do NOT call updateState separately — navigate() handles it.
    navigate('add-person', { editPersonId: personId });
  }
}

function _handleEditInteraction(personId, interactionId) {
  if (typeof navigate === 'function') {
    navigate('log', { logContext: { personId, interactionId } });
  }
}

function _handleLogNew(personId) {
  if (typeof navigate === 'function') {
    navigate('log', { logContext: { personId } });
  }
}

function _toggleInteraction(ixId) {
  const detail  = document.getElementById(`prf-ix-detail-${ixId}`);
  const chevron = document.querySelector(`.prf-ix-chevron[data-ix-id="${ixId}"]`);
  if (!detail) return;

  const isOpen = _prf.expanded.has(ixId);

  if (isOpen) {
    detail.style.display = 'none';
    _prf.expanded.delete(ixId);
    if (chevron) chevron.classList.remove('prf-ix-chevron--open');
  } else {
    detail.style.display = 'block';
    _prf.expanded.add(ixId);
    if (chevron) chevron.classList.add('prf-ix-chevron--open');
  }
}

function _handleDelete(person) {
  // Build a modal-style confirmation inside the container
  const overlay = document.createElement('div');
  overlay.className = 'prf-dialog-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'prf-dialog-title');

  overlay.innerHTML = /* html */`
    <div class="prf-dialog">
      <h3 class="prf-dialog-title" id="prf-dialog-title">Delete ${_esc(person.name || 'this person')}?</h3>
      <p class="prf-dialog-body">
        All interactions and signals for ${_esc(person.name || 'this person')} will be permanently removed.
        This cannot be undone.
      </p>
      <div class="prf-dialog-actions">
        <button class="prf-dialog-cancel">Cancel</button>
        <button class="prf-dialog-confirm">Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Trap focus on the dialog
  overlay.querySelector('.prf-dialog-confirm').focus();

  overlay.querySelector('.prf-dialog-cancel').addEventListener('click', function () {
    overlay.remove();
  });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('.prf-dialog-confirm').addEventListener('click', function () {
    overlay.remove();

    // Cascade-delete photos before deleting person record
    if (typeof Photos !== 'undefined' && typeof getInteractions === 'function') {
      const ixIds = getInteractions(person.id).map(i => i.id);
      Photos.deletePersonPhotos(person.id, ixIds);
    }

    if (typeof deletePerson === 'function') {
      deletePerson(person.id);
    }
    if (typeof navigate === 'function') {
      navigate('dashboard');
    }
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   LIGHTBOX
───────────────────────────────────────────────────────────────────────────── */

/**
 * Open a full-screen lightbox to display a single photo.
 * Dismissed by tapping the overlay or pressing Escape.
 * @param {string} photoUrl — base64 data URL
 */
function _openLightbox(photoUrl) {
  // Remove any existing lightbox
  document.getElementById('prf-lightbox')?.remove();

  const lb = document.createElement('div');
  lb.id = 'prf-lightbox';
  lb.className = 'prf-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Screenshot');

  lb.innerHTML = `
    <div class="prf-lightbox-backdrop"></div>
    <button class="prf-lightbox-close" aria-label="Close">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round">
        <line x1="4" y1="4" x2="16" y2="16"/>
        <line x1="16" y1="4" x2="4" y2="16"/>
      </svg>
    </button>
    <div class="prf-lightbox-img-wrap">
      <img src="${photoUrl}" class="prf-lightbox-img" alt="Screenshot">
    </div>
  `;

  document.body.appendChild(lb);

  // Trigger animation on next frame
  requestAnimationFrame(() => lb.classList.add('prf-lightbox--open'));

  function _close() {
    lb.classList.remove('prf-lightbox--open');
    setTimeout(() => lb.remove(), 200);
    document.removeEventListener('keydown', _onKey);
  }

  function _onKey(e) { if (e.key === 'Escape') _close(); }

  lb.querySelector('.prf-lightbox-backdrop').addEventListener('click', _close);
  lb.querySelector('.prf-lightbox-close').addEventListener('click', _close);
  document.addEventListener('keydown', _onKey);
}


/* ─────────────────────────────────────────────────────────────────────────────
   PRIVATE — UTILITY
───────────────────────────────────────────────────────────────────────────── */

/** Deterministic avatar background from name string. */
function _avatarColor(name) {
  if (!name) return PRF_AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRF_AVATAR_PALETTE[Math.abs(hash) % PRF_AVATAR_PALETTE.length];
}

/** Number of whole days between metDate (ISO string) and today. */
function _daysSince(isoDate) {
  if (!isoDate) return null;
  const then  = new Date(isoDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  then.setHours(0, 0, 0, 0);
  const diff = today - then;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Compute average gap in days between consecutive interactions.
 * Interactions should be sorted newest-first (as returned by getInteractions).
 * @param {Array} interactions
 * @returns {number|null}
 */
function _calcAvgInterval(interactions) {
  if (!interactions || interactions.length < 2) return null;

  // Sort oldest-first for gap calculation
  const sorted = interactions.slice().sort((a, b) => a.date.localeCompare(b.date));
  const gaps   = [];

  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(sorted[i - 1].date).getTime();
    const b = new Date(sorted[i].date).getTime();
    if (!isNaN(a) && !isNaN(b) && b > a) {
      gaps.push((b - a) / (1000 * 60 * 60 * 24));
    }
  }

  if (!gaps.length) return null;
  const avg = gaps.reduce((s, v) => s + v, 0) / gaps.length;
  return Math.round(avg);
}

/**
 * Format an ISO date string as a human-readable date.
 * e.g. "Apr 8" or "Mar 21, 2025" (for dates > 11 months ago).
 */
function _formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d)) return isoDate;

  const now   = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month  = months[d.getMonth()];
  const day    = d.getDate();

  return sameYear
    ? `${month} ${day}`
    : `${month} ${day}, ${d.getFullYear()}`;
}

/** Initiator label. */
function _initiatorLabel(initiatedBy) {
  switch (initiatedBy) {
    case 'me':     return 'You reached out';
    case 'them':   return 'They reached out';
    case 'mutual': return 'Mutual';
    default:       return initiatedBy || '—';
  }
}

/** Severity → sort rank. */
function _severityRank(severity) {
  return { high: 3, medium: 2, low: 1 }[severity] || 0;
}

/** Escape HTML special characters. */
function _esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Truncate to maxLen characters, adding ellipsis if clipped. */
function _truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + '…';
}

/* ─────────────────────────────────────────────────────────────────────────────
   PERSON DETAIL — renders into #screen-person (routed from dashboard/log/edit)
   This is the function called by app.js SCREENS['person'].render().
───────────────────────────────────────────────────────────────────────────── */

/**
 * Render the Person Detail screen into #screen-person.
 * Called by app.js SCREENS registry for the 'person' route.
 *
 * @param {string} [personId]  Falls back to AppState.currentPersonId.
 */
function renderPerson(personId) {
  const id = personId
    || (typeof AppState !== 'undefined' && AppState.currentPersonId)
    || null;

  if (!id) {
    // No person in context — fall back to dashboard
    if (typeof navigate === 'function') navigate('dashboard');
    return;
  }

  const person = (typeof getPerson === 'function') ? getPerson(id) : null;

  if (!person) {
    // Person was deleted or ID is stale
    const c = document.getElementById('screen-person');
    if (c) {
      c.innerHTML = /* html */`
        <div class="prf-root prf-error-root">
          <button class="prf-btn-icon prf-error-back" style="margin:24px" data-action="back"
                  onclick="navigate('dashboard')">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                 stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 4l-6 6 6 6"/>
            </svg>
          </button>
          <div class="prf-error-msg">Person not found. They may have been deleted.</div>
        </div>`;
    }
    return;
  }

  // Reset module state for a clean render
  _prf = { personId: id, expanded: new Set() };
  _ensureStyles();

  const container = document.getElementById('screen-person');
  if (!container) return;

  container.innerHTML = _buildHTML(person);
  _attachEvents(container, person);
}

window.renderPerson = renderPerson;


/* ─────────────────────────────────────────────────────────────────────────────
   AGGREGATE INSIGHTS HOME
   Rendered when renderProfile() is called with no personId — i.e. from the
   bottom nav "Insights" tab.
───────────────────────────────────────────────────────────────────────────── */

function _renderInsightsHome() {
  const container = document.getElementById('screen-profile');
  if (!container) return;

  const persons = (typeof getAllPersons === 'function') ? getAllPersons() : [];

  let totalInteractions = 0;
  let meInit = 0, themInit = 0;
  let allRed = [], allGreen = [];
  let alertPersons = [];

  persons.forEach(p => {
    const ixs = (typeof getInteractions === 'function') ? getInteractions(p.id) : [];
    totalInteractions += ixs.length;
    ixs.forEach(i => {
      if (i.initiatedBy === 'me')   meInit++;
      if (i.initiatedBy === 'them') themInit++;
      (i.redFlags   || []).forEach(f => allRed.push(f));
      (i.greenFlags || []).forEach(f => allGreen.push(f));
    });
    const sm = (typeof getPersonSignalSummary === 'function') ? getPersonSignalSummary(p.id) : { level: 'none' };
    if (sm.level === 'high') alertPersons.push({ person: p, topSignal: sm.topSignal });
  });

  const topRed   = _topNFlags(allRed,   5);
  const topGreen = _topNFlags(allGreen, 5);
  const meInitPct   = totalInteractions > 0 ? Math.round(meInit   / totalInteractions * 100) : null;
  const themInitPct = totalInteractions > 0 ? Math.round(themInit / totalInteractions * 100) : null;

  container.innerHTML = `
    <div class="prf-root" style="overflow:hidden; display:flex; flex-direction:column; height:100%;">
      <div class="prf-header-top" style="border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:20px; font-weight:800; color:#f0eef8; letter-spacing:-0.5px;">Insights</div>
      </div>
      <div style="flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding-bottom:80px;">

        ${persons.length === 0 ? `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 32px;gap:16px;text-align:center;">
            <div style="font-size:40px;color:rgba(240,238,248,0.15);">◎</div>
            <p style="font-size:15px;color:rgba(240,238,248,0.45);line-height:1.6;">No data yet.<br>Add someone and start logging.</p>
            <button onclick="navigate('dashboard')" style="padding:12px 24px;border-radius:12px;background:linear-gradient(135deg,#e94560,#f093fb);color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;font-family:inherit;">Go to Home</button>
          </div>
        ` : `

          <div style="padding:16px 20px 0;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(240,238,248,0.35);margin-bottom:12px;">Overview</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              ${[
                [persons.length, persons.length === 1 ? 'Person tracked' : 'People tracked'],
                [totalInteractions, 'Total interactions'],
                ...(meInitPct !== null ? [[meInitPct + '%', 'Me-initiated'], [themInitPct + '%', 'Them-initiated']] : [])
              ].map(([val, label]) => `
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;background:rgba(255,255,255,0.04);border-radius:12px;padding:16px 8px;border:1px solid rgba(255,255,255,0.07);">
                  <span style="font-size:24px;font-weight:800;color:#f0eef8;">${_esc(String(val))}</span>
                  <span style="font-size:11px;color:rgba(240,238,248,0.4);text-align:center;">${_esc(label)}</span>
                </div>`
              ).join('')}
            </div>
          </div>

          ${alertPersons.length > 0 ? `
          <div style="padding:20px 20px 0;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(240,238,248,0.35);margin-bottom:12px;">Active alerts</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${alertPersons.map(({ person, topSignal }) => `
                <button onclick="navigate('person',{personId:'${_esc(person.id)}'})"
                        style="display:flex;align-items:center;gap:12px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.18);border-radius:14px;padding:12px 14px;cursor:pointer;width:100%;font-family:inherit;text-align:left;color:inherit;">
                  <div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:rgba(255,255,255,0.9);background:${_avatarColor(person.name)};">
                    ${_esc((person.name || '?').charAt(0).toUpperCase())}
                  </div>
                  <div style="flex:1;">
                    <div style="font-size:14px;font-weight:600;color:#f0eef8;">${_esc(person.name)}</div>
                    ${topSignal ? `<div style="font-size:12px;color:rgba(240,238,248,0.5);">${_esc(topSignal)}</div>` : ''}
                  </div>
                  <span style="font-size:20px;color:rgba(240,238,248,0.3);">›</span>
                </button>`
              ).join('')}
            </div>
          </div>` : ''}

          ${topRed.length > 0 ? `
          <div style="padding:20px 20px 0;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(240,238,248,0.35);margin-bottom:12px;">Common red flags</div>
            ${topRed.map(([flag, count]) => `
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:13px;padding:4px 10px;border-radius:20px;font-weight:500;background:rgba(239,68,68,0.15);color:#fca5a5;">${_esc(flag)}</span>
                <span style="font-size:12px;color:rgba(240,238,248,0.35);">${count}×</span>
              </div>`
            ).join('')}
          </div>` : ''}

          ${topGreen.length > 0 ? `
          <div style="padding:20px 20px 0;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(240,238,248,0.35);margin-bottom:12px;">Common green flags</div>
            ${topGreen.map(([flag, count]) => `
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:13px;padding:4px 10px;border-radius:20px;font-weight:500;background:rgba(74,222,128,0.12);color:#86efac;">${_esc(flag)}</span>
                <span style="font-size:12px;color:rgba(240,238,248,0.35);">${count}×</span>
              </div>`
            ).join('')}
          </div>` : ''}

          <div style="padding:20px 20px 0;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(240,238,248,0.35);margin-bottom:12px;">By person</div>
            ${persons.map(p => {
              const sm = (typeof getPersonSignalSummary === 'function') ? getPersonSignalSummary(p.id) : { level: 'none' };
              const dotColor = { high:'#f87171', medium:'#fb923c', low:'#facc15', none:'rgba(255,255,255,0.2)' }[sm.level] || 'rgba(255,255,255,0.2)';
              const s = (typeof getStats === 'function') ? getStats(p.id) : {};
              return `
                <button onclick="navigate('person',{personId:'${_esc(p.id)}'})"
                        style="display:flex;align-items:center;gap:12px;padding:12px 0;background:none;border:none;border-bottom:1px solid rgba(255,255,255,0.05);color:inherit;cursor:pointer;font-family:inherit;width:100%;">
                  <div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:rgba(255,255,255,0.9);background:${_avatarColor(p.name)};">
                    ${_esc((p.name || '?').charAt(0).toUpperCase())}
                  </div>
                  <div style="flex:1;text-align:left;">
                    <div style="font-size:14px;font-weight:600;color:#f0eef8;">${_esc(p.name)}</div>
                    <div style="font-size:12px;color:rgba(240,238,248,0.4);margin-top:2px;">${(s.totalInteractions || 0)} interactions · ${_esc(p.platform || 'Unknown')}</div>
                  </div>
                  <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${dotColor};display:inline-block;"></span>
                  <span style="font-size:18px;color:rgba(240,238,248,0.25);">›</span>
                </button>`;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

function _topNFlags(arr, n) {
  const freq = {};
  arr.forEach(item => { freq[item] = (freq[item] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n);
}

/** Fallback stats shape when data.js is not available. */
function _emptyStats() {
  return {
    totalInteractions:      0,
    initiatedByMePct:       0,
    initiatedByThemPct:     0,
    avgResponseTime:        null,
    lastInteractionDate:    null,
    daysSinceLastInteraction: null,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRIVATE — STYLES
   Injected once into <head>. Scoped under .prf-root to avoid leaking.
───────────────────────────────────────────────────────────────────────────── */

function _ensureStyles() {
  if (document.getElementById('prf-styles')) return;

  const style = document.createElement('style');
  style.id    = 'prf-styles';
  style.textContent = /* css */`

/* ── Root ── */
.prf-root {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #FBF8F5;
  color: #1C1410;
  font-family: 'DM Sans', -apple-system, 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ── Header ── */
.prf-header {
  padding: 0 0 28px;
  background: #FBF8F5;
  text-align: center;
  border-bottom: 1px solid #EDE6DF;
}

.prf-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 20px;
}

.prf-avatar-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.prf-avatar {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 6px rgba(0,0,0,0.15);
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.prf-identity { padding: 0 20px; }

.prf-name {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 26px;
  font-weight: 400;
  letter-spacing: -0.3px;
  color: #1C1410;
  margin: 0 0 8px;
}

.prf-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.prf-platform-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 9999px;
  background: #FFFFFF;
  color: #7A6E68;
  border: 1px solid #EDE6DF;
}

.prf-meta-dot {
  color: #C8BDB4;
  font-size: 12px;
}

.prf-met-line {
  font-size: 12px;
  color: #B0A89E;
  letter-spacing: 0.1px;
}

/* ── Icon buttons ── */
.prf-btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 1px solid #EDE6DF;
  color: #7A6E68;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.prf-btn-icon:hover {
  background: #F5F0EC;
  color: #1C1410;
}

/* ── Body ── */
.prf-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ── Section ── */
.prf-section {
  padding: 24px 16px;
  border-bottom: 1px solid #EDE6DF;
}

.prf-section:last-child { border-bottom: none; }

.prf-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.prf-section-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #B0A89E;
  margin: 0 0 16px;
}

.prf-section-header .prf-section-title { margin-bottom: 0; }

.prf-interaction-count {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
  background: #EDE6DF;
  color: #7A6E68;
}

/* ── Stats — cards with big numbers ── */
.prf-stats-bar { background: transparent; }

.prf-stat-grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 1fr;
  gap: 10px;
}

.prf-stat {
  background: #FFFFFF;
  border: 1px solid #EDE6DF;
  border-radius: 14px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 1px 4px rgba(28,20,16,0.05);
}

.prf-stat--wide { grid-column: span 1; }

.prf-stat-value {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #1C1410;
  line-height: 1;
}

.prf-stat-value--sm {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.prf-stat-label {
  font-size: 10px;
  letter-spacing: 0.3px;
  color: #B0A89E;
  margin-top: 2px;
}

.prf-initiation-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #B0A89E;
  margin-bottom: 5px;
}

.prf-initiation-bar {
  height: 5px;
  border-radius: 9999px;
  background: #EDE6DF;
  display: flex;
  overflow: hidden;
  gap: 1px;
  margin-bottom: 6px;
}

.prf-initiation-fill--them {
  height: 100%;
  background: linear-gradient(90deg, #B090C8, #D4607A);
  border-radius: 9999px 0 0 9999px;
  transition: width 0.4s ease;
}

.prf-initiation-fill--me {
  height: 100%;
  background: linear-gradient(90deg, #E8855A, #D4607A);
  border-radius: 0 9999px 9999px 0;
  transition: width 0.4s ease;
}

/* ── Signals ── */
.prf-signals-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Signal card with gradient left bar instead of border */
.prf-signal-card {
  padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid #EDE6DF;
  border-left: none;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(28,20,16,0.05);
}

/* Gradient left bar */
.prf-signal-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--_signal-bar-grad, linear-gradient(180deg, #C8BDB4, #B0A89E));
  border-radius: 2px 0 0 2px;
}

.prf-signal-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.prf-signal-title {
  font-size: 13px;
  font-weight: 600;
  color: #1C1410;
  line-height: 1.4;
}

.prf-severity {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  border-radius: 9999px;
  white-space: nowrap;
  flex-shrink: 0;
}

.prf-severity--high   { background: rgba(196,64,64,0.10);   color: #C44040; border: 1px solid rgba(196,64,64,0.22); }
.prf-severity--medium { background: rgba(192,128,48,0.10);  color: #C08030; border: 1px solid rgba(192,128,48,0.22); }
.prf-severity--low    { background: rgba(158,152,144,0.12); color: #7A6E68; border: 1px solid rgba(158,152,144,0.25); }
.prf-severity--green  { background: rgba(58,148,104,0.10);  color: #2A8050; border: 1px solid rgba(58,148,104,0.22); }

.prf-signal-desc {
  font-size: 12px;
  color: #7A6E68;
  line-height: 1.6;
  margin: 0;
}

.prf-signal-evidence {
  font-size: 10px;
  color: #B0A89E;
  margin-top: 8px;
  letter-spacing: 0.2px;
}

.prf-signal-empty {
  text-align: center;
  padding: 28px 0 16px;
}

.prf-signal-empty-icon {
  font-size: 28px;
  margin-bottom: 10px;
  opacity: 0.4;
}

.prf-signal-empty-text {
  font-size: 14px;
  font-weight: 500;
  color: #7A6E68;
  margin-bottom: 4px;
}

.prf-signal-empty-sub {
  font-size: 12px;
  color: #B0A89E;
}

.prf-signal-green-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(58,148,104,0.07);
  border: 1px solid rgba(58,148,104,0.20);
  border-radius: 12px;
}

.prf-signal-green-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(58,148,104,0.15);
  color: #2A8050;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.prf-signal-green-title {
  font-size: 13px;
  font-weight: 600;
  color: #2A8050;
  margin-bottom: 4px;
}

.prf-signal-green-desc {
  font-size: 12px;
  color: #7A6E68;
  line-height: 1.6;
}

/* ── Timeline ── */
.prf-timeline-section { padding-bottom: 16px; }

.prf-timeline {
  display: flex;
  flex-direction: column;
}

.prf-timeline-empty {
  font-size: 13px;
  color: #B0A89E;
  padding: 16px 0 8px;
}

.prf-ix-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
}

/* ── Stem / dot ── */
.prf-ix-stem {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 18px;
  flex-shrink: 0;
  padding-top: 16px;
}

.prf-ix-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px #FBF8F5;
  position: relative;
  z-index: 1;
}

.prf-ix-line {
  width: 1px;
  flex: 1;
  min-height: 24px;
  background: #EDE6DF;
  margin-top: 4px;
  margin-bottom: 0;
}

.prf-ix-row--last .prf-ix-stem { padding-bottom: 0; }

/* ── Interaction card ── */
.prf-ix-card {
  flex: 1;
  margin-bottom: 10px;
  background: #FFFFFF;
  border: 1px solid #EDE6DF;
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 4px rgba(28,20,16,0.05);
}

.prf-ix-card:hover { border-color: #C8BDB4; box-shadow: 0 2px 8px rgba(28,20,16,0.08); }

.prf-ix-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 14px;
  cursor: pointer;
  gap: 8px;
}

.prf-ix-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.prf-ix-emoji {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 1px;
}

.prf-ix-info { flex: 1; min-width: 0; }

.prf-ix-headline {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.prf-ix-type {
  font-size: 13px;
  font-weight: 600;
  color: #1C1410;
}

.prf-ix-sep {
  color: #C8BDB4;
  font-size: 12px;
}

.prf-ix-initiator {
  font-size: 12px;
  color: #7A6E68;
}

.prf-ix-date {
  font-size: 11px;
  color: #B0A89E;
  margin-top: 2px;
  letter-spacing: 0.2px;
}

.prf-ix-preview {
  font-size: 12px;
  color: #B0A89E;
  margin-top: 5px;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prf-ix-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.prf-ix-edit-btn {
  width: 28px;
  height: 28px;
  opacity: 0.5;
}

.prf-ix-edit-btn:hover { opacity: 1; }

.prf-ix-chevron {
  color: #C8BDB4;
  display: flex;
  align-items: center;
  transition: transform 0.2s;
}

.prf-ix-chevron--open { transform: rotate(180deg); }

/* ── Expanded detail ── */
.prf-ix-detail {
  padding: 12px 14px 14px;
  border-top: 1px solid #EDE6DF;
  background: #FBF8F5;
}

.prf-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.prf-detail-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.prf-detail-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #B0A89E;
}

.prf-detail-val {
  font-size: 13px;
  color: #1C1410;
}

.prf-detail-mood {
  display: flex;
  align-items: center;
  gap: 6px;
}

.prf-mood-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.prf-detail-notes {
  font-size: 13px;
  color: #7A6E68;
  line-height: 1.6;
  margin-bottom: 10px;
}

.prf-flags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.prf-flag {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 9999px;
}

.prf-flag--green {
  background: rgba(58,148,104,0.08);
  color: #2A8050;
  border: 1px solid rgba(58,148,104,0.22);
}

.prf-flag--red {
  background: rgba(196,64,64,0.08);
  color: #C44040;
  border: 1px solid rgba(196,64,64,0.22);
}

/* ── Log new button ── */
.prf-log-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(212,96,122,0.06);
  border: 1.5px dashed rgba(212,96,122,0.30);
  color: #D4607A;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  font-family: inherit;
}

.prf-log-btn:hover {
  background: rgba(212,96,122,0.10);
  border-color: rgba(212,96,122,0.50);
}

/* ── Danger zone ── */
.prf-danger-zone {
  padding-top: 32px;
  border-top: 1px solid #EDE6DF;
}

.prf-delete-btn {
  display: block;
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 1.5px solid rgba(196,64,64,0.28);
  border-radius: 12px;
  color: #C44040;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  font-family: inherit;
  letter-spacing: 0.1px;
}

.prf-delete-btn:hover {
  background: rgba(196,64,64,0.06);
  border-color: rgba(196,64,64,0.45);
}

/* ── Confirm dialog ── */
.prf-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(28,20,16,0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 0 0 env(safe-area-inset-bottom, 0);
}

@media (min-height: 600px) {
  .prf-dialog-overlay { align-items: center; }
}

.prf-dialog {
  background: #FFFFFF;
  border: 1px solid #EDE6DF;
  border-radius: 20px 20px 0 0;
  padding: 24px 20px 32px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 -8px 48px rgba(28,20,16,0.12);
}

@media (min-height: 600px) {
  .prf-dialog { border-radius: 20px; }
}

.prf-dialog-title {
  font-size: 16px;
  font-weight: 700;
  color: #1C1410;
  letter-spacing: -0.2px;
  margin: 0 0 10px;
}

.prf-dialog-body {
  font-size: 13px;
  color: #7A6E68;
  line-height: 1.6;
  margin: 0 0 20px;
}

.prf-dialog-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.prf-dialog-cancel,
.prf-dialog-confirm {
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}

.prf-dialog-cancel:hover,
.prf-dialog-confirm:hover { opacity: 0.8; }

.prf-dialog-cancel {
  background: #F5F0EC;
  border: 1px solid #EDE6DF;
  color: #7A6E68;
}

.prf-dialog-confirm {
  background: rgba(196,64,64,0.10);
  border: 1.5px solid rgba(196,64,64,0.30);
  color: #C44040;
}

/* ── Error state ── */
.prf-error-root {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 24px;
  background: #FBF8F5;
}

.prf-error-back {
  position: absolute;
  top: 14px;
  left: 16px;
}

.prf-error-msg {
  font-size: 14px;
  color: #7A6E68;
  text-align: center;
  max-width: 280px;
  line-height: 1.6;
}

/* ── Photo avatar ── */
.prf-avatar--photo {
  overflow: hidden;
  border-radius: 20px;
}
.prf-avatar--photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 20px;
  display: block;
}

/* ── Interaction photo badge (timeline row) ── */
.prf-ix-photo-badge {
  font-size: 11px;
  color: #B0A89E;
  margin-top: 2px;
}

/* ── Interaction photo thumbnails (expanded detail) ── */
.prf-detail-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.prf-photo-thumb-btn {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #EDE6DF;
  padding: 0;
  cursor: pointer;
  background: #F5F0EC;
  transition: opacity 0.15s, transform 0.15s;
  flex-shrink: 0;
}

.prf-photo-thumb-btn:hover  { opacity: 0.85; }
.prf-photo-thumb-btn:active { transform: scale(0.96); }

.prf-photo-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ── Lightbox ── */
.prf-lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.prf-lightbox--open {
  opacity: 1;
  pointer-events: all;
}

.prf-lightbox-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.85);
}

.prf-lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  z-index: 1;
  transition: background 0.15s;
}

.prf-lightbox-close:hover { background: rgba(255,255,255,0.2); }
.prf-lightbox-close svg { width: 16px; height: 16px; }

.prf-lightbox-img-wrap {
  position: relative;
  z-index: 1;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.prf-lightbox-img {
  max-width: 100%;
  max-height: calc(100vh - 80px);
  border-radius: 12px;
  display: block;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6);
}

  `.trim();

  document.head.appendChild(style);
}
