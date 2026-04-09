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
 * Derive a flat background colour for a letter avatar from a name string.
 * Uses a restrained dark palette — text is always warm parchment (#F5F0E8).
 * @param {string} name
 * @returns {string} CSS colour string
 */
function avatarColour(name) {
  const AVATAR_COLORS = [
    '#8B6B4A',   // deep brown
    '#4A6B5A',   // moss green
    '#6B4A6B',   // deep plum
    '#6B5A3A',   // tobacco brown
    '#3A5A6B',   // steel blue
    '#6B3A4A',   // deep rose
    '#4A5A3A',   // olive
    '#5A3A6B',   // dark violet
  ];
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Map a signal level string to a display label and CSS modifier class.
 * @param {'high'|'medium'|'low'|'none'|string} level
 * @returns {{ label: string, cls: string }}
 */
function signalLevelMeta(level) {
  switch (level) {
    case 'high':   return { label: 'Worth attention',  cls: 'signal-pill--high'   };
    case 'medium': return { label: 'Something's there', cls: 'signal-pill--medium' };
    case 'low':    return { label: 'Looking okay',     cls: 'signal-pill--low'    };
    case 'none':
    default:       return { label: 'No data yet',      cls: 'signal-pill--none'   };
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
    <div class="person-card__avatar"
         style="background:${colour}; border-radius:14px; color:#F5F0E8;"
         aria-hidden="true">
      ${initial}
    </div>

    <div class="person-card__body">
      <div class="person-card__name-row">
        <span class="person-card__name">${escapeHtml(person.label || person.name)}</span>
        <span class="person-card__platform-sub">${escapeHtml(person.platform || 'Unknown')}</span>
      </div>
      <div class="person-card__footer-row">
        <span class="person-card__time">${escapeHtml(relativeTime)}</span>
        <span class="signal-pill ${signalCls}">${signalLabel}</span>
      </div>
    </div>

    <div class="person-card__signal-stripe person-card__signal-stripe--${signalSummary.level}"
         aria-hidden="true"></div>
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
      <h2 class="empty-state__heading">Your board is empty.</h2>
      <p class="empty-state__body">
        Add someone worth watching.
      </p>
      <button class="btn btn--primary" id="empty-add-btn" type="button">
        Add someone
      </button>
    </div>
  `;

  wrapper.querySelector('#empty-add-btn').addEventListener('click', () => {
    navigate('add-person', {});
  });

  return wrapper;
}

/**
 * Count the total number of interactions logged in the last 7 days.
 * Iterates every person's actual interaction records so the dashboard summary
 * bar shows a real activity count, not just "how many people were active".
 * @param {Array} persons
 * @returns {number}
 */
function countWeeklyInteractions(persons) {
  if (typeof getInteractions !== 'function') return 0;

  // Use an ISO date string cutoff so string-comparison works with ix.date (YYYY-MM-DD)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  let count = 0;
  persons.forEach(function (person) {
    var ixs = getInteractions(person.id);
    ixs.forEach(function (ix) {
      if (ix.date && ix.date >= cutoff) count++;
    });
  });
  return count;
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
    <div class="dashboard__logo" style="font-family:'Instrument Serif',Georgia,serif;font-size:28px;font-weight:400;letter-spacing:-0.04em;color:#1C1410;">SignalTrace</div>
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
    navigate('settings');
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

  // ── Search bar (only when there are people to filter) ───────────────────────
  if (personCount > 0) {
    const searchWrap = document.createElement('div');
    searchWrap.className = 'dashboard__search-wrap';
    searchWrap.innerHTML = `
      <div class="dashboard__search-inner">
        <svg class="dashboard__search-icon" viewBox="0 0 20 20" fill="none"
             stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
             stroke-linejoin="round" aria-hidden="true" width="16" height="16">
          <circle cx="8.5" cy="8.5" r="5.5"/>
          <line x1="13" y1="13" x2="18" y2="18"/>
        </svg>
        <input
          class="dashboard__search-input"
          type="search"
          id="dashboard-search"
          placeholder="Search people…"
          aria-label="Search people"
          autocomplete="off"
          spellcheck="false"
        />
        <button class="dashboard__search-clear" id="dashboard-search-clear"
                type="button" aria-label="Clear search" hidden>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" width="14" height="14" aria-hidden="true">
            <line x1="4" y1="4" x2="16" y2="16"/>
            <line x1="16" y1="4" x2="4" y2="16"/>
          </svg>
        </button>
      </div>
    `;
    screen.appendChild(searchWrap);
  }

  // ── People list or empty state ───────────────────────────────────────────────
  const listSection = document.createElement('section');
  listSection.className = 'dashboard__list-section';
  listSection.setAttribute('aria-label', 'People you are tracking');

  if (personCount === 0) {
    listSection.appendChild(renderEmptyState());
  } else {
    // Build augmented person objects once
    const augmentedPersons = persons.map((person) => {
      const stats = (typeof getStats === 'function') ? getStats(person.id) : {};
      return Object.assign({}, person, {
        label: person.name,
        lastInteractionAt: stats.lastInteractionDate || null,
      });
    });

    /** Render (or re-render) the person list, optionally filtered by name. */
    function _renderFilteredList(query) {
      listSection.innerHTML = '';

      const filtered = query
        ? augmentedPersons.filter(p =>
            (p.name || '').toLowerCase().includes(query.toLowerCase())
          )
        : augmentedPersons;

      if (filtered.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'dashboard__no-results';
        noResults.innerHTML = `
          <div class="empty-state empty-state--compact">
            <div class="empty-state__icon" aria-hidden="true">◎</div>
            <p class="empty-state__body">No one matches &ldquo;${escapeHtml(query)}&rdquo;</p>
          </div>
        `;
        listSection.appendChild(noResults);
        return;
      }

      const list = document.createElement('ul');
      list.className = 'person-list';
      list.setAttribute('role', 'list');

      filtered.forEach((person) => {
        const li = document.createElement('li');
        li.className = 'person-list__item';
        li.setAttribute('role', 'listitem');
        li.appendChild(renderPersonCard(person));
        list.appendChild(li);
      });

      listSection.appendChild(list);
    }

    _renderFilteredList('');

    // Wire up search input (deferred so listSection is in the DOM)
    setTimeout(() => {
      const searchInput = document.getElementById('dashboard-search');
      const clearBtn    = document.getElementById('dashboard-search-clear');
      if (!searchInput) return;

      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim();
        if (clearBtn) clearBtn.hidden = !q;
        _renderFilteredList(q);
      });

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          searchInput.value = '';
          clearBtn.hidden = true;
          searchInput.focus();
          _renderFilteredList('');
        });
      }
    }, 0);
  }

  screen.appendChild(listSection);

  // ── FAB (Floating Action Button) ─────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.className  = 'fab';
  fab.type       = 'button';
  fab.setAttribute('aria-label', 'Add a new person');
  fab.style.cssText = `
    background: linear-gradient(135deg, #D4607A 0%, #E8855A 100%);
    border-radius: 20px;
    box-shadow: 0 6px 20px rgba(212,96,122,0.35), 0 2px 6px rgba(212,96,122,0.20);
    color: #fff;
    border: none;
  `;
  fab.innerHTML  = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5"  y1="12" x2="19" y2="12"/>
    </svg>
    <span style="font-size:14px;font-weight:600;letter-spacing:0.01em;">Add person</span>
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

// ─── Search bar styles (injected once) ────────────────────────────────────────
(function _injectSearchStyles() {
  if (document.getElementById('dashboard-search-styles')) return;
  const style = document.createElement('style');
  style.id = 'dashboard-search-styles';
  style.textContent = `
.dashboard__search-wrap {
  padding: 8px 16px 4px;
}
.dashboard__search-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FFFFFF;
  border: 1px solid #EDE6DF;
  border-radius: 12px;
  padding: 0 14px;
  height: 42px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.dashboard__search-inner:focus-within {
  border-color: #D4607A;
  box-shadow: 0 0 0 3px rgba(212,96,122,0.10);
}
.dashboard__search-icon {
  flex-shrink: 0;
  color: #B0A89E;
}
.dashboard__search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 15px;
  color: #1C1410;
  font-family: inherit;
  line-height: 1;
  -webkit-appearance: none;
}
.dashboard__search-input::placeholder {
  color: #C8BDB4;
}
.dashboard__search-input::-webkit-search-cancel-button { display: none; }
.dashboard__search-clear {
  background: none;
  border: none;
  color: #C8BDB4;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color 0.15s;
}
.dashboard__search-clear:hover { color: #7A6E68; }
.dashboard__no-results {
  padding: 40px 20px;
  text-align: center;
}
.empty-state--compact .empty-state__icon { font-size: 24px; opacity: 0.35; margin-bottom: 8px; }
.empty-state--compact .empty-state__body { font-size: 14px; }
  `;
  document.head.appendChild(style);
})();
