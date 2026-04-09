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

  // Styles now in styles.css (mobile app redesign)
  // _ensureSettingsStyles();
  container.innerHTML = _buildSettingsHTML();
  _attachSettingsEvents(container);
}

/* ─────────────────────────────────────────────────────────────────────────────
   HTML BUILDER
───────────────────────────────────────────────────────────────────────────── */

function _buildSettingsHTML() {
  return /* html */`
<div class="st-root">

  <!-- ── Header ── -->
  <header class="st-header">
    <div class="st-header-title">Settings</div>
  </header>

  <!-- ── Body ── -->
  <div class="st-body">

    <!-- ─── Data section ─── -->
    <div class="st-section">
      <div class="st-section-label">Data</div>

      <button class="st-row st-row--btn" id="st-export-btn" type="button">
        <div class="st-row-left">
          <span class="st-row-icon" aria-hidden="true">📥</span>
          <div class="st-row-text">
            <div class="st-row-title">Export my data</div>
            <div class="st-row-desc">Download all people &amp; interactions as JSON</div>
          </div>
        </div>
        <svg class="st-row-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor"
             stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
             width="16" height="16" aria-hidden="true">
          <polyline points="7 4 13 10 7 16"/>
        </svg>
      </button>

      <button class="st-row st-row--btn st-row--danger" id="st-clear-btn" type="button">
        <div class="st-row-left">
          <span class="st-row-icon" aria-hidden="true">🗑️</span>
          <div class="st-row-text">
            <div class="st-row-title">Clear all data</div>
            <div class="st-row-desc">Permanently remove all people and interactions</div>
          </div>
        </div>
        <svg class="st-row-chevron st-row-chevron--danger" viewBox="0 0 20 20" fill="none"
             stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
             stroke-linejoin="round" width="16" height="16" aria-hidden="true">
          <polyline points="7 4 13 10 7 16"/>
        </svg>
      </button>
    </div>

    <!-- ─── About section ─── -->
    <div class="st-section">
      <div class="st-section-label">About</div>

      <div class="st-row">
        <div class="st-row-left">
          <span class="st-row-icon" aria-hidden="true">📡</span>
          <div class="st-row-text">
            <div class="st-row-title">SignalTrace</div>
            <div class="st-row-desc">Version 1.0 · Turn messy signals into clear judgment</div>
          </div>
        </div>
      </div>

      <div class="st-row">
        <div class="st-row-left">
          <span class="st-row-icon" aria-hidden="true">🔒</span>
          <div class="st-row-text">
            <div class="st-row-title">Privacy</div>
            <div class="st-row-desc">All data is stored locally on your device. Nothing is sent to any server.</div>
          </div>
        </div>
      </div>
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
    const interactions = persons.flatMap(p =>
      (typeof getInteractions === 'function') ? getInteractions(p.id) : []
    );

    const payload = {
      exportedAt:   new Date().toISOString(),
      version:      '1.0',
      personCount:  persons.length,
      persons,
      interactions,
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);

    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `signaltrace-${new Date().toISOString().slice(0, 10)}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[SignalTrace/settings] Export failed:', err);
    _showToast('Export failed — please try again.');
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   CLEAR ALL DATA
───────────────────────────────────────────────────────────────────────────── */

function _handleClear() {
  const overlay = document.createElement('div');
  overlay.className = 'prf-dialog-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'st-dialog-title');

  overlay.innerHTML = /* html */`
    <div class="prf-dialog">
      <h3 class="prf-dialog-title" id="st-dialog-title">Clear all data?</h3>
      <p class="prf-dialog-body">
        This will permanently delete every person and every logged interaction.
        There is no undo.
      </p>
      <div class="prf-dialog-actions">
        <button class="prf-dialog-cancel" type="button">Cancel</button>
        <button class="prf-dialog-confirm" type="button">Delete everything</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('.prf-dialog-confirm').focus();

  overlay.querySelector('.prf-dialog-cancel').addEventListener('click', () => {
    overlay.remove();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('.prf-dialog-confirm').addEventListener('click', () => {
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
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 96px; left: 50%; transform: translateX(-50%);
    background: rgba(43,43,43,0.92); color: rgba(255,255,255,0.92);
    font-size: 13px; font-family: inherit; font-weight: 500;
    padding: 10px 18px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
    z-index: 2000; white-space: nowrap;
    animation: st-fadein 0.2s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────────────────────── */

function _ensureSettingsStyles() {
  if (document.getElementById('st-styles')) return;

  const style = document.createElement('style');
  style.id = 'st-styles';
  style.textContent = /* css */`

/* ── Root ── */
.st-root {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--color-bg, #FAFAF9);
  color: var(--color-text, #2B2B2B);
  font-family: var(--font-base, 'Inter', -apple-system, 'Helvetica Neue', sans-serif);
  -webkit-font-smoothing: antialiased;
}

/* ── Header ── */
.st-header {
  display: flex;
  align-items: center;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #EEEEEE;
}

.st-header-title {
  font-size: 20px;
  font-weight: 800;
  color: #2B2B2B;
  letter-spacing: -0.5px;
}

/* ── Body ── */
.st-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px 0 100px;
}

/* ── Section ── */
.st-section {
  padding: 16px 0 4px;
}

.st-section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: #AAAAAA;
  padding: 0 16px 8px;
}

/* ── Row ── */
.st-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  gap: 12px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  background: none;
  border-left: none;
  border-right: none;
  border-top: none;
  color: inherit;
  font-family: inherit;
  width: 100%;
  text-align: left;
  cursor: default;
}

.st-row--btn {
  cursor: pointer;
  transition: background 0.12s;
}

.st-row--btn:hover {
  background: rgba(0,0,0,0.03);
}

.st-row--btn:active {
  background: rgba(0,0,0,0.06);
}

.st-row-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.st-row-icon {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 1px;
}

.st-row-text {
  flex: 1;
  min-width: 0;
}

.st-row-title {
  font-size: 14px;
  font-weight: 500;
  color: #2B2B2B;
  line-height: 1.4;
}

.st-row--danger .st-row-title {
  color: #C17C7C;
}

.st-row-desc {
  font-size: 12px;
  color: #888888;
  line-height: 1.5;
  margin-top: 2px;
}

.st-row-chevron {
  flex-shrink: 0;
  color: #CCCCCC;
}

.st-row-chevron--danger {
  color: rgba(193,124,124,0.5);
}

@keyframes st-fadein {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0);   }
}

  `.trim();

  document.head.appendChild(style);
}

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL REGISTRATION
───────────────────────────────────────────────────────────────────────────── */
window.renderSettings = renderSettings;
