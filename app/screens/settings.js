/**
 * SignalTrace — screens/settings.js
 * Settings screen.
 *
 * Renders into: #screen-settings
 *
 * ─── Public API ──────────────────────────────────────────────────────────────
 *   renderSettings()   — render the full settings screen
 *
 * ─── Dependencies (expected as globals) ──────────────────────────────────────
 *   getAllPersons()             ← data.js
 *   getInteractions(personId)  ← data.js
 *   navigate(screen, params)   ← app.js
 *
 * ─── Required: add to index.html ─────────────────────────────────────────────
 *   <div class="screen" id="screen-settings" data-screen="settings"
 *        aria-hidden="true"></div>
 *
 * ─── Required: register in app.js SCREENS object ────────────────────────────
 *   settings: {
 *     render: () => renderSettings(),
 *     navTab: 'settings',
 *     hideNav: false,
 *   },
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────────────────────── */

function renderSettings() {
  const container = document.getElementById('screen-settings');
  if (!container) return;

  container.innerHTML = _buildSettingsHTML();
  _attachSettingsEvents(container);
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATS HELPERS
───────────────────────────────────────────────────────────────────────────── */

function _computeStats() {
  const persons = (typeof getAllPersons === 'function') ? getAllPersons() : [];
  const personCount = persons.length;

  let interactionCount = 0;
  let earliest = null;

  for (const p of persons) {
    const ixs = (typeof getInteractions === 'function') ? getInteractions(p.id) : [];
    interactionCount += ixs.length;
    // Track earliest date across persons and interactions
    const pDate = p.createdAt || p.metDate;
    if (pDate && (!earliest || pDate < earliest)) earliest = pDate;
    for (const ix of ixs) {
      const d = ix.date || ix.createdAt;
      if (d && (!earliest || d < earliest)) earliest = d;
    }
  }

  let daysActive = null;
  if (earliest) {
    const start = new Date(earliest);
    const today = new Date();
    daysActive = Math.max(1, Math.round((today - start) / (1000 * 60 * 60 * 24)));
  }

  return { personCount, interactionCount, daysActive };
}

/* ─────────────────────────────────────────────────────────────────────────────
   HTML BUILDER
───────────────────────────────────────────────────────────────────────────── */

function _buildSettingsHTML() {
  const { personCount, interactionCount, daysActive } = _computeStats();

  const daysLabel = daysActive === null ? '—' : daysActive;

  return /* html */`
<div class="st-root">

  <!-- ── Header ── -->
  <header class="st-header">
    <div class="st-header-title">Settings</div>
  </header>

  <!-- ── Body ── -->
  <div class="st-body">

    <!-- ─── Stats Card ─── -->
    <div class="st-stats-card" role="region" aria-label="Your activity summary">
      <div class="st-stats-card-header">
        <div class="st-stats-card-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div class="st-stats-card-title">Your Activity</div>
      </div>
      <div class="st-stats-grid" role="list">
        <div class="st-stat" role="listitem">
          <div class="st-stat-value">${personCount}</div>
          <div class="st-stat-label">People<br>Tracked</div>
        </div>
        <div class="st-stat" role="listitem" style="border-left: 1px solid var(--color-border-light); border-right: 1px solid var(--color-border-light);">
          <div class="st-stat-value">${interactionCount}</div>
          <div class="st-stat-label">Interactions<br>Logged</div>
        </div>
        <div class="st-stat" role="listitem">
          <div class="st-stat-value">${daysLabel}</div>
          <div class="st-stat-label">Days<br>Active</div>
        </div>
      </div>
    </div>

    <!-- ─── Data section ─── -->
    <div class="st-section">
      <div class="st-section-label">Data</div>
      <div class="st-card">

        <button class="st-row st-row--btn" id="st-export-btn" type="button"
                aria-label="Export my data as JSON file">
          <div class="st-row-left">
            <div class="st-row-badge st-row-badge--green" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 16v1a2 2 0 002 2h8a2 2 0 002-2v-1"/>
                <polyline points="7 10 10 13 13 10"/>
                <line x1="10" y1="4" x2="10" y2="13"/>
              </svg>
            </div>
            <div class="st-row-text">
              <div class="st-row-title">Export my data</div>
              <div class="st-row-desc">Download everything as a JSON file</div>
            </div>
          </div>
          <svg class="st-row-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
               width="16" height="16" aria-hidden="true">
            <polyline points="7 4 13 10 7 16"/>
          </svg>
        </button>

        <button class="st-row st-row--btn st-row--danger" id="st-clear-btn" type="button"
                aria-label="Erase all data — this cannot be undone">
          <div class="st-row-left">
            <div class="st-row-badge st-row-badge--danger" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 19 6"/>
                <path d="M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2"/>
                <path d="M19 6l-1 13a2 2 0 01-2 2H6a2 2 0 01-2-2L3 6"/>
              </svg>
            </div>
            <div class="st-row-text">
              <div class="st-row-title">Erase all data</div>
              <div class="st-row-desc">Permanently removes all people and interactions</div>
            </div>
          </div>
          <svg class="st-row-chevron st-row-chevron--danger" viewBox="0 0 20 20" fill="none"
               stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
               stroke-linejoin="round" width="16" height="16" aria-hidden="true">
            <polyline points="7 4 13 10 7 16"/>
          </svg>
        </button>

      </div>
    </div>

    <!-- ─── Privacy section ─── -->
    <div class="st-section">
      <div class="st-section-label">Privacy</div>
      <div class="st-card">

        <div class="st-row" role="article" aria-label="Local storage — data stays on device">
          <div class="st-row-left">
            <div class="st-row-badge st-row-badge--taupe" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="10" width="14" height="9" rx="1"/>
                <path d="M7 10V7a5 5 0 0110 0v3"/>
              </svg>
            </div>
            <div class="st-row-text">
              <div class="st-row-title">Stored only on this device</div>
              <div class="st-row-desc">Your data never leaves your phone. No cloud, no servers, no account required.</div>
            </div>
          </div>
        </div>

        <div class="st-row" role="article" aria-label="No tracking or analytics">
          <div class="st-row-left">
            <div class="st-row-badge st-row-badge--slate" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="10" cy="10" r="8"/>
                <line x1="4.22" y1="4.22" x2="15.78" y2="15.78"/>
              </svg>
            </div>
            <div class="st-row-text">
              <div class="st-row-title">Zero tracking</div>
              <div class="st-row-desc">No analytics, no ads, no data sharing. Ever.</div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ─── About section ─── -->
    <div class="st-section">
      <div class="st-section-label">About</div>
      <div class="st-card">

        <div class="st-row" role="article">
          <div class="st-row-left">
            <div class="st-row-badge st-row-badge--dark" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="10" cy="10" r="3"/>
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2z" opacity="0.3" fill="currentColor" stroke="none"/>
                <path d="M10 1v2M10 17v2M1 10h2M17 10h2"/>
              </svg>
            </div>
            <div class="st-row-text">
              <div class="st-row-title">SignalTrace</div>
              <div class="st-row-desc">Version 1.0</div>
            </div>
          </div>
          <div class="st-row-value">v1.0</div>
        </div>

      </div>
    </div>

    <!-- ─── Footer ─── -->
    <div class="st-footer" aria-hidden="true">
      <div class="st-footer-logo">SignalTrace</div>
      <div class="st-footer-tagline">Turn messy signals into clear judgment.</div>
    </div>

  </div><!-- /.st-body -->
</div>
  `.trim();
}

/* ─────────────────────────────────────────────────────────────────────────────
   EVENT BINDING
───────────────────────────────────────────────────────────────────────────── */

function _attachSettingsEvents(container) {
  const exportBtn = container.querySelector('#st-export-btn');
  const clearBtn  = container.querySelector('#st-clear-btn');

  if (exportBtn) exportBtn.addEventListener('click', _handleExport);
  if (clearBtn)  clearBtn.addEventListener('click',  _handleClear);
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORT
───────────────────────────────────────────────────────────────────────────── */

function _handleExport() {
  try {
    const persons = (typeof getAllPersons === 'function') ? getAllPersons() : [];

    // Collect all interactions for every tracked person
    const interactions = persons.flatMap(function(p) {
      return (typeof getInteractions === 'function') ? getInteractions(p.id) : [];
    });

    const payload = {
      exportedAt:        new Date().toISOString(),
      version:           '1.0',
      personCount:       persons.length,
      interactionCount:  interactions.length,
      persons,
      interactions,
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);

    const a      = document.createElement('a');
    a.href       = url;
    a.download   = 'signaltrace-' + new Date().toISOString().slice(0, 10) + '.json';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Revoke after short delay to ensure download starts
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);

    _showToast('✓ Export saved to your downloads');
  } catch (err) {
    console.error('[SignalTrace/settings] Export failed:', err);
    _showToast('Export failed — please try again.');
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   CLEAR ALL DATA
───────────────────────────────────────────────────────────────────────────── */

function _handleClear() {
  const { personCount, interactionCount } = _computeStats();

  // Build a meaningful summary for the confirmation dialog
  const summaryParts = [];
  if (personCount > 0) {
    summaryParts.push(personCount + (personCount === 1 ? ' person' : ' people'));
  }
  if (interactionCount > 0) {
    summaryParts.push(interactionCount + (interactionCount === 1 ? ' interaction' : ' interactions'));
  }
  const summaryText = summaryParts.length > 0
    ? 'This will permanently delete ' + summaryParts.join(' and ') + '. There is no undo.'
    : 'This will permanently delete all your data. There is no undo.';

  const overlay = document.createElement('div');
  overlay.className = 'prf-dialog-overlay';
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'st-dialog-title');
  overlay.setAttribute('aria-describedby', 'st-dialog-body');

  overlay.innerHTML = /* html */`
    <div class="prf-dialog">
      <h3 class="prf-dialog-title" id="st-dialog-title">Erase all data?</h3>
      <p class="prf-dialog-body" id="st-dialog-body">${summaryText}</p>
      <div class="prf-dialog-actions">
        <button class="prf-dialog-cancel" type="button">Cancel</button>
        <button class="prf-dialog-confirm" type="button">Erase everything</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Focus confirm so accidental taps don't immediately dismiss
  const cancelBtn  = overlay.querySelector('.prf-dialog-cancel');
  const confirmBtn = overlay.querySelector('.prf-dialog-confirm');
  if (cancelBtn) cancelBtn.focus();

  cancelBtn.addEventListener('click', function() { overlay.remove(); });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });

  confirmBtn.addEventListener('click', function() {
    overlay.remove();
    try {
      localStorage.removeItem('signaltrace_persons');
      localStorage.removeItem('signaltrace_interactions');
      localStorage.removeItem('signaltrace_onboarded');
    } catch (err) {
      console.error('[SignalTrace/settings] Clear failed:', err);
    }
    // Send user back to onboarding (fresh start)
    if (typeof navigate === 'function') {
      navigate('onboarding', { replace: true });
    }
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   TOAST HELPER
───────────────────────────────────────────────────────────────────────────── */

function _showToast(message) {
  // Remove any existing toast first
  var existing = document.querySelector('.st-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'st-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.cssText = [
    'position: fixed',
    'bottom: 96px',
    'left: 50%',
    'transform: translateX(-50%)',
    'background: rgba(43,43,43,0.92)',
    'color: rgba(255,255,255,0.95)',
    'font-size: 13px',
    'font-family: var(--font-family, inherit)',
    'font-weight: 500',
    'padding: 10px 18px',
    'border-radius: 10px',
    'border: 1px solid rgba(255,255,255,0.12)',
    'box-shadow: 0 4px 24px rgba(0,0,0,0.2)',
    'z-index: 2000',
    'white-space: nowrap',
    'animation: st-fadein 0.2s ease',
    'pointer-events: none',
  ].join(';');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(function() { toast.remove(); }, 300);
  }, 2500);
}

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL REGISTRATION
───────────────────────────────────────────────────────────────────────────── */
window.renderSettings = renderSettings;
