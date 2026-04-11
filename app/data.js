/**
 * SignalTrace — Data Layer
 * Single-source-of-truth for all app data.
 * All data persists to localStorage. No frameworks. No external deps.
 *
 * NOTE: All functions are global (no ES module exports) because this file
 * is loaded as a plain <script>. This is intentional.
 *
 * Storage keys:
 *   signaltrace_persons       → Person[]
 *   signaltrace_interactions  → Interaction[]
 *   signaltrace_onboarded     → '1' if user has completed onboarding
 *
 * Data models:
 *
 *   Person {
 *     id              string   — unique, generated
 *     name            string
 *     platform        string   — e.g. "Hinge", "Bumble", "IRL"
 *     metDate         string   — ISO date string
 *     avatar_initial  string   — single character shown in UI
 *     notes           string   — free text
 *     createdAt       string   — ISO timestamp
 *   }
 *
 *   Interaction {
 *     id              string   — unique, generated
 *     personId        string   — FK → Person.id
 *     date            string   — ISO date string of the interaction
 *     type            string   — "text" | "call" | "date" | "voice_note" | "social"
 *     initiatedBy     string   — "me" | "them" | "mutual"
 *     mood            string   — "positive" | "neutral" | "negative"
 *     responseTime    string   — "fast" | "normal" | "slow" | "no_response"
 *     redFlags        string[] — list of observed red flag descriptions
 *     greenFlags      string[] — list of observed green flag descriptions
 *     notes           string   — free text
 *     createdAt       string   — ISO timestamp
 *   }
 *
 *   Signal {
 *     personId    string   — FK → Person.id
 *     type        string   — signal category, e.g. "consistency", "initiative"
 *     severity    string   — "low" | "medium" | "high"
 *     message     string   — human-readable signal description
 *     detectedAt  string   — ISO timestamp
 *   }
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function readStore(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    // localStorage may be full (QuotaExceededError) or unavailable (private mode)
    console.error('[SignalTrace] writeStore failed for key "' + key + '":', err);
    return false;
  }
}

var PERSONS_KEY = 'signaltrace_persons';
var INTERACTIONS_KEY = 'signaltrace_interactions';

// ---------------------------------------------------------------------------
// Person CRUD
// ---------------------------------------------------------------------------

function addPerson(data) {
  // Guard: name is required and must be non-empty
  if (!data || !data.name || !data.name.trim()) return null;

  var persons = readStore(PERSONS_KEY);

  var person = {
    id: generateId(),
    name: data.name != null ? data.name : '',
    platform: data.platform != null ? data.platform : '',
    metDate: data.metDate != null ? data.metDate : '',
    avatar_initial: data.avatar_initial != null
      ? data.avatar_initial
      : (data.name ? data.name.trim()[0].toUpperCase() : '?'),
    notes: data.notes != null ? data.notes : '',
    vibeTags: Array.isArray(data.vibeTags) ? data.vibeTags : [],
    createdAt: new Date().toISOString(),
  };

  persons.push(person);
  var ok = writeStore(PERSONS_KEY, persons);
  return ok ? person : null;
}

function getPerson(id) {
  var persons = readStore(PERSONS_KEY);
  return persons.find(function(p) { return p.id === id; }) || null;
}

function getAllPersons() {
  var persons = readStore(PERSONS_KEY);
  var interactions = readStore(INTERACTIONS_KEY);

  // Build a map of personId → most recent interaction date
  var lastInteractionMap = {};
  for (var i = 0; i < interactions.length; i++) {
    var ix = interactions[i];
    var current = lastInteractionMap[ix.personId];
    if (!current || ix.date > current) {
      lastInteractionMap[ix.personId] = ix.date;
    }
  }

  return persons.slice().sort(function(a, b) {
    var aDate = lastInteractionMap[a.id] || a.createdAt;
    var bDate = lastInteractionMap[b.id] || b.createdAt;
    return bDate.localeCompare(aDate);
  });
}

function updatePerson(id, data) {
  var persons = readStore(PERSONS_KEY);
  var index = persons.findIndex(function(p) { return p.id === id; });
  if (index === -1) return null;

  // Never overwrite id or createdAt
  var safe = Object.assign({}, data);
  delete safe.id;
  delete safe.createdAt;

  persons[index] = Object.assign({}, persons[index], safe);
  writeStore(PERSONS_KEY, persons);
  return persons[index];
}

function deletePerson(id) {
  var persons = readStore(PERSONS_KEY);
  var filtered = persons.filter(function(p) { return p.id !== id; });
  if (filtered.length === persons.length) return false;

  // Guard: only delete interactions if person write succeeds
  var ok = writeStore(PERSONS_KEY, filtered);
  if (!ok) return false;

  var interactions = readStore(INTERACTIONS_KEY);
  writeStore(INTERACTIONS_KEY, interactions.filter(function(i) { return i.personId !== id; }));

  return true;
}

// ---------------------------------------------------------------------------
// Interaction CRUD
// ---------------------------------------------------------------------------

function addInteraction(data) {
  // Guard: personId is required
  if (!data || !data.personId) return null;

  var interactions = readStore(INTERACTIONS_KEY);

  var interaction = {
    id: generateId(),
    personId: data.personId,
    date: data.date != null ? data.date : new Date().toISOString().slice(0, 10),
    type: data.type != null ? data.type : 'text',
    initiatedBy: data.initiatedBy != null ? data.initiatedBy : 'mutual',
    mood: data.mood != null ? data.mood : 'meh',
    moodRaw: data.moodRaw != null ? data.moodRaw : null,
    responseTime: data.responseTime != null ? data.responseTime : 'normal',
    redFlags: Array.isArray(data.redFlags) ? data.redFlags : [],
    greenFlags: Array.isArray(data.greenFlags) ? data.greenFlags : [],
    notes: data.notes != null ? data.notes : '',
    createdAt: new Date().toISOString(),
  };

  interactions.push(interaction);
  var ok = writeStore(INTERACTIONS_KEY, interactions);
  return ok ? interaction : null;
}

function getInteractions(personId) {
  var interactions = readStore(INTERACTIONS_KEY);
  return interactions
    .filter(function(i) { return i.personId === personId; })
    .sort(function(a, b) {
      // Guard against null/undefined date fields
      var da = b.date || b.createdAt || '';
      var db = a.date || a.createdAt || '';
      return da.localeCompare(db);
    });
}

function getInteraction(id) {
  var interactions = readStore(INTERACTIONS_KEY);
  return interactions.find(function(i) { return i.id === id; }) || null;
}

function updateInteraction(id, data) {
  var interactions = readStore(INTERACTIONS_KEY);
  var index = interactions.findIndex(function(i) { return i.id === id; });
  if (index === -1) return null;

  var safe = Object.assign({}, data);
  delete safe.id;
  delete safe.personId;
  delete safe.createdAt;

  interactions[index] = Object.assign({}, interactions[index], safe);
  var ok = writeStore(INTERACTIONS_KEY, interactions);
  if (!ok) return null;
  return interactions[index];
}

function deleteInteraction(id) {
  var interactions = readStore(INTERACTIONS_KEY);
  var filtered = interactions.filter(function(i) { return i.id !== id; });
  if (filtered.length === interactions.length) return false;
  var ok = writeStore(INTERACTIONS_KEY, filtered);
  if (!ok) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function getStats(personId) {
  var interactions = getInteractions(personId);
  var total = interactions.length;

  if (total === 0) {
    return {
      totalInteractions: 0,
      initiatedByMePct: 0,
      initiatedByThemPct: 0,
      avgResponseTime: null,
      lastInteractionDate: null,
      daysSinceLastInteraction: null,
    };
  }

  var byMe = interactions.filter(function(i) { return i.initiatedBy === 'me'; }).length;
  var byThem = interactions.filter(function(i) { return i.initiatedBy === 'them'; }).length;

  var responseTimeScore = { fast: 1, normal: 2, slow: 3, no_response: 4 };
  var scoreToLabel = { 1: 'fast', 2: 'normal', 3: 'slow', 4: 'no_response' };

  var scoreable = interactions.filter(function(i) { return i.responseTime in responseTimeScore; });
  var avgResponseTime = null;
  if (scoreable.length > 0) {
    var sum = scoreable.reduce(function(acc, i) { return acc + responseTimeScore[i.responseTime]; }, 0);
    avgResponseTime = scoreToLabel[Math.round(sum / scoreable.length)];
  }

  var lastInteractionDate = interactions[0].date || null;
  var daysSinceLastInteraction = null;

  if (lastInteractionDate) {
    var last = new Date(lastInteractionDate + 'T00:00:00');
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    last.setHours(0, 0, 0, 0);
    daysSinceLastInteraction = Math.floor((today - last) / (1000 * 60 * 60 * 24));
  }

  return {
    totalInteractions: total,
    initiatedByMePct: Math.round((byMe / total) * 100),
    initiatedByThemPct: Math.round((byThem / total) * 100),
    avgResponseTime: avgResponseTime,
    lastInteractionDate: lastInteractionDate,
    daysSinceLastInteraction: daysSinceLastInteraction,
  };
}

// ---------------------------------------------------------------------------
// Signal detection (rule-based, not AI)
// ---------------------------------------------------------------------------

function detectSignals(personId) {
  var stats = getStats(personId);
  var interactions = getInteractions(personId);
  var signals = [];
  var now = new Date().toISOString();

  if (stats.totalInteractions === 0) return signals;

  // Silence / fading
  if (stats.daysSinceLastInteraction > 14) {
    signals.push({
      personId: personId,
      type: 'silence',
      severity: 'high',
      message: 'No interaction in ' + stats.daysSinceLastInteraction + ' days.',
      detectedAt: now,
    });
  } else if (stats.daysSinceLastInteraction > 7) {
    signals.push({
      personId: personId,
      type: 'fading',
      severity: 'medium',
      message: 'Last interaction was ' + stats.daysSinceLastInteraction + ' days ago. Momentum slowing.',
      detectedAt: now,
    });
  }

  // Initiation imbalance — only flag with enough data and higher thresholds
  if (stats.totalInteractions >= 4) {
    if (stats.initiatedByMePct > 80) {
      signals.push({
        personId: personId,
        type: 'initiation_imbalance',
        severity: 'high',
        message: 'You initiated ' + stats.initiatedByMePct + '% of interactions. They are not meeting you halfway.',
        detectedAt: now,
      });
    } else if (stats.initiatedByMePct > 70) {
      signals.push({
        personId: personId,
        type: 'initiation_imbalance',
        severity: 'medium',
        message: 'You initiated ' + stats.initiatedByMePct + '% of interactions. Watch whether this balances out.',
        detectedAt: now,
      });
    }
  }

  // Response time pattern
  if (stats.avgResponseTime === 'no_response') {
    signals.push({
      personId: personId,
      type: 'response_pattern',
      severity: 'high',
      message: 'Average response time is non-responsive. This is a pattern, not a one-off.',
      detectedAt: now,
    });
  } else if (stats.avgResponseTime === 'slow') {
    signals.push({
      personId: personId,
      type: 'response_pattern',
      severity: 'medium',
      message: 'Consistently slow response times. Note whether this is selective or general.',
      detectedAt: now,
    });
  }

  // Red flag accumulation — temporal weighting: recent red flags (30 days) trigger high severity
  var totalRedFlags = interactions.reduce(function(sum, i) {
    return sum + (i.redFlags ? i.redFlags.length : 0);
  }, 0);

  var thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  var recentRedFlags = interactions.reduce(function(sum, i) {
    var isRecent = i.date && new Date(i.date) >= thirtyDaysAgo;
    return sum + (isRecent && i.redFlags ? i.redFlags.length : 0);
  }, 0);

  if (recentRedFlags >= 3) {
    signals.push({
      personId: personId,
      type: 'red_flag_accumulation',
      severity: 'high',
      message: recentRedFlags + ' red flags in the last 30 days. Take a step back.',
      detectedAt: now,
    });
  } else if (totalRedFlags >= 3) {
    signals.push({
      personId: personId,
      type: 'red_flag_accumulation',
      severity: 'medium',
      message: totalRedFlags + ' total red flags logged. Worth reviewing the pattern.',
      detectedAt: now,
    });
  }

  return signals;
}

// ---------------------------------------------------------------------------
// DB namespace — used by app.js for first-run detection
// ---------------------------------------------------------------------------

var dbAPI = {
  /**
   * Returns true if the user has completed onboarding OR if any people exist.
   * Used by app.js to decide whether to show onboarding.
   */
  hasPeople: function() {
    if (localStorage.getItem('signaltrace_onboarded')) return true;
    return getAllPersons().length > 0;
  },
};
window.DB = window.SignalTraceDB = dbAPI;
