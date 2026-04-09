/**
 * SignalTrace — app.js
 * Main controller: state, routing, nav, init, event delegation.
 *
 * Dependencies (loaded before this file):
 *   data.js       – DB.getPeople(), DB.hasPeople(), etc.
 *   signals.js    – signal analysis helpers
 *   screens/*.js  – renderDashboard(), renderPerson(), renderLog(),
 *                   renderProfile(), renderOnboarding()
 */

/* ─────────────────────────────────────────────────────────────────
   GLOBAL STATE
   Single source of truth. Only mutate via updateState().
───────────────────────────────────────────────────────────────── */
window.AppState = {
  currentScreen: null,      // string: 'dashboard' | 'person' | 'log' | 'profile' | 'onboarding'
  currentPersonId: null,    // string | null — set when viewing a person detail page
  logContext: null,         // object | null — { personId, type } when adding a log entry
  editPersonId: null,       // string | null — set when editing an existing person
  isFirstRun: false,        // bool — true on very first launch
  navVisible: true,         // bool — hide nav on onboarding
};

/**
 * Merge partial state updates and re-render if the screen changed.
 * Does NOT trigger a full re-render for every state change —
 * only screens call renderApp() explicitly when they need it.
 */
function updateState(partial) {
  Object.assign(window.AppState, partial);
}


/* ─────────────────────────────────────────────────────────────────
   SCREEN REGISTRY
   Maps screen names to their render functions and nav tab targets.
───────────────────────────────────────────────────────────────── */
const SCREENS = {
  onboarding: {
    render: () => typeof renderOnboarding === 'function' && renderOnboarding(),
    navTab: null,           // no bottom-nav highlight during onboarding
    hideNav: true,
  },
  dashboard: {
    render: () => typeof renderDashboard === 'function' && renderDashboard(),
    navTab: 'dashboard',
    hideNav: false,
  },
  person: {
    render: () => typeof renderPerson === 'function' && renderPerson(AppState.currentPersonId),
    navTab: 'dashboard',    // person detail is a sub-page of Home
    hideNav: false,
  },
  log: {
    render: () => typeof renderLog === 'function' && renderLog(AppState.logContext),
    navTab: 'log',
    hideNav: false,
  },
  profile: {
    render: () => typeof renderProfile === 'function' && renderProfile(),
    navTab: 'profile',
    hideNav: false,
  },

  // Add / Edit person form (person.js)
  'add-person': {
    render: () => {
      if (AppState.editPersonId) {
        typeof renderEditPerson === 'function' && renderEditPerson(AppState.editPersonId);
      } else {
        typeof renderAddPerson === 'function' && renderAddPerson();
      }
    },
    navTab: 'dashboard',
    hideNav: false,
  },

  // Settings
  settings: {
    render: () => typeof renderSettings === 'function' && renderSettings(),
    navTab: 'settings',
    hideNav: false,
  },
};


/* ─────────────────────────────────────────────────────────────────
   ROUTING
───────────────────────────────────────────────────────────────── */

/**
 * navigate(screenName, params?)
 *
 * The single entry-point for all screen transitions.
 *
 * @param {string} screenName  – key in SCREENS
 * @param {object} [params]    – optional: { personId, logContext, replace }
 *   personId   – required when navigating to 'person'
 *   logContext – optional { personId, type } when navigating to 'log'
 *   replace    – if true, replace history entry instead of pushing
 */
function navigate(screenName, params = {}) {
  const screenDef = SCREENS[screenName];
  if (!screenDef) {
    console.warn(`[SignalTrace] Unknown screen: "${screenName}"`);
    return;
  }

  // Update state
  updateState({
    currentScreen:   screenName,
    currentPersonId: params.personId ?? (screenName === 'person' ? AppState.currentPersonId : null),
    // editPersonId is scoped to 'add-person': carried forward only when explicitly passed,
    // cleared on every other screen transition so add-person always opens fresh.
    editPersonId:    screenName === 'add-person' ? (params.editPersonId || null) : AppState.editPersonId,
    logContext:      params.logContext ?? (screenName === 'log' ? AppState.logContext : null),
    navVisible:      !screenDef.hideNav,
  });

  // Update History API
  _pushHistory(screenName, params);

  // Swap visible screen
  _swapScreenVisibility(screenName);

  // Update bottom nav active state
  _updateNavActive(screenDef.navTab);

  // Show / hide bottom nav
  _toggleNav(!screenDef.hideNav);

  // Render screen contents
  renderApp();

  // Scroll to top
  const el = document.getElementById(`screen-${screenName}`);
  if (el) el.scrollTop = 0;
}

/**
 * renderApp()
 *
 * Calls the render function for the current screen.
 * Can be called externally by screens after data mutations.
 */
function renderApp() {
  const screenName = AppState.currentScreen;
  const screenDef = SCREENS[screenName];
  if (!screenDef) return;

  try {
    screenDef.render();
  } catch (err) {
    console.error(`[SignalTrace] renderApp error on screen "${screenName}":`, err);
    _renderErrorState(screenName, err);
  }
}


/* ─────────────────────────────────────────────────────────────────
   INTERNAL HELPERS — NAVIGATION
───────────────────────────────────────────────────────────────── */

/** Show only the target screen div, hide all others. */
function _swapScreenVisibility(activeScreen) {
  document.querySelectorAll('.screen').forEach(el => {
    const isActive = el.dataset.screen === activeScreen;
    el.classList.toggle('screen--active', isActive);
    el.setAttribute('aria-hidden', String(!isActive));
  });
}

/** Set aria-current and active class on the matching nav tab. */
function _updateNavActive(navTarget) {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    const isActive = navTarget && btn.dataset.nav === navTarget;
    btn.classList.toggle('nav-tab--active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

/** Show or hide the bottom nav bar. */
function _toggleNav(visible) {
  const nav = document.getElementById('bottom-nav');
  if (nav) {
    nav.classList.toggle('nav--hidden', !visible);
  }
}

/** Render a minimal fallback if a screen's render function throws. */
function _renderErrorState(screenName, err) {
  const el = document.getElementById(`screen-${screenName}`);
  if (!el) return;
  el.innerHTML = `
    <div class="error-state">
      <p class="error-state__msg">Something went wrong loading this screen.</p>
      <button class="btn btn--secondary" onclick="navigate('dashboard')">
        Back to Home
      </button>
    </div>
  `;
}


/* ─────────────────────────────────────────────────────────────────
   HISTORY API
───────────────────────────────────────────────────────────────── */

function _pushHistory(screenName, params = {}) {
  const state = { screen: screenName, params };
  const url = _buildUrl(screenName, params);

  if (params.replace) {
    history.replaceState(state, '', url);
  } else {
    history.pushState(state, '', url);
  }
}

function _buildUrl(screenName, params = {}) {
  const base = window.location.pathname.replace(/\/[^/]+$/, '/');
  switch (screenName) {
    case 'person':
      return `${base}?view=person&id=${encodeURIComponent(params.personId || '')}`;
    case 'log':
      return params.logContext?.personId
        ? `${base}?view=log&for=${encodeURIComponent(params.logContext.personId)}`
        : `${base}?view=log`;
    case 'dashboard':
    case 'onboarding':
      return base;
    default:
      return `${base}?view=${encodeURIComponent(screenName)}`;
  }
}

/** Handle back/forward browser navigation. */
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.screen) {
    // Re-navigate without pushing a new history entry
    navigate(e.state.screen, { ...e.state.params, replace: true });
  } else {
    // Fallback: go home
    navigate('dashboard', { replace: true });
  }
});


/* ─────────────────────────────────────────────────────────────────
   EVENT DELEGATION — GLOBAL CLICK HANDLER
   Screens can use data-action attributes instead of inline handlers.
───────────────────────────────────────────────────────────────── */

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  const personId = target.dataset.personId;
  const logType = target.dataset.logType;

  switch (action) {
    // ── Navigation shortcuts ──────────────────
    case 'go-dashboard':
      navigate('dashboard');
      break;

    case 'go-person':
      if (personId) navigate('person', { personId });
      break;

    case 'go-log':
      navigate('log', {
        logContext: { personId: personId || null, type: logType || 'general' },
      });
      break;

    case 'go-profile':
      navigate('profile');
      break;

    case 'go-back':
      // Attempt browser back; fallback to dashboard
      if (history.length > 1) {
        history.back();
      } else {
        navigate('dashboard');
      }
      break;

    // ── Onboarding complete ───────────────────
    case 'onboarding-complete':
      navigate('dashboard', { replace: true });
      break;

    // ── Log entry submitted ───────────────────
    case 'log-saved':
      // Return to the person detail page or dashboard
      if (AppState.logContext?.personId) {
        navigate('person', { personId: AppState.logContext.personId });
      } else {
        navigate('dashboard');
      }
      break;

    // ── Person status change ──────────────────
    case 'person-status-changed':
      renderApp(); // Re-render current screen in place
      break;

    default:
      // Unknown actions are silently ignored;
      // screens handle their own specific actions internally.
      break;
  }
});

/** Bottom-nav tab clicks. */
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.nav-tab[data-nav]');
  if (!tab) return;

  const target = tab.dataset.nav;

  switch (target) {
    case 'dashboard':
      navigate('dashboard');
      break;
    case 'log':
      navigate('log', { logContext: { personId: null, type: 'general' } });
      break;
    case 'profile':
      navigate('profile');
      break;
    case 'settings':
      navigate('settings');
      break;
  }
});


/* ─────────────────────────────────────────────────────────────────
   APP INITIALISATION
───────────────────────────────────────────────────────────────── */

function initApp() {
  // Determine whether this is a first run.
  // DB.hasPeople() is provided by data.js; falls back gracefully.
  const hasPeople = typeof DB !== 'undefined' && typeof DB.hasPeople === 'function'
    ? DB.hasPeople()
    : false;

  const isFirstRun = !hasPeople;
  updateState({ isFirstRun });

  // Check URL params — support direct deep-link on reload
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view');
  const idParam = urlParams.get('id');

  if (isFirstRun) {
    // First time: onboarding, replace so back-button doesn't loop
    navigate('onboarding', { replace: true });
    return;
  }

  if (viewParam === 'person' && idParam) {
    navigate('person', { personId: idParam, replace: true });
    return;
  }

  if (viewParam === 'log') {
    const forParam = urlParams.get('for');
    navigate('log', {
      replace: true,
      logContext: { personId: forParam || null, type: 'general' },
    });
    return;
  }

  if (viewParam === 'profile') {
    navigate('profile', { replace: true });
    return;
  }

  // Default: go to dashboard
  navigate('dashboard', { replace: true });
}

// Boot once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}


/* ─────────────────────────────────────────────────────────────────
   PUBLIC API
   Expose helpers that screen modules may call.
───────────────────────────────────────────────────────────────── */
window.navigate = navigate;
window.renderApp = renderApp;
window.updateState = updateState;
