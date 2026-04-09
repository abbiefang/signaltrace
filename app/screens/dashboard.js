// screens/dashboard.js
// SignalTrace — Dashboard (main screen)
// Depends on: data.js (getAllPersons), signals.js (getPersonSignalSummary), app.js (navigate)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format a timestamp into a relative "X days ago" / "just now" string.
 * Uses vanilla JS only — no external date library.
 * @param {string|number|Date} timestamp
 * @returns {string}
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return 'No interactions yet';

  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (isNaN(diffMs) || diffMs < 0) return 'Unknown';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);
  const diffWk  = Math.floor(diffDay / 7);
  const diffMo  = Math.floor(diffDay / 30);

  if (diffSec < 60)  return 'Just now';
  if (diffMin < 60)  return diffMin === 1 ? '1 minute ago'  : `${diffMin} minutes ago`;
  if (diffHr  < 24)  return diffHr  === 1 ? '1 hour ago'    : `${diffHr} hours ago`;
  if (diffDay < 7)   return diffDay === 1 ? 'Yesterday'     : `${diffDay} days ago`;
  if (diffWk  < 5)   return diffWk  === 1 ? '1 week ago'    : `${diffWk} weeks ago`;
  return diffMo  === 1 ? '1 month ago' : `${diffMo} months ago`;
}

/**
 * Derive a single background colour for a letter avatar from a name string.
 * Returns one of 8 warm/muted palette colours — consistent per name.
 * @param {string} name
 * @returns {string} hex colour
 */
function avatarColour(name) {
  const palette = [
    '#C4A882', '#9E8FA8', '#8FA89E', '#A88F8F',
    '#8F9EA8', '#A89E8F', '#8FA898', '#A88FA0',
  ];
  if (!name) return palette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Map a signal level string to a display label and CSS modifier class.
 * @param {'high'|'medium'|'low'|'none'|string} level
 * @returns {{ label: string, cls: string }}
 */
function signalLevelMeta(level) {
  switch (level) {
    case 'high':   return { label: 'Strong signals',   cls: 'signal-pill--high'   };
    case 'medium': return { label: 'Mixed signals',    cls: 'signal-pill--medium' };
    case 'low':    return { label: 'Weak signals',     cls: 'signal-pill--low'    };
    case 'none':
    default:       return { label: 'No signals yet',   cls: 'signal-pill--none'   };
  }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

/**
 * Render a single Person Card element.
 * @param {Object} person  — shape: { id, label, platform, lastInteractionAt }
 * @returns {HTMLElement}
 */
function renderPersonCard(person) {
  const signalSummary  = getPersonSignalSummary(person.id);
  const { label: signalLabel, cls: signalCls } = signalLevelMeta(signalSummary.level);
  // person.label is an augmented alias for person.name (added in renderDashboard)
  const initial        = (person.label || person.name || '?').charAt(0).toUpperCase();
  const colour         = avatarColour(person.label || person.name);
  const relativeTime   = formatRelativeTime(person.lastInteractionAt);

  const card = document.createElement('button');
  card.className  = 'person-card';
  card.type       = 'button';
  card.setAttribute('aria-label', `View ${person.label}`);

  card.innerHTML = `
    <div class="person-card__avatar" style="background-color: ${colour};" aria-hidden="true">
      ${initial}
    </div>

    <div class="person-card__body">
      <div class="person-card__name">${escapeHtml(person.label || person.name)}</div>
      <div class="person-card__meta">
        <span class="person-card__platform">${escapeHtml(person.platform || 'Unknown')}</span>
        <span class="person-card__dot" aria-hidden="true">·</span>
        <span class="person-card__time">${escapeHtml(relativeTime)}</span>
      </div>
      ${
        signalSummary.topSignal
          ? `<div class="person-card__top-signal">${escapeHtml(signalSummary.topSignal)}</div>`
          : ''
      }
    </div>

    <div class="person-card__aside">
      <span class="signal-pill ${signalCls}">${signalLabel}</span>
      <span class="person-card__chevron" aria-hidden="true">›</span>
    </div>
  `;

  card.addEventListener('click', () => {
    navigate('person', { personId: person.id });
  });

  return card;
}

/**
 * Render the empty-state card shown when the user has no persons yet.
 * @returns {HTMLElement}
 */
function renderEmptyState() {
  const wrapper = document.createElement('div');
  wrapper.className = 'dashboard__empty';

  wrapper.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">◎</div>
      <h2 class="empty-state__heading">Nothing tracked yet</h2>
      <p class="empty-state__body">
        Add someone you're seeing and start building a clear picture
        of what's actually happening.
      </p>
      <button class="btn btn--primary" id="empty-add-btn" type="button">
        Add your first person
      </button>
    </div>
  `;

  wrapper.querySelector('#empty-add-btn').addEventListener('click', () => {
    navigate('add-person', {});
  });

  return wrapper;
}

/**
 * Count how many interactions occurred in the last 7 days.
 * Falls back gracefully if persons have no interaction data.
 * @param {Array} persons
 * @returns {number}
 */
function countWeeklyInteractions(persons) {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return persons.reduce((total, person) => {
    if (!person.lastInteractionAt) return total;
    return new Date(person.lastInteractionAt).getTime() > oneWeekAgo ? total + 1 : total;
  }, 0);
}

// ─── Main render function ─────────────────────────────────────────────────────

/**
 * Render the full Dashboard screen into #screen-dashboard.
 * Called by the router whenever the dashboard route is activated.
 */
function renderDashboard() {
  const screen = document.getElementById('screen-dashboard');
  if (!screen) {
    console.error('[dashboard] #screen-dashboard element not found.');
    return;
  }

  // Clear previous render
  screen.innerHTML = '';

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const persons        = getAllPersons();
  const personCount    = persons.length;
  const weeklyCount    = countWeeklyInteractions(persons);

  // ── Header ──────────────────────────────────────────────────────────────────
  const header = document.createElement('header');
  header.className = 'dashboard__header';
  header.innerHTML = `
    <div class="dashboard__logo">SignalTrace</div>
    <button
      class="dashboard__settings-btn icon-btn"
      type="button"
      aria-label="Settings"
      id="settings-btn"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
           stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0
                 0 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0
                 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2
                 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65
                 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1
                 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0
                 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65
                 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2
                 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0
                 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2
                 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65
                 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1
                 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0
                 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65
                 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  `;

  header.querySelector('#settings-btn').addEventListener('click', () => {
    navigate('profile');
  });

  screen.appendChild(header);

  // ── Summary bar ─────────────────────────────────────────────────────────────
  const summaryBar = document.createElement('div');
  summaryBar.className = 'dashboard__summary-bar';
  summaryBar.setAttribute('role', 'status');
  summaryBar.setAttribute('aria-live', 'polite');
  summaryBar.innerHTML = `
    <div class="summary-stat">
      <span class="summary-stat__value">${personCount}</span>
      <span class="summary-stat__label">${personCount === 1 ? 'person' : 'people'} tracked</span>
    </div>
    <div class="summary-bar__divider" aria-hidden="true"></div>
    <div class="summary-stat">
      <span class="summary-stat__value">${weeklyCount}</span>
      <span class="summary-stat__label">${weeklyCount === 1 ? 'interaction' : 'interactions'} this week</span>
    </div>
  `;
  screen.appendChild(summaryBar);

  // ── People list or empty state ───────────────────────────────────────────────
  const listSection = document.createElement('section');
  listSection.className = 'dashboard__list-section';
  listSection.setAttribute('aria-label', 'People you are tracking');

  if (personCount === 0) {
    listSection.appendChild(renderEmptyState());
  } else {
    const list = document.createElement('ul');
    list.className = 'person-list';
    list.setAttribute('role', 'list');

    persons.forEach((person) => {
      // Augment person with fields expected by renderPersonCard:
      //   label          — alias for name (dashboard renders person.label)
      //   lastInteractionAt — ISO date string from stats (not stored on person directly)
      const stats = (typeof getStats === 'function') ? getStats(person.id) : {};
      const augmented = Object.assign({}, person, {
        label: person.name,
        lastInteractionAt: stats.lastInteractionDate || null,
      });
      const li = document.createElement('li');
      li.className = 'person-list__item';
      li.setAttribute('role', 'listitem');
      li.appendChild(renderPersonCard(augmented));
      list.appendChild(li);
    });

    listSection.appendChild(list);
  }

  screen.appendChild(listSection);

  // ── FAB (Floating Action Button) ─────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.className  = 'fab';
  fab.type       = 'button';
  fab.setAttribute('aria-label', 'Add a new person');
  fab.innerHTML  = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5"  y1="12" x2="19" y2="12"/>
    </svg>
  `;

  fab.addEventListener('click', () => {
    navigate('add-person', {});
  });

  screen.appendChild(fab);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Minimal HTML escaping to prevent XSS when inserting user-controlled strings
 * into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
