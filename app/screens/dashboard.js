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

  if (isNaN(diffMs) || diffMs < 0) return 'Some time ago';

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
 * Uses warm neutral palette (taupe, greens, earth tones).
 * @param {string} name
 * @returns {string} CSS colour string
 */
function avatarColour(name) {
  const AVATAR_COLORS = [
    '#C8A882',   // taupe
    '#8FA89F',   // forest green
    '#B8867A',   // rust
    '#7C98B6',   // slate blue
    '#A89B8F',   // warm grey
    '#9BA882',   // sage
    '#A882A8',   // mauve
    '#82A8A4',   // dusty teal
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
    case 'high':   return { label: '⚠️ Watch out',     cls: 'signal-pill--high'   };
    case 'medium': return { label: '👀 Pay attention', cls: 'signal-pill--medium' };
    case 'low':    return { label: '✅ Looking good',  cls: 'signal-pill--low'    };
    case 'none':
    default:       return { label: 'Keep logging',      cls: 'signal-pill--none'   };
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
         style="background:${colour}; color:#FFFFFF;"
         aria-hidden="true">
      ${initial}
    </div>

    <div class="person-card__body">
      <div class="person-card__name-row">
        <span class="person-card__name">${escapeHtml(person.label || person.name)}</span>
        <span class="person-card__platform-sub">${escapeHtml(person.platform || '—')}</span>
      </div>
      <div class="person-card__footer-row">
        <span class="person-card__time">${escapeHtml(relativeTime)}</span>
        <span class="signal-pill ${signalCls}">${signalLabel}</span>
      </div>
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
      <div class="empty-state__icon" aria-hidden="true">🔍</div>
      <h2 class="empty-state__heading">Who are you tracking?</h2>
      <p class="empty-state__body">
        Add someone you're dating, texting, or just noticing. Log what happens between you — patterns will tell you what words can't.
      </p>
      <button class="btn btn--primary btn--full" id="empty-add-btn" type="button">
        + Add someone
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
    navigate('settings');
  });

  screen.appendChild(header);

  // ── Summary bar ─────────────────────────────────────────────────────────────
  // Count how many people have high-signal alerts
  const alertCount = (personCount > 0 && typeof getPersonSignalSummary === 'function')
    ? persons.filter(p => {
        try { return getPersonSignalSummary(p.id).level === 'high'; } catch (_) { return false; }
      }).length
    : 0;

  // Build contextual insight message
  let insightMsg = '';
  if (personCount === 0) {
    insightMsg = 'Add someone to start spotting patterns';
  } else if (alertCount > 0) {
    insightMsg = `⚠️ ${alertCount} ${alertCount === 1 ? 'person needs' : 'people need'} your attention`;
  } else if (weeklyCount === 0) {
    insightMsg = 'This week\'s quiet — log something when it happens';
  } else {
    insightMsg = weeklyCount >= 5 ? '🔥 Active week — patterns forming' : '✅ All signals looking good';
  }

  const summaryBar = document.createElement('div');
  summaryBar.className = 'dashboard__summary-bar';
  summaryBar.setAttribute('role', 'status');
  summaryBar.setAttribute('aria-live', 'polite');
  summaryBar.innerHTML = `
    <div class="summary-stats-row">
      <div class="summary-stat">
        <span class="summary-stat__value">${personCount}</span>
        <span class="summary-stat__label">${personCount === 1 ? 'person' : 'people'} tracked</span>
      </div>
      <div class="summary-bar__divider" aria-hidden="true"></div>
      <div class="summary-stat">
        <span class="summary-stat__value">${weeklyCount}</span>
        <span class="summary-stat__label">${weeklyCount === 1 ? 'interaction' : 'interactions'} this week</span>
      </div>
    </div>
    ${insightMsg ? `
    <div class="summary-bar__insight">${insightMsg}</div>
    ` : ''}
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
          placeholder="Find someone…"
          aria-label="Find someone"
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
    // Guard flag prevents listener accumulation if renderDashboard is called multiple times
    setTimeout(() => {
      const searchInput = document.getElementById('dashboard-search');
      const clearBtn    = document.getElementById('dashboard-search-clear');
      if (!searchInput || searchInput.dataset.wired) return;
      searchInput.dataset.wired = 'true';

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

  // ── FAB removed: now using center tab bar button instead ─────────────────
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

// ─── Search bar styles ────────────────────────────────────────────────────────
// NOTE: Styles are in styles.css — this block is intentionally disabled.
(function _injectSearchStyles() {
  return; // Styles already in styles.css
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
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(200, 168, 130, 0.15);
}
.dashboard__search-icon {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}
.dashboard__search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 15px;
  color: var(--color-text-primary);
  font-family: inherit;
  line-height: 1;
  -webkit-appearance: none;
}
.dashboard__search-input::placeholder {
  color: var(--color-text-tertiary);
}
.dashboard__search-input::-webkit-search-cancel-button { display: none; }
.dashboard__search-clear {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.15s;
  min-width: 44px;
  min-height: 44px;
  margin: -8px;
}
.dashboard__search-clear:hover { color: var(--color-text-secondary); }
.dashboard__search-clear:active { color: var(--color-text-primary); }
.dashboard__no-results {
  padding: 40px 20px;
  text-align: center;
}
.empty-state--compact .empty-state__icon {
  font-size: 24px;
  opacity: 0.4;
  margin-bottom: 8px;
  color: var(--color-text-tertiary);
}
.empty-state--compact .empty-state__body {
  font-size: 14px;
  color: var(--color-text-secondary);
}
  `;
  document.head.appendChild(style);
})();
