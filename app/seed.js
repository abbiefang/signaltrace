/**
 * SignalTrace — seed.js
 * Test data seeder. Load this file in the browser or call from the console.
 *
 * Usage:
 *   1. Open index.html in a browser
 *   2. Open DevTools console
 *   3. Run:  seedTestData()
 *   4. The page will reload with two pre-loaded people
 *
 * To clear all data:
 *   clearSeedData()
 *
 * NOTE: This file is NOT loaded by index.html by default.
 * To auto-seed on load, add before </body>:
 *   <script src="seed.js"></script>
 */

function seedTestData() {
  // ── Clear existing data ──────────────────────────────────────────────────
  localStorage.removeItem('signaltrace_persons');
  localStorage.removeItem('signaltrace_interactions');

  // Mark as onboarded so we skip the onboarding flow
  localStorage.setItem('signaltrace_onboarded', '1');

  // ── Helper: generate deterministic-ish IDs ───────────────────────────────
  let _idSeed = 1000;
  function fakeId() {
    return 'seed-' + (++_idSeed).toString(36);
  }

  function isoDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  function isoTs(daysAgo, hoursAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(d.getHours() - (hoursAgo || 0));
    return d.toISOString();
  }

  // ── Person 1: Marcus (red flags) ─────────────────────────────────────────
  // Pattern: 85%+ me-initiated, hot & cold, silence 15+ days, 5+ red flags
  const marcusId = fakeId();
  const marcus = {
    id:             marcusId,
    name:           'Marcus',
    platform:       'Hinge',
    metDate:        isoDate(60),
    avatar_initial: 'M',
    notes:          'Tall, works in finance. Charming on dates but hard to pin down between them.',
    createdAt:      isoTs(60),
  };

  const marcusInteractions = [
    // Early — mostly me reaching out, sporadic responses
    {
      id: fakeId(), personId: marcusId,
      date: isoDate(58), type: 'text', initiatedBy: 'me',
      mood: 'positive', responseTime: 'normal',
      redFlags: [], greenFlags: ['good banter', 'made me laugh'],
      notes: 'First proper conversation. He was funny and engaged.',
      createdAt: isoTs(58),
    },
    {
      id: fakeId(), personId: marcusId,
      date: isoDate(54), type: 'text', initiatedBy: 'me',
      mood: 'neutral', responseTime: 'slow',
      redFlags: ['slow to reply'], greenFlags: [],
      notes: 'Took 2 days to respond. Short answers.',
      createdAt: isoTs(54),
    },
    {
      id: fakeId(), personId: marcusId,
      date: isoDate(50), type: 'date', initiatedBy: 'them',
      mood: 'positive', responseTime: 'fast',
      redFlags: [], greenFlags: ['initiated plans', 'attentive', 'paid for dinner'],
      notes: 'Great first date. He was charming and present. Texted straight after.',
      createdAt: isoTs(50),
    },
    {
      id: fakeId(), personId: marcusId,
      date: isoDate(46), type: 'text', initiatedBy: 'me',
      mood: 'neutral', responseTime: 'slow',
      redFlags: ['slow to reply'], greenFlags: [],
      notes: 'Had to reach out first. Response was brief.',
      createdAt: isoTs(46),
    },
    {
      id: fakeId(), personId: marcusId,
      date: isoDate(42), type: 'text', initiatedBy: 'me',
      mood: 'negative', responseTime: 'no_response',
      redFlags: ['left on read'], greenFlags: [],
      notes: 'Sent a question. No response for 3 days then a one-word reply.',
      createdAt: isoTs(42),
    },
    {
      id: fakeId(), personId: marcusId,
      date: isoDate(38), type: 'date', initiatedBy: 'them',
      mood: 'positive', responseTime: 'fast',
      redFlags: [], greenFlags: ['initiated plans', 'showed up on time'],
      notes: 'Second date. Seemed genuinely into it. Confusing given the silence beforehand.',
      createdAt: isoTs(38),
    },
    {
      id: fakeId(), personId: marcusId,
      date: isoDate(32), type: 'text', initiatedBy: 'me',
      mood: 'negative', responseTime: 'slow',
      redFlags: ['slow to reply', 'vague plans'], greenFlags: [],
      notes: 'Suggested plans, got a "sounds good, let me check my schedule" — never followed up.',
      createdAt: isoTs(32),
    },
    {
      id: fakeId(), personId: marcusId,
      date: isoDate(28), type: 'text', initiatedBy: 'me',
      mood: 'negative', responseTime: 'no_response',
      redFlags: ['ignored message'], greenFlags: [],
      notes: 'Checked in. Silence for 5 days.',
      createdAt: isoTs(28),
    },
    {
      id: fakeId(), personId: marcusId,
      date: isoDate(20), type: 'text', initiatedBy: 'them',
      mood: 'neutral', responseTime: 'fast',
      redFlags: ['hot and cold', 'no mention of seeing me'], greenFlags: [],
      notes: 'Random meme after 8 days of silence. No explanation. No plans.',
      createdAt: isoTs(20),
    },
    {
      id: fakeId(), personId: marcusId,
      date: isoDate(15), type: 'text', initiatedBy: 'me',
      mood: 'negative', responseTime: 'slow',
      redFlags: ['deflected when asked about seeing each other'], greenFlags: [],
      notes: 'Asked about meeting up. He pivoted to small talk.',
      createdAt: isoTs(15),
    },
  ];
  // No interaction since 15 days ago → silence period active

  // ── Person 2: James (healthy signals) ────────────────────────────────────
  // Pattern: them-initiated majority, fast responses, consistent green flags, recent interaction
  const jamesId = fakeId();
  const james = {
    id:             jamesId,
    name:           'James',
    platform:       'IRL',
    metDate:        isoDate(30),
    avatar_initial: 'J',
    notes:          'Met at a friend\'s birthday. Teacher. Easy to talk to, no games so far.',
    createdAt:      isoTs(30),
  };

  const jamesInteractions = [
    {
      id: fakeId(), personId: jamesId,
      date: isoDate(28), type: 'text', initiatedBy: 'them',
      mood: 'positive', responseTime: 'fast',
      redFlags: [], greenFlags: ['reached out first', 'remembered what I said'],
      notes: 'He texted to say it was nice meeting me. Specific detail about our conversation.',
      createdAt: isoTs(28),
    },
    {
      id: fakeId(), personId: jamesId,
      date: isoDate(24), type: 'date', initiatedBy: 'them',
      mood: 'positive', responseTime: 'fast',
      redFlags: [], greenFlags: ['planned ahead', 'on time', 'asked good questions', 'no phone during dinner'],
      notes: 'First date. Booked a proper place, was fully present. No anxiety with him.',
      createdAt: isoTs(24),
    },
    {
      id: fakeId(), personId: jamesId,
      date: isoDate(22), type: 'text', initiatedBy: 'them',
      mood: 'positive', responseTime: 'fast',
      redFlags: [], greenFlags: ['followed up after date', 'specific compliment'],
      notes: 'Texted the morning after to say he had a good time. Wanted to see me again.',
      createdAt: isoTs(22),
    },
    {
      id: fakeId(), personId: jamesId,
      date: isoDate(18), type: 'call', initiatedBy: 'them',
      mood: 'positive', responseTime: 'fast',
      redFlags: [], greenFlags: ['called instead of texting', 'remembered my work situation', 'made me laugh'],
      notes: 'Random call to catch up. Easy, no awkward silences. He remembered things I had mentioned.',
      createdAt: isoTs(18),
    },
    {
      id: fakeId(), personId: jamesId,
      date: isoDate(12), type: 'date', initiatedBy: 'mutual',
      mood: 'positive', responseTime: 'fast',
      redFlags: [], greenFlags: ['introduced me to his friends', 'comfortable silence', 'held my hand'],
      notes: 'Low-key hangout with two of his friends. Relaxed. He checked in on me afterwards.',
      createdAt: isoTs(12),
    },
    {
      id: fakeId(), personId: jamesId,
      date: isoDate(5), type: 'text', initiatedBy: 'me',
      mood: 'positive', responseTime: 'fast',
      redFlags: [], greenFlags: ['matched my energy', 'made concrete plans'],
      notes: 'I reached out this time. He responded quickly, suggested a specific date for next week.',
      createdAt: isoTs(5),
    },
    {
      id: fakeId(), personId: jamesId,
      date: isoDate(1), type: 'date', initiatedBy: 'them',
      mood: 'positive', responseTime: 'fast',
      redFlags: [], greenFlags: ['paid', 'walked me home', 'asked about future plans', 'consistent'],
      notes: 'Third date. Still no games. Brought up wanting to see each other more regularly.',
      createdAt: isoTs(1),
    },
  ];

  // ── Write to localStorage ─────────────────────────────────────────────────
  const persons = [marcus, james];
  const interactions = [...marcusInteractions, ...jamesInteractions];

  localStorage.setItem('signaltrace_persons',      JSON.stringify(persons));
  localStorage.setItem('signaltrace_interactions', JSON.stringify(interactions));

  console.log('[SignalTrace seed] ✓ Created 2 people, ' + interactions.length + ' interactions.');
  console.log('  Marcus (' + marcusId + ') — red flag pattern');
  console.log('  James  (' + jamesId  + ') — healthy pattern');

  // If the app is running, navigate to dashboard; otherwise reload the page
  if (typeof navigate === 'function') {
    navigate('dashboard', { replace: true });
    if (typeof renderApp === 'function') renderApp();
    console.log('[SignalTrace seed] App refreshed. You should see Marcus and James on the dashboard.');
  } else {
    console.log('[SignalTrace seed] Reloading page…');
    window.location.reload();
  }
}

function clearSeedData() {
  localStorage.removeItem('signaltrace_persons');
  localStorage.removeItem('signaltrace_interactions');
  localStorage.removeItem('signaltrace_onboarded');
  console.log('[SignalTrace seed] All data cleared. Reload the page.');
  window.location.reload();
}

// Expose globally
window.seedTestData = seedTestData;
window.clearSeedData = clearSeedData;
