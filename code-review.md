# SignalTrace — Code Review
**Date:** 2026-04-09  
**Files reviewed:** app.js, data.js, signals.js, screens/dashboard.js, screens/onboarding.js, screens/person.js, screens/log.js, screens/profile.js, seed.js

---

## Bug 1 — CRITICAL: `renderPerson` is never defined

**Files:** `app.js` line 50, `screens/profile.js`  
**Nature:** Complete dead link — every navigation to the `person` screen silently fails.

### What's wrong

`app.js` SCREENS registry calls `renderPerson(AppState.currentPersonId)` for the `person` screen:

```js
person: {
  render: () => typeof renderPerson === 'function' && renderPerson(AppState.currentPersonId),
```

`renderPerson` is never defined anywhere. The `typeof` guard makes this fail silently — no error thrown, no screen rendered, blank div shown.

### All broken flows

| Trigger | navigate() call | Fails because |
|---------|----------------|---------------|
| Dashboard person card click | `navigate('person', { personId })` | `renderPerson` undefined |
| Log save | `navigate('person', { personId })` in log.js:634 | Same |
| Person.js edit save | `navigate('person', { personId })` in person.js:371 | Same |

`profile.js` has `renderProfile(personId)` but it renders into `#screen-profile`, not `#screen-person`. The two screens are separate DOM elements.

### Fix

Add `window.renderPerson` in `profile.js` — identical to `renderProfile` but targeting `#screen-person`:

```js
function renderPerson(personId) {
  const id = personId
    || (typeof AppState !== 'undefined' && AppState.currentPersonId)
    || null;
  if (!id) {
    if (typeof navigate === 'function') navigate('dashboard');
    return;
  }
  const person = (typeof getPerson === 'function') ? getPerson(id) : null;
  if (!person) { _renderPersonError(); return; }
  _prf = { personId: id, expanded: new Set() };
  _ensureStyles();
  const container = document.getElementById('screen-person');
  if (!container) return;
  container.innerHTML = _buildHTML(person);
  _attachEvents(container, person);
}
window.renderPerson = renderPerson;
```

---

## Bug 2 — SIGNIFICANT: `signals.js` responseTime type mismatch → two detectors always return null

**Files:** `signals.js` lines 206–237, 394–434; `data.js` line 33  
**Nature:** Functional break — response-time-based signals never fire.

### What's wrong

`signals.js` data model comment (line 10) documents `responseTime` as a **number (minutes)**:
```
responseTime: number | null,   // minutes until their reply
```

But `data.js` stores `responseTime` as a **string**:
```
responseTime: string — "fast" | "normal" | "slow" | "no_response"
```

**`detectResponseTimeDeterioration` (line 206):**
```js
const withRT = interactions.filter(
  (i) => typeof i.responseTime === 'number' && i.responseTime > 0
);
if (withRT.length < 4) return null;  // ← always hit; always returns null
```

**`detectAllTheWork` (line 394) — partial break:**
```js
const withRT = interactions.filter(
  (i) => typeof i.responseTime === 'number' && i.responseTime > 0
);
const avgRT = withRT.length >= 3 ? mean(...) : null;  // always null
const slowResponse = avgRT !== null && avgRT > 180;    // always false
if (!slowResponse && myRatio < 0.85) return null;      // only fires if myRatio >= 0.85, ignores response time
```

### Fix

Add a string→numeric converter inside `signals.js` and apply it before filtering:

```js
const RESPONSE_TIME_MINUTES = { fast: 15, normal: 120, slow: 360 };

function _rtMinutes(rt) {
  if (typeof rt === 'number') return rt;
  return RESPONSE_TIME_MINUTES[rt] ?? null;
}
```

Update both detectors to use `_rtMinutes(i.responseTime)` instead of `i.responseTime` directly.

---

## Bug 3 — SIGNIFICANT: `signals.js` references non-existent `status` field → ghosting detector always returns null

**Files:** `signals.js` lines 244–262; `data.js`  
**Nature:** Functional break — ghosting pattern signal never fires.

### What's wrong

`signals.js` data model comment (line 17) expects a `status` field:
```
status: 'responded' | 'left_on_read' | 'no_response' | null
```

`data.js` Interaction model has no `status` field. It stores non-response as `responseTime: 'no_response'`.

`detectGhostingPattern` (line 247):
```js
const ghosted = interactions.filter(
  (i) => i.status === 'left_on_read' || i.status === 'no_response'
);
// i.status is always undefined → ghosted.length always 0 → always returns null
```

### Fix

Map `responseTime === 'no_response'` as the ghosting indicator:

```js
const ghosted = interactions.filter(
  (i) => i.responseTime === 'no_response'
    || i.status === 'left_on_read'   // forward-compat if status is added later
    || i.status === 'no_response'
);
```

---

## Bug 4 — MODERATE: `AppState.editPersonId` is never cleared → add-person form can silently open in edit mode

**Files:** `screens/profile.js` lines 556–561; `app.js` lines 66–76  
**Nature:** State leak — after editing a person, clicking "Add new person" (FAB or empty state) renders the edit form for the previously-edited person instead of a blank add form.

### What's wrong

`_handleEdit` in profile.js:
```js
function _handleEdit(personId) {
  if (typeof updateState === 'function') updateState({ editPersonId: personId });
  navigate('add-person', { personId });
}
```

`updateState({ editPersonId: personId })` sets `AppState.editPersonId`. It is **never cleared** — not by `navigate()`, not by `renderAddPerson()`.

After editing and saving, `AppState.editPersonId` still holds the old person's ID. Next call to `navigate('add-person', {})` (FAB click) → SCREENS checks `AppState.editPersonId` → truthy → calls `renderEditPerson(AppState.editPersonId)` → wrong person's form opened.

### Fix

Two-part fix:

1. In `_handleEdit` (profile.js), pass `editPersonId` as a navigate param instead of a separate updateState call.
2. In `navigate()` (app.js), handle `editPersonId` in the state update and clear it when not provided for `add-person`.

**profile.js change:**
```js
function _handleEdit(personId) {
  if (typeof navigate === 'function') {
    navigate('add-person', { editPersonId: personId });
  }
}
```

**app.js `navigate()` change:**
```js
updateState({
  currentScreen: screenName,
  currentPersonId: params.personId ?? (screenName === 'person' ? AppState.currentPersonId : null),
  editPersonId:    screenName === 'add-person' ? (params.editPersonId || null) : AppState.editPersonId,
  logContext:      params.logContext ?? (screenName === 'log' ? AppState.logContext : null),
  navVisible:      !screenDef.hideNav,
});
```

---

## Bug 5 — MODERATE: Duplicate event listeners in onboarding.js → `_finish()` called multiple times

**Files:** `screens/onboarding.js` lines 641–693  
**Nature:** Each step advance stacks another event listener on the root element.

### What's wrong

`renderOnboarding()` calls `_attachEvents(root)` once. `_goToStep()` (line 672) calls `_attachEvents(root)` again on the same element:

```js
const root = document.getElementById('screen-onboarding');
if (root) _attachEvents(root);
```

`addEventListener` does not replace existing handlers — it adds another. After navigating steps 1→2→3:
- There are **3 click handlers** on `#screen-onboarding`
- Clicking "Done" fires `_handleDone()` → `_finish(false)` **3 times**
- `addPerson()` is called 3 times; 3 identical persons are saved to localStorage

### Fix

Remove the `_attachEvents(root)` call from `_goToStep`. The handler added by `renderOnboarding()` already covers all events via event delegation (`e.target.closest(...)` selectors). The replaced `ctaWrap.innerHTML` re-creates the buttons but the root listener still catches clicks on them.

```js
// In _goToStep — DELETE these lines:
const root = document.getElementById('screen-onboarding');
if (root) _attachEvents(root);
```

---

## Bug 6 — MINOR: `moodRaw` field silently dropped by `addInteraction`

**Files:** `screens/log.js` line 613; `data.js` lines 157–177  
**Nature:** Data discarded silently — no crash, but `moodRaw` is never persisted.

### What's wrong

`log.js` saves `moodRaw` (the 4-option raw value: 'off'|'meh'|'good'|'great') alongside the normalized `mood`:
```js
const interactionData = {
  ...
  mood:    MOOD_TO_MODEL[_form.mood] ?? 'neutral',
  moodRaw: _form.mood,                              // ← 'off'|'meh'|'good'|'great'
  ...
};
addInteraction(interactionData);
```

`data.js` `addInteraction` explicitly constructs the stored object field-by-field and does not include `moodRaw`:
```js
var interaction = {
  id, personId, date, type, initiatedBy,
  mood: data.mood != null ? data.mood : 'neutral',
  responseTime, redFlags, greenFlags, notes, createdAt
  // moodRaw: not here → silently dropped
};
```

### Fix

Add `moodRaw` to the interaction object in `addInteraction`:
```js
moodRaw: data.moodRaw != null ? data.moodRaw : null,
```

---

## Checklist Results

### 1. SCREENS registry

| Screen | Render function | Exists? |
|--------|----------------|---------|
| onboarding | `renderOnboarding()` | ✅ window.renderOnboarding in onboarding.js |
| dashboard | `renderDashboard()` | ✅ global fn in dashboard.js |
| person | `renderPerson(personId)` | ❌ **DOES NOT EXIST** — Bug 1 |
| log | `renderLog(logContext)` | ✅ window.renderLog in log.js |
| profile | `renderProfile()` | ✅ global fn in profile.js |
| add-person | `renderAddPerson()` / `renderEditPerson()` | ✅ global fns in person.js |
| settings | redirects to profile | ✅ |

### 2. navigate() calls — all valid

Every `navigate(X)` call maps to a registered SCREENS key. ✅

### 3. Global function dependencies

| Function | Defined in | Exported |
|----------|-----------|---------|
| `addPerson` | data.js | global fn ✅ |
| `updatePerson` | data.js | global fn ✅ |
| `getPerson` | data.js | global fn ✅ |
| `getAllPersons` | data.js | global fn ✅ |
| `deletePerson` | data.js | global fn ✅ |
| `addInteraction` | data.js | global fn ✅ |
| `getInteractions` | data.js | global fn ✅ |
| `getStats` | data.js | global fn ✅ |
| `detectSignals` | data.js | global fn ✅ |
| `analyzeSignals` | signals.js | window.analyzeSignals ✅ |
| `getPersonSignalSummary` | signals.js | window.getPersonSignalSummary ✅ |
| `navigate` | app.js | window.navigate ✅ |
| `updateState` | app.js | window.updateState ✅ |
| `AppState` | app.js | window.AppState ✅ |

### 4. Data flow connectivity

| Flow | Status |
|------|--------|
| Onboarding → addPerson → addInteraction → navigate('dashboard') | ✅ |
| Dashboard → person card → navigate('person') | ❌ renderPerson undefined (Bug 1) |
| Profile → Log Interaction → save → navigate('person') | ❌ renderPerson undefined (Bug 1) |
| Profile → Edit → navigate('add-person') → save → navigate('person') | ❌ renderPerson undefined (Bug 1); also editPersonId not cleared (Bug 4) |

### 5. getStats() field names — consistent ✅

`data.js` returns: `totalInteractions`, `initiatedByMePct`, `initiatedByThemPct`, `avgResponseTime`, `lastInteractionDate`, `daysSinceLastInteraction`

`dashboard.js` uses: `stats.lastInteractionDate` ✅  
`profile.js` uses: `stats.totalInteractions`, `stats.initiatedByThemPct`, `stats.initiatedByMePct`, `stats.daysSinceLastInteraction` ✅  
`profile.js _emptyStats()` mirrors the exact same shape ✅

### 6. signals.js return shapes — consumed correctly, but detectors broken

`analyzeSignals` returns `{ type, severity, title, description, evidenceCount }` — all fields consumed correctly by profile.js ✅  
`getPersonSignalSummary` returns `{ level, topSignal, count }` — all fields consumed correctly by dashboard.js and profile.js ✅  
**But**: two detectors are non-functional due to responseTime type mismatch (Bug 2) and missing status field (Bug 3).

### 7. seed.js compatibility ✅

All Person and Interaction fields match data.js schema. Mood values use 'positive'/'neutral'/'negative' (normalized). ResponseTime uses valid strings. seed.js writes directly to localStorage, bypassing data.js, which is intentional and correct.

---

## Summary

| # | Severity | File(s) | Description |
|---|----------|---------|-------------|
| 1 | **Critical** | app.js:50, profile.js | `renderPerson` undefined — person screen never renders |
| 2 | **Significant** | signals.js:206,394 | `responseTime` type mismatch — response-time detectors always return null |
| 3 | **Significant** | signals.js:247 | `status` field doesn't exist in data model — ghosting detector always returns null |
| 4 | **Moderate** | profile.js:557, app.js:66 | `editPersonId` never cleared — add-person form opens in edit mode after any edit |
| 5 | **Moderate** | onboarding.js:672 | Duplicate event listeners stacked per step — `_finish()` called N times |
| 6 | **Minor** | log.js:613, data.js:157 | `moodRaw` not persisted by `addInteraction` |
