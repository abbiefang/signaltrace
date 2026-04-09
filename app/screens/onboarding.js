/**
 * SignalTrace — Onboarding Screen
 *
 * 3-step flow:
 *   Step 1 — Welcome            (value props, CTA → step 2)
 *   Step 2 — Add first person   (name + platform, minimal)
 *   Step 3 — Log first event    (date + type + who initiated + mood)
 *
 * Renders into #screen-onboarding.
 * Uses addPerson() and addInteraction() from data.js (globals).
 * Calls navigate('dashboard') on completion or skip.
 *
 * No external deps. No framework. Pure DOM.
 */

(function () {

  // ── State ──────────────────────────────────────────────────────────────────
  let _step = 1;
  const TOTAL = 3;

  // Collected across steps — written on final submit
  const _form = {
    name: '',
    platform: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'text',
    initiatedBy: 'them',
    mood: 'neutral',
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('ob-styles')) return;

    const css = `
      /* ── Layout ─────────────────────────────────── */
      #screen-onboarding {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: #12101c;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        /* hidden by default — shown by app.js navigate() */
      }

      .ob-wrap {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-width: 430px;
        margin: 0 auto;
        width: 100%;
      }

      /* ── Header: progress bar + skip ────────────── */
      .ob-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 56px 24px 16px;
        flex-shrink: 0;
      }

      .ob-progress {
        display: flex;
        gap: 6px;
        align-items: center;
        flex: 1;
      }

      .ob-progress-seg {
        height: 3px;
        border-radius: 2px;
        flex: 1;
        background: #2d2840;
        transition: background 0.35s ease;
      }

      .ob-progress-seg.done {
        background: #e94560;
      }

      .ob-skip {
        background: none;
        border: none;
        color: #8b87a8;
        font-size: 14px;
        font-family: inherit;
        cursor: pointer;
        padding: 4px 0 4px 20px;
        letter-spacing: 0.01em;
        flex-shrink: 0;
        transition: color 0.2s;
      }

      .ob-skip:hover { color: #f0eeff; }

      /* ── Viewport + slides ───────────────────────── */
      .ob-viewport {
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .ob-slides {
        display: flex;
        height: 100%;
        /* translateX set inline; transition applied via .ob-slides--animating */
        will-change: transform;
      }

      .ob-slides--animating {
        transition: transform 0.38s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .ob-slide {
        min-width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 8px 24px 0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      /* ── Typography ─────────────────────────────── */
      .ob-eyebrow {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #e94560;
        margin: 0 0 14px;
      }

      .ob-title {
        font-size: 30px;
        font-weight: 700;
        color: #f0eeff;
        line-height: 1.15;
        margin: 0 0 12px;
        letter-spacing: -0.02em;
      }

      .ob-subtitle {
        font-size: 16px;
        color: #8b87a8;
        line-height: 1.55;
        margin: 0 0 36px;
        font-weight: 400;
      }

      /* ── Value props (step 1) ────────────────────── */
      .ob-props {
        display: flex;
        flex-direction: column;
        gap: 18px;
        margin-bottom: 40px;
      }

      .ob-prop {
        display: flex;
        align-items: flex-start;
        gap: 14px;
      }

      .ob-prop-icon {
        font-size: 20px;
        line-height: 1;
        margin-top: 1px;
        flex-shrink: 0;
        width: 28px;
        text-align: center;
      }

      .ob-prop-text {
        font-size: 15px;
        color: #c8c3e0;
        line-height: 1.5;
      }

      /* ── Form elements ───────────────────────────── */
      .ob-field {
        margin-bottom: 20px;
      }

      .ob-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #6b6789;
        margin-bottom: 8px;
      }

      .ob-input {
        width: 100%;
        box-sizing: border-box;
        background: #1e1b2e;
        border: 1px solid #2d2840;
        border-radius: 10px;
        color: #f0eeff;
        font-size: 16px;
        font-family: inherit;
        padding: 14px 16px;
        outline: none;
        transition: border-color 0.2s;
        -webkit-appearance: none;
      }

      .ob-input::placeholder { color: #4a4567; }

      .ob-input:focus {
        border-color: #e94560;
      }

      /* ── Chip selectors ──────────────────────────── */
      .ob-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .ob-chip {
        background: #1e1b2e;
        border: 1px solid #2d2840;
        border-radius: 20px;
        color: #8b87a8;
        font-size: 14px;
        font-family: inherit;
        padding: 8px 16px;
        cursor: pointer;
        transition: all 0.18s ease;
        white-space: nowrap;
        -webkit-appearance: none;
      }

      .ob-chip:hover {
        border-color: #4a4567;
        color: #c8c3e0;
      }

      .ob-chip.selected {
        background: rgba(233, 69, 96, 0.15);
        border-color: #e94560;
        color: #f0eeff;
      }

      /* ── Mood row ────────────────────────────────── */
      .ob-mood-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .ob-mood-btn {
        background: #1e1b2e;
        border: 1px solid #2d2840;
        border-radius: 10px;
        color: #8b87a8;
        font-size: 13px;
        font-family: inherit;
        padding: 12px 8px;
        cursor: pointer;
        transition: all 0.18s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        -webkit-appearance: none;
      }

      .ob-mood-btn .mood-icon { font-size: 20px; }

      .ob-mood-btn:hover {
        border-color: #4a4567;
        color: #c8c3e0;
      }

      .ob-mood-btn.selected {
        background: rgba(233, 69, 96, 0.15);
        border-color: #e94560;
        color: #f0eeff;
      }

      /* ── Optional label ──────────────────────────── */
      .ob-optional {
        font-size: 11px;
        color: #4a4567;
        font-weight: 400;
        letter-spacing: 0;
        text-transform: none;
      }

      /* ── CTA button ──────────────────────────────── */
      .ob-cta-wrap {
        padding: 20px 24px 40px;
        flex-shrink: 0;
      }

      .ob-cta {
        display: block;
        width: 100%;
        background: #e94560;
        color: #fff;
        border: none;
        border-radius: 14px;
        font-size: 16px;
        font-weight: 600;
        font-family: inherit;
        padding: 17px 24px;
        cursor: pointer;
        transition: opacity 0.2s, transform 0.1s;
        letter-spacing: 0.01em;
        -webkit-appearance: none;
      }

      .ob-cta:hover { opacity: 0.9; }
      .ob-cta:active { transform: scale(0.98); }

      .ob-cta-secondary {
        background: transparent;
        border: 1px solid #2d2840;
        color: #8b87a8;
        margin-top: 10px;
      }

      .ob-cta-secondary:hover {
        border-color: #4a4567;
        color: #c8c3e0;
        opacity: 1;
      }

      /* ── Date input fix ──────────────────────────── */
      input[type="date"].ob-input::-webkit-calendar-picker-indicator {
        filter: invert(0.4);
        cursor: pointer;
      }
    `;

    const el = document.createElement('style');
    el.id = 'ob-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ── Slide Templates ────────────────────────────────────────────────────────

  function _slide1() {
    return `
      <div class="ob-slide" id="ob-slide-1" role="tabpanel" aria-label="Step 1 of 3">
        <p class="ob-eyebrow">SignalTrace</p>
        <h1 class="ob-title">Track what actually<br>happens.</h1>
        <p class="ob-subtitle">See the patterns. Trust yourself.</p>

        <div class="ob-props">
          <div class="ob-prop">
            <span class="ob-prop-icon" aria-hidden="true">📝</span>
            <span class="ob-prop-text">Log interactions as they happen — not after you've already made up your mind.</span>
          </div>
          <div class="ob-prop">
            <span class="ob-prop-icon" aria-hidden="true">📊</span>
            <span class="ob-prop-text">Spot patterns before they become problems. Initiation gaps. Response times. Consistency.</span>
          </div>
          <div class="ob-prop">
            <span class="ob-prop-icon" aria-hidden="true">🔍</span>
            <span class="ob-prop-text">Data, not feelings. Clarity, not confusion. This is just for you.</span>
          </div>
        </div>
      </div>
    `;
  }

  function _slide2() {
    const platforms = ['Hinge', 'Bumble', 'Tinder', 'IRL', 'Instagram', 'Other'];
    return `
      <div class="ob-slide" id="ob-slide-2" role="tabpanel" aria-label="Step 2 of 3">
        <h2 class="ob-title">Who are you keeping<br>an eye on?</h2>
        <p class="ob-subtitle">Start with one person. You can add more later.</p>

        <div class="ob-field">
          <label class="ob-label" for="ob-name">Name or nickname</label>
          <input
            class="ob-input"
            type="text"
            id="ob-name"
            name="name"
            placeholder="His name, her name, their name…"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            maxlength="60"
            value="${_esc(_form.name)}"
          />
        </div>

        <div class="ob-field">
          <label class="ob-label">Where did you meet? <span class="ob-optional">(optional)</span></label>
          <div class="ob-chips" role="group" aria-label="Platform">
            ${platforms.map(p => `
              <button
                class="ob-chip${_form.platform === p ? ' selected' : ''}"
                type="button"
                data-chip-group="platform"
                data-value="${p}"
                aria-pressed="${_form.platform === p}"
              >${p}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function _slide3() {
    const today = new Date().toISOString().slice(0, 10);
    const types = [
      { value: 'text',       label: 'Text' },
      { value: 'call',       label: 'Call' },
      { value: 'date',       label: 'Date' },
      { value: 'social',     label: 'Social' },
      { value: 'voice_note', label: 'Voice note' },
    ];
    const initiators = [
      { value: 'them',   label: 'They did' },
      { value: 'me',     label: 'I did' },
      { value: 'mutual', label: 'Mutual' },
    ];
    const moods = [
      { value: 'positive', label: 'Good',    icon: '✦' },
      { value: 'neutral',  label: 'Neutral', icon: '—' },
      { value: 'negative', label: 'Off',     icon: '↓' },
    ];

    return `
      <div class="ob-slide" id="ob-slide-3" role="tabpanel" aria-label="Step 3 of 3">
        <h2 class="ob-title">What's the last thing<br>that happened?</h2>
        <p class="ob-subtitle">Be honest. This is just for you.</p>

        <div class="ob-field">
          <label class="ob-label" for="ob-date">When</label>
          <input
            class="ob-input"
            type="date"
            id="ob-date"
            name="date"
            value="${_form.date || today}"
            max="${today}"
          />
        </div>

        <div class="ob-field">
          <label class="ob-label">What kind of interaction</label>
          <div class="ob-chips" role="group" aria-label="Interaction type">
            ${types.map(t => `
              <button
                class="ob-chip${_form.type === t.value ? ' selected' : ''}"
                type="button"
                data-chip-group="type"
                data-value="${t.value}"
                aria-pressed="${_form.type === t.value}"
              >${t.label}</button>
            `).join('')}
          </div>
        </div>

        <div class="ob-field">
          <label class="ob-label">Who initiated <span class="ob-optional">(optional)</span></label>
          <div class="ob-chips" role="group" aria-label="Initiated by">
            ${initiators.map(i => `
              <button
                class="ob-chip${_form.initiatedBy === i.value ? ' selected' : ''}"
                type="button"
                data-chip-group="initiatedBy"
                data-value="${i.value}"
                aria-pressed="${_form.initiatedBy === i.value}"
              >${i.label}</button>
            `).join('')}
          </div>
        </div>

        <div class="ob-field">
          <label class="ob-label">How did it feel <span class="ob-optional">(optional)</span></label>
          <div class="ob-mood-row" role="group" aria-label="Mood">
            ${moods.map(m => `
              <button
                class="ob-mood-btn${_form.mood === m.value ? ' selected' : ''}"
                type="button"
                data-chip-group="mood"
                data-value="${m.value}"
                aria-pressed="${_form.mood === m.value}"
              >
                <span class="mood-icon" aria-hidden="true">${m.icon}</span>
                <span>${m.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  function renderOnboarding() {
    _injectStyles();

    const root = document.getElementById('screen-onboarding');
    if (!root) return;

    root.innerHTML = `
      <div class="ob-wrap">

        <header class="ob-header" aria-label="Onboarding progress">
          <div class="ob-progress" role="progressbar"
               aria-valuenow="${_step}" aria-valuemin="1" aria-valuemax="${TOTAL}"
               aria-label="Step ${_step} of ${TOTAL}">
            ${[1, 2, 3].map(i => `
              <div class="ob-progress-seg${i <= _step ? ' done' : ''}"
                   aria-hidden="true"></div>
            `).join('')}
          </div>
          <button class="ob-skip" type="button" id="ob-skip">Skip</button>
        </header>

        <div class="ob-viewport" aria-live="polite" aria-atomic="true">
          <div class="ob-slides" id="ob-slides"
               style="transform: translateX(-${(_step - 1) * 100}%)">
            ${_slide1()}
            ${_slide2()}
            ${_slide3()}
          </div>
        </div>

        <div class="ob-cta-wrap" id="ob-cta-wrap">
          ${_ctaForStep(_step)}
        </div>

      </div>
    `;

    _attachEvents(root);
  }

  function _ctaForStep(step) {
    if (step === 1) {
      return `<button class="ob-cta" type="button" id="ob-next">Let's start →</button>`;
    }
    if (step === 2) {
      return `
        <button class="ob-cta" type="button" id="ob-next">Add them →</button>
        <button class="ob-cta ob-cta-secondary" type="button" id="ob-skip-step">Skip for now</button>
      `;
    }
    if (step === 3) {
      return `
        <button class="ob-cta" type="button" id="ob-done">Done</button>
        <button class="ob-cta ob-cta-secondary" type="button" id="ob-skip-step">Skip for now</button>
      `;
    }
    return '';
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  function _attachEvents(root) {
    // Chip selection (platform, type, initiatedBy, mood)
    root.addEventListener('click', function (e) {
      const chip = e.target.closest('[data-chip-group]');
      if (chip) {
        const group = chip.dataset.chipGroup;
        const value = chip.dataset.value;
        _form[group] = value;

        // Update aria-pressed + selected class within that group
        root.querySelectorAll(`[data-chip-group="${group}"]`).forEach(btn => {
          const isSelected = btn.dataset.value === value;
          btn.classList.toggle('selected', isSelected);
          btn.setAttribute('aria-pressed', isSelected);
        });
        return;
      }

      // Skip entire onboarding
      if (e.target.closest('#ob-skip')) {
        _finish(true);
        return;
      }

      // Skip current step (step 2 or 3 only)
      if (e.target.closest('#ob-skip-step')) {
        _goToStep(_step + 1, true);
        return;
      }

      // Next / Done
      if (e.target.closest('#ob-next')) {
        _handleNext();
        return;
      }

      if (e.target.closest('#ob-done')) {
        _handleDone();
        return;
      }
    });

    // Sync name field on input
    root.addEventListener('input', function (e) {
      if (e.target.id === 'ob-name') {
        _form.name = e.target.value;
      }
      if (e.target.id === 'ob-date') {
        _form.date = e.target.value;
      }
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function _handleNext() {
    if (_step === 1) {
      _goToStep(2);
      return;
    }
    if (_step === 2) {
      // Name is optional — no hard validation. Just proceed.
      _goToStep(3);
      return;
    }
  }

  function _handleDone() {
    _finish(false);
  }

  function _goToStep(next, skipData) {
    if (next > TOTAL) {
      _finish(false);
      return;
    }

    _step = next;

    // Animate slide
    const slides = document.getElementById('ob-slides');
    if (slides) {
      slides.classList.add('ob-slides--animating');
      slides.style.transform = `translateX(-${(_step - 1) * 100}%)`;
      slides.addEventListener('transitionend', function once() {
        slides.classList.remove('ob-slides--animating');
        slides.removeEventListener('transitionend', once);
      });
    }

    // Update progress bar
    document.querySelectorAll('.ob-progress-seg').forEach((seg, i) => {
      seg.classList.toggle('done', i < _step);
    });

    // Update CTA area
    const ctaWrap = document.getElementById('ob-cta-wrap');
    if (ctaWrap) {
      ctaWrap.innerHTML = _ctaForStep(_step);
    }

    // Re-attach listeners for new CTA buttons
    const root = document.getElementById('screen-onboarding');
    if (root) _attachEvents(root);

    // Focus heading of new step for accessibility
    const slide = document.getElementById(`ob-slide-${_step}`);
    if (slide) {
      const heading = slide.querySelector('h1, h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      }
    }

    // Auto-focus name field on step 2
    if (_step === 2) {
      setTimeout(() => {
        const nameInput = document.getElementById('ob-name');
        if (nameInput) nameInput.focus();
      }, 380); // after slide animation
    }
  }

  // ── Finish ─────────────────────────────────────────────────────────────────

  function _finish(skipped) {
    let personId = null;

    if (!skipped && _form.name.trim()) {
      // Save person
      const person = addPerson({
        name: _form.name.trim(),
        platform: _form.platform,
      });
      personId = person.id;

      // Save interaction if we have a person and reached step 3
      if (_step === 3 && personId) {
        addInteraction({
          personId,
          date: _form.date || new Date().toISOString().slice(0, 10),
          type: _form.type || 'text',
          initiatedBy: _form.initiatedBy || 'mutual',
          mood: _form.mood || 'neutral',
        });
      }
    }

    // Mark onboarding as complete so it doesn't show again
    localStorage.setItem('signaltrace_onboarded', '1');

    // Navigate to dashboard
    if (typeof navigate === 'function') {
      navigate('dashboard');
    } else {
      // Fallback: hide onboarding, show dashboard manually
      const ob = document.getElementById('screen-onboarding');
      const dash = document.getElementById('screen-dashboard');
      const nav = document.getElementById('bottom-nav');
      if (ob)   ob.setAttribute('aria-hidden', 'true');
      if (dash) { dash.setAttribute('aria-hidden', 'false'); dash.removeAttribute('hidden'); }
      if (nav)  nav.removeAttribute('hidden');

      // Re-render dashboard if the function exists
      if (typeof renderDashboard === 'function') renderDashboard();
    }
  }

  // ── Utils ──────────────────────────────────────────────────────────────────

  /** Escape user input for safe insertion into HTML attributes */
  function _esc(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  // Expose renderOnboarding to the global scope so app.js can call it.
  window.renderOnboarding = renderOnboarding;

})();
