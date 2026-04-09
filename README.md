# SignalTrace

A dating tracker app for women who want clarity and pattern recognition in their dating life. No vibe-checking. No rationalising. Just logged data and clear signals.

---

## Running the app

### Option 1 — double-click (quickest)

Open `app/index.html` directly in your browser. Works in Chrome, Safari, and Firefox with no installation required.

### Option 2 — local server (recommended for full PWA features)

```bash
cd app
npx serve .
# or:  python3 -m http.server 8080
```

Then open `http://localhost:8080` (or `http://localhost:3000` for `serve`).

---

## File structure

```
app/
├── index.html          — Single-page shell; all screen divs and bottom nav live here
├── styles.css          — Design system tokens + all component styles
├── data.js             — localStorage data layer (Person + Interaction CRUD, getStats, detectSignals)
├── signals.js          — Signal analysis engine (breadcrumbing, ghosting, hot & cold, etc.)
├── app.js              — Router, screen registry (SCREENS), global state (AppState), event delegation
├── seed.js             — Test data seeder — call seedTestData() from browser console
├── manifest.json       — PWA manifest
├── icons/              — App icons (icon-192.png, icon-512.png) — swap with real assets
└── screens/
    ├── onboarding.js   — 3-step onboarding flow (first launch)
    ├── dashboard.js    — Home screen: person cards list + summary bar + FAB
    ├── person.js       — Add/Edit person form (renderAddPerson, renderEditPerson)
                          + Person detail view (renderPerson)
    ├── profile.js      — Person detail (renderProfile, called from profile/Insights route)
                          + Aggregate Insights home (shown when no person is selected)
    └── log.js          — Log interaction entry form
```

### Script load order (set in index.html — do not change)

```
data.js → signals.js → dashboard.js → person.js → log.js → profile.js → onboarding.js → app.js
```

---

## Loading test data

The app ships with a seeder that creates two people with pre-built interaction histories — one red-flag pattern and one healthy pattern.

**From the browser console:**

```js
// Load both test people (clears any existing data first)
seedTestData()

// Clear everything and restart from onboarding
clearSeedData()
```

**To load the seeder automatically** (dev only), add this line to the bottom of `app/index.html` before `</body>`:

```html
<script src="seed.js"></script>
```

### Seed data: who gets created

**Marcus** — red flag pattern
- Platform: Hinge
- 10 interactions over 60 days
- 85%+ me-initiated
- Patterns: slow replies, left on read, hot and cold, vague plans, 15+ day silence
- Expected signals: strong alert level

**James** — healthy pattern
- Platform: IRL (met at a friend's birthday)
- 7 interactions over 30 days
- Majority them-initiated
- Patterns: planned ahead, followed up after dates, consistent response time, introduced to friends
- Expected signals: no alerts

---

## Data storage

Everything is stored in `localStorage` under three keys:

| Key | Contents |
|-----|----------|
| `signaltrace_persons` | JSON array of Person objects |
| `signaltrace_interactions` | JSON array of Interaction objects |
| `signaltrace_onboarded` | `'1'` once the user completes onboarding |

To inspect or clear from the console:

```js
// View all persons
JSON.parse(localStorage.getItem('signaltrace_persons'))

// View all interactions
JSON.parse(localStorage.getItem('signaltrace_interactions'))

// Nuclear reset
localStorage.clear(); location.reload();
```

---

## Navigation

The router lives in `app.js`. All screen transitions go through `navigate(screenName, params)`.

| Screen name | Renders | Route triggered by |
|-------------|---------|-------------------|
| `onboarding` | First-launch flow | Auto on first run |
| `dashboard` | Person list (Home) | Home nav tab |
| `person` | Person detail | Card tap on dashboard |
| `add-person` | Add/edit form | FAB or Edit button |
| `log` | Log interaction | + nav tab or Log button |
| `profile` | Insights (aggregate or person detail) | Insights nav tab |

---

## Signal detection

`signals.js` runs 8 detectors against each person's interaction history:

- **Breadcrumbing** — sporadic contact, never escalating
- **Low initiation** — you initiate 80%+ of contact
- **Response time deterioration** — replies getting slower over time
- **Ghosting** — 14+ day silence followed by re-emergence
- **Hot and cold** — alternating engaged/absent behaviour
- **Consistent effort** — positive: steady, them-initiated contact
- **Fading interest** — declining interaction frequency
- **Asymmetric effort** — sustained imbalance in who reaches out

Signals are computed on demand and are not persisted to storage.
