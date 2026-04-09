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
        background: #FBF8F5;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .ob-wrap {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-width: 430px;
        margin: 0 auto;
        width: 100%;
      }

      /* ── Header: dot progress + skip ────────────── */
      .ob-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 56px 24px 16px;
        flex-shrink: 0;
      }

      .ob-progress {
        display: flex;
        gap: 8px;
        align-items: center;
        flex: 1;
      }

      /* Dot-style progress indicators */
      .ob-progress-seg {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex: none;
        background: #E0D8D0;
        transition: background 0.35s ease, transform 0.35s ease, width 0.35s ease;
      }

      .ob-progress-seg.done {
        background: linear-gradient(135deg, #D4607A, #E8855A);
        width: 24px;
        border-radius: 4px;
      }

      .ob-skip {
        background: none;
        border: none;
        color: #B0A89E;
        font-size: 14px;
        font-family: inherit;
        cursor: pointer;
        padding: 4px 0 4px 20px;
        letter-spacing: 0.01em;
        flex-shrink: 0;
        transition: color 0.2s;
      }

      .ob-skip:hover { color: #7A6E68; }

      /* ── Slide 1 hero area ───────────────────────── */
      .ob-hero {
        width: 100%;
        height: 160px;
        border-radius: 20px;
        background: linear-gradient(135deg, #FCEEF1 0%, #FEF3EC 50%, #EEF2FC 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 28px;
        flex-shrink: 0;
        position: relative;
        overflow: hidden;
      }

      .ob-hero-icon {
        font-size: 52px;
        line-height: 1;
        filter: drop-shadow(0 4px 12px rgba(212,96,122,0.20));
      }

      .ob-hero::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 30% 50%, rgba(212,96,122,0.12) 0%, transparent 60%),
                    radial-gradient(circle at 70% 50%, rgba(232,133,90,0.10) 0%, transparent 60%);
      }

      /* ── Viewport + slides ───────────────────────── */
      .ob-viewport {
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .ob-slides {
        display: flex;
        height: 100%;
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
        color: #D4607A;
        margin: 0 0 14px;
      }

      .ob-title {
        font-size: 30px;
        font-weight: 700;
        color: #1C1410;
        line-height: 1.15;
        margin: 0 0 12px;
        letter-spacing: -0.02em;
      }

      .ob-subtitle {
        font-size: 16px;
        color: #7A6E68;
        line-height: 1.55;
        margin: 0 0 28px;
        font-weight: 400;
      }

      /* ── Value props (step 1) ────────────────────── */
      .ob-props {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 32px;
      }

      .ob-prop {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        background: #FFFFFF;
        border: 1px solid #EDE6DF;
        border-radius: 14px;
        padding: 14px 16px;
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
        font-size: 14px;
        color: #4A3E38;
        line-height: 1.55;
      }

      /* ── Form elements ───────────────────────────── */
      .ob-field {
        margin-bottom: 20px;
      }

      .ob-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: #B0A89E;
        margin-bottom: 8px;
      }

      .ob-input {
        width: 100%;
        box-sizing: border-box;
        background: #FFFFFF;
        border: 1px solid #EDE6DF;
        border-radius: 12px;
        color: #1C1410;
        font-size: 16px;
        font-family: inherit;
        padding: 14px 16px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        -webkit-appearance: none;
      }

      .ob-input::placeholder { color: #C8BDB4; }

      .ob-input:focus {
        border-color: #D4607A;
        box-shadow: 0 0 0 3px rgba(212,96,122,0.12);
      }

      /* ── Chip selectors ──────────────────────────── */
      .ob-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .ob-chip {
        background: #FFFFFF;
        border: 1px solid #EDE6DF;
        border-radius: 999px;
        color: #7A6E68;
        font-size: 14px;
        font-family: inherit;
        padding: 8px 18px;
        cursor: pointer;
        transition: all 0.18s ease;
        white-space: nowrap;
        -webkit-appearance: none;
      }

      .ob-chip:hover {
        border-color: #C8BDB4;
        color: #1C1410;
      }

      .ob-chip.selected {
        background: linear-gradient(135deg, #D4607A, #E8855A);
        border-color: transparent;
        color: #fff;
        font-weight: 600;
      }

      /* ── Mood row ────────────────────────────────── */
      .ob-mood-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .ob-mood-btn {
        background: #FFFFFF;
        border: 1px solid #EDE6DF;
        border-radius: 14px;
        color: #7A6E68;
        font-size: 13px;
        font-family: inherit;
        padding: 14px 8px;
        cursor: pointer;
        transition: all 0.18s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        -webkit-appearance: none;
      }

      .ob-mood-btn .mood-icon { font-size: 26px; }

      .ob-mood-btn:hover {
        border-color: #C8BDB4;
        color: #1C1410;
      }

      .ob-mood-btn.selected {
        background: rgba(212,96,122,0.08);
        border-color: #D4607A;
        color: #D4607A;
        font-weight: 600;
      }

      /* ── Optional label ──────────────────────────── */
      .ob-optional {
        font-size: 11px;
        color: #C8BDB4;
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
        background: linear-gradient(135deg, #D4607A 0%, #E8855A 100%);
        color: #fff;
        border: none;
        border-radius: 16px;
        font-size: 16px;
        font-weight: 600;
        font-family: inherit;
        padding: 17px 24px;
        cursor: pointer;
        transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
        letter-spacing: 0.01em;
        box-shadow: 0 4px 16px rgba(212,96,122,0.30);
        -webkit-appearance: none;
      }

      .ob-cta:hover { box-shadow: 0 6px 22px rgba(212,96,122,0.40); opacity: 0.95; }
      .ob-cta:active { transform: scale(0.98); }

      .ob-cta-secondary {
        background: transparent;
        border: 1px solid #EDE6DF;
        color: #B0A89E;
        margin-top: 10px;
        box-shadow: none;
      }

      .ob-cta-secondary:hover {
        border-color: #C8BDB4;
        color: #7A6E68;
        opacity: 1;
        box-shadow: none;
      }

      /* ── Date input fix ──────────────────────────── */
      input[type="date"].ob-input::-webkit-calendar-picker-indicator {
        opacity: 0.4;
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

        <!-- Hero illustration area -->
        <div class="ob-hero" aria-hidden="true">
          <span class="ob-hero-icon">📡</span>
        </div>

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
      // skipData=true means "Skip for now" on this step — save the person but
      // do NOT save the interaction, since the user opted out of logging it.
      _finish(false, !skipData);
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

    // NOTE: _attachEvents is intentionally NOT called again here.
    // The root listener added once by renderOnboarding() covers all CTA buttons
    // via event delegation (closest() selectors). Re-attaching on each step would
    // stack duplicate handlers and cause _finish() to fire multiple times.

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

  /**
   * @param {boolean} skipAll         – true when the top-level "Skip" button is
   *                                    pressed; skips both person and interaction.
   * @param {boolean} [saveInteraction=true] – false when the user pressed
   *                                    "Skip for now" on step 3; saves the
   *                                    person but omits the interaction entry.
   */
  function _finish(skipAll, saveInteraction) {
    if (saveInteraction === undefined) saveInteraction = true;
    let personId = null;

    if (!skipAll && _form.name.trim()) {
      // Always save the person if a name was entered and not fully skipping.
      const person = addPerson({
        name: _form.name.trim(),
        platform: _form.platform,
      });
      personId = person.id;

      // Save interaction only when the user clicked Done (saveInteraction=true)
      // and we are actually on step 3 (i.e. they filled in the form).
      if (saveInteraction && _step === 3 && personId) {
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
