/**
 * SignalTrace — Signal Detection Engine
 * signals.js v1.0
 *
 * Analyzes a person's interaction history and returns structured signal results.
 * Signals are factual pattern observations — not verdicts, not advice.
 *
 * DATA MODEL (expected interaction shape):
 * {
 *   id:          string,
 *   personId:    string,
 *   date:        string (ISO 8601, e.g. "2024-03-15"),
 *   initiatedBy: 'me' | 'them',
 *   responseTime: number | null,   // minutes until their reply; null if not tracked
 *   mood:        'great' | 'good' | 'meh' | 'off',
 *   redFlags:    string[],         // e.g. ["Hot & cold", "Cancelled last minute"]
 *   greenFlags:  string[],         // e.g. ["Planned ahead", "Asked follow-up questions"]
 *   status:      'responded' | 'left_on_read' | 'no_response' | null
 * }
 *
 * DATA ACCESS:
 * Reads from window.SignalTraceDB.getInteractions(personId) if available,
 * otherwise falls back to localStorage key 'signaltrace_interactions'.
 *
 * USAGE:
 *   const signals = analyzeSignals('person_123');
 *   const summary = getPersonSignalSummary('person_123');
 */

;(function (root) {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────

  const MIN_INTERACTIONS = 3; // Minimum before any signal is evaluated

  const MOOD_SCORE = { great: 2, good: 1.5, meh: 1, off: 0 };

  /**
   * data.js stores responseTime as a string: "fast"|"normal"|"slow"|"no_response".
   * Detectors that need numeric comparison use this map (minutes).
   * null means "not recorded / no response" — excluded from avg calculations.
   */
  const RESPONSE_TIME_MINUTES = { fast: 15, normal: 120, slow: 360 };

  /**
   * Convert a string OR numeric responseTime to minutes.
   * Returns null for "no_response", unknown strings, or already-null values.
   */
  function _rtMinutes(rt) {
    if (rt === null || rt === undefined) return null;
    if (typeof rt === 'number')          return rt > 0 ? rt : null;
    return RESPONSE_TIME_MINUTES[rt] !== undefined ? RESPONSE_TIME_MINUTES[rt] : null;
  }

  // ─── Data Access ──────────────────────────────────────────────────────────

  /**
   * Returns interactions for a person, sorted chronologically (oldest first).
   * Reads from window.SignalTraceDB if present, else localStorage.
   * @param {string} personId
   * @returns {Array}
   */
  function getInteractions(personId) {
    let all = [];

    if (
      root.SignalTraceDB &&
      typeof root.SignalTraceDB.getInteractions === 'function'
    ) {
      all = root.SignalTraceDB.getInteractions(personId);
    } else {
      try {
        all = JSON.parse(
          localStorage.getItem('signaltrace_interactions') || '[]'
        );
      } catch (e) {
        all = [];
      }
    }

    return all
      .filter((i) => i.personId === personId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // ─── Utility Helpers ──────────────────────────────────────────────────────

  /** Mean of a numeric array. Returns null for empty arrays. */
  function mean(arr) {
    if (!arr.length) return null;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  /** Standard deviation of a numeric array. Returns null for < 2 items. */
  function stdDev(arr) {
    if (arr.length < 2) return null;
    const m = mean(arr);
    const variance =
      arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  /** Gap in days between two ISO date strings. Returns null if either date is invalid. */
  function daysBetween(dateA, dateB) {
    const msA = new Date(dateA).getTime();
    const msB = new Date(dateB).getTime();
    if (isNaN(msA) || isNaN(msB)) return null;
    return Math.abs(msB - msA) / (1000 * 60 * 60 * 24);
  }

  /** Convert mood string to numeric score. */
  function moodScore(mood) {
    return MOOD_SCORE[mood] != null ? MOOD_SCORE[mood] : 1;
  }

  /**
   * Builds a Signal object.
   * @param {string} type
   * @param {'high'|'medium'|'low'} severity
   * @param {string} title
   * @param {string} description
   * @param {number} evidenceCount
   * @param {string} actionTip — brief "what to consider" guidance
   * @returns {object}
   */
  function makeSignal(type, severity, title, description, evidenceCount, actionTip) {
    return { type, severity, title, description, evidenceCount, actionTip };
  }

  // ─── Signal Detectors ─────────────────────────────────────────────────────

  /**
   * BREADCRUMBING
   * Detects high variance in contact frequency — bursts of contact followed by
   * silence then re-engagement. Indicates inconsistent availability.
   * Requires >= 5 interactions.
   */
  function detectBreadcrumbing(interactions) {
    if (interactions.length < 5) return null;

    const gaps = [];
    for (let i = 1; i < interactions.length; i++) {
      gaps.push(daysBetween(interactions[i - 1].date, interactions[i].date));
    }
    const validGaps = gaps.filter((g) => g !== null);

    const avg = mean(validGaps);
    const sd = stdDev(validGaps);
    if (avg === null || sd === null) return null;
    if (avg === 0) return null; // all same-day — divide-by-zero guard

    // Coefficient of variation: high variance relative to mean
    const cv = sd / avg;

    // Also look for the specific pattern: short gaps → long gap → short gaps again
    const longGapThreshold = avg + sd; // gaps more than 1 std dev above mean
    let burstThenGapThenBurst = false;

    for (let i = 1; i < validGaps.length - 1; i++) {
      const before = validGaps[i - 1];
      const current = validGaps[i];
      const after = validGaps[i + 1];
      if (
        before < avg &&
        current > longGapThreshold &&
        after < avg
      ) {
        burstThenGapThenBurst = true;
        break;
      }
    }

    // Raised threshold from 0.7 → 1.0 to reduce false positives on natural scheduling variation
    if (cv < 1.0 && !burstThenGapThenBurst) return null;

    const severity = cv > 1.5 || burstThenGapThenBurst ? 'high' : 'medium';
    const maxGap = Math.max(...validGaps).toFixed(1);
    const minGap = Math.min(...validGaps).toFixed(1);

    return makeSignal(
      'breadcrumbing',
      severity,
      'Inconsistent Contact Pattern',
      `Contact frequency has varied significantly — gaps range from ${minGap} to ${maxGap} days (average: ${avg.toFixed(1)} days). Contact tends to cluster in bursts then go quiet, often resuming after silence.`,
      gaps.length,
      'This pattern often means you\'re being kept as a backup option. Notice if contact spikes when they need something from you.'
    );
  }

  /**
   * LOW INITIATION
   * Detects when the user is initiating more than 75% of interactions.
   */
  function detectLowInitiation(interactions) {
    if (interactions.length < MIN_INTERACTIONS) return null;

    const tagged = interactions.filter(
      (i) => i.initiatedBy === 'me' || i.initiatedBy === 'them'
    );
    if (tagged.length < MIN_INTERACTIONS) return null;

    const theirInitiations = tagged.filter(
      (i) => i.initiatedBy === 'them'
    ).length;
    const myInitiations = tagged.filter((i) => i.initiatedBy === 'me').length;
    const myRatio = myInitiations / tagged.length;

    // Raised minimum from 0.75 → 0.80 and medium threshold from 0.82 → 0.85 to reduce noise
    if (myRatio < 0.80) return null;

    const severity = myRatio >= 0.9 ? 'high' : myRatio >= 0.85 ? 'medium' : 'low';
    const pct = Math.round(myRatio * 100);

    return makeSignal(
      'low_initiation',
      severity,
      'Low Initiation',
      `You initiated ${myInitiations} of ${tagged.length} interactions (${pct}%). They initiated ${theirInitiations}.`,
      tagged.length,
      'If you\'re the only one reaching out, consider stepping back and seeing if they match your effort level.'
    );
  }

  /**
   * RESPONSE TIME DETERIORATION
   * Detects a trend where response times are getting slower over time.
   */
  function detectResponseTimeDeterioration(interactions) {
    const withRT = interactions
      .map((i) => ({ ...i, _rtNum: _rtMinutes(i.responseTime) }))
      .filter((i) => i._rtNum !== null);
    if (withRT.length < 4) return null;

    const mid = Math.floor(withRT.length / 2);
    const firstHalf = withRT.slice(0, mid);
    const secondHalf = withRT.slice(mid);

    const avgEarly = mean(firstHalf.map((i) => i._rtNum));
    const avgRecent = mean(secondHalf.map((i) => i._rtNum));

    if (avgEarly === null || avgRecent === null) return null;

    const ratio = avgRecent / avgEarly;
    if (ratio < 1.5) return null;

    const severity = ratio >= 3 ? 'high' : ratio >= 2 ? 'medium' : 'low';

    const fmt = (mins) => {
      if (mins < 60) return `${Math.round(mins)}m`;
      return `${(mins / 60).toFixed(1)}h`;
    };

    return makeSignal(
      'response_time_deterioration',
      severity,
      'Response Time Slowing',
      `Average response time has increased from ${fmt(avgEarly)} (first ${firstHalf.length} responses) to ${fmt(avgRecent)} (last ${secondHalf.length} responses).`,
      withRT.length,
      'Slower replies can mean they\'re losing interest or deprioritizing you. Ask yourself if the overall dynamic feels the same as before.'
    );
  }

  /**
   * GHOSTING PATTERN
   */
  function detectGhostingPattern(interactions) {
    if (interactions.length < MIN_INTERACTIONS) return null;

    const ghosted = interactions.filter(
      (i) => i.responseTime === 'no_response'
          || i.status === 'left_on_read'
          || i.status === 'no_response'
    );
    if (ghosted.length < 2) return null;

    const severity = ghosted.length >= 4 ? 'high' : ghosted.length >= 3 ? 'medium' : 'low';
    const label = ghosted.length === 1 ? 'instance' : 'instances';

    return makeSignal(
      'ghosting_pattern',
      severity,
      'Ghosting Pattern',
      `${ghosted.length} ${label} of no response or being left on read across ${interactions.length} logged interactions.`,
      ghosted.length,
      'Being left on read repeatedly shows they\'re not prioritizing you. It might be time to redirect your energy elsewhere.'
    );
  }

  /**
   * HOT & COLD
   */
  function detectHotAndCold(interactions) {
    if (interactions.length < 5) return null;

    const explicitCount = interactions.filter((i) =>
      (i.redFlags || []).some(
        (f) => f.toLowerCase().includes('hot') && f.toLowerCase().includes('cold')
      )
    ).length;

    const scores = interactions.map((i) => moodScore(i.mood));
    let oscillations = 0;
    for (let i = 1; i < scores.length - 1; i++) {
      const prev = scores[i - 1];
      const curr = scores[i];
      const next = scores[i + 1];
      if (
        (curr > prev && curr > next && Math.abs(curr - prev) >= 1) ||
        (curr < prev && curr < next && Math.abs(curr - prev) >= 1)
      ) {
        oscillations++;
      }
    }
    const oscRatio = oscillations / (scores.length - 2 || 1);

    if (explicitCount < 2 && oscRatio < 0.5) return null;

    const severity =
      explicitCount >= 3 || oscRatio >= 0.7 ? 'high' : 'medium';

    let desc;
    if (explicitCount >= 2) {
      desc = `"Hot & cold" behavior logged ${explicitCount} times across ${interactions.length} interactions.`;
    } else {
      desc = `Mood and engagement have alternated significantly across ${interactions.length} interactions — no stable baseline.`;
    }

    return makeSignal(
      'hot_and_cold',
      severity,
      'Hot & Cold Pattern',
      desc,
      explicitCount >= 2 ? explicitCount : interactions.length,
      'Oscillating behavior makes it hard to know where you stand.'
    );
  }

  /**
   * CONSISTENT EFFORT (positive signal)
   */
  function detectConsistentEffort(interactions) {
    if (interactions.length < MIN_INTERACTIONS) return null;

    const recent = interactions.slice(-5);
    const withGreenFlags = recent.filter((i) => (i.greenFlags || []).length > 0);
    const positiveMoods = recent.filter((i) => i.mood === 'great' || i.mood === 'good');

    if (withGreenFlags.length < 3) return null;
    if (positiveMoods.length < Math.ceil(recent.length * 0.6)) return null;

    const streak = withGreenFlags.length;
    const flags = recent.flatMap((i) => i.greenFlags || []).slice(0, 5);

    return makeSignal(
      'consistent_effort',
      'low',
      'Consistent Effort',
      `Green flags logged in ${streak} of the last ${recent.length} interactions. Positive patterns: ${flags.join(', ')}.`,
      streak,
      'They\'re showing up consistently. This is a good sign — keep noticing and reciprocating this energy.'
    );
  }

  /**
   * FADING INTEREST
   */
  function detectFadingInterest(interactions) {
    if (interactions.length < 6) return null;

    const early = interactions.slice(0, 3).map((i) => moodScore(i.mood));
    const recent = interactions.slice(-3).map((i) => moodScore(i.mood));

    const earlyAvg = mean(early);
    const recentAvg = mean(recent);

    if (earlyAvg === null || recentAvg === null) return null;

    const delta = earlyAvg - recentAvg;
    if (delta < 0.5) return null;

    const severity = delta >= 1.5 ? 'high' : delta >= 1.0 ? 'medium' : 'low';

    const moodLabel = (avg) => {
      if (avg >= 1.7) return 'mostly positive';
      if (avg >= 1.0) return 'mostly neutral';
      return 'mostly negative';
    };

    return makeSignal(
      'fading_interest',
      severity,
      'Fading Interest',
      `Interaction tone has shifted: first 3 were ${moodLabel(earlyAvg)}, most recent 3 are ${moodLabel(recentAvg)}. Score dropped from ${earlyAvg.toFixed(1)} to ${recentAvg.toFixed(1)}.`,
      6,
      'The energy is fading. Reflect on whether something changed or if they\'re gradually losing interest.'
    );
  }

  /**
   * ALL THE WORK
   */
  function detectAllTheWork(interactions) {
    if (interactions.length < MIN_INTERACTIONS) return null;

    const tagged = interactions.filter(
      (i) => i.initiatedBy === 'me' || i.initiatedBy === 'them'
    );
    if (tagged.length < MIN_INTERACTIONS) return null;

    const myInitiations = tagged.filter((i) => i.initiatedBy === 'me').length;
    const myRatio = myInitiations / tagged.length;

    const withRT = interactions
      .map((i) => ({ ...i, _rtNum: _rtMinutes(i.responseTime) }))
      .filter((i) => i._rtNum !== null);
    const avgRT = withRT.length >= 3 ? mean(withRT.map((i) => i._rtNum)) : null;

    const highInitiation = myRatio >= 0.80;
    const slowResponse = avgRT !== null && avgRT > 180;

    if (!highInitiation) return null;
    if (!slowResponse && myRatio < 0.85) return null;

    const severity = highInitiation && slowResponse ? 'high' : 'medium';

    const parts = [];
    const pct = Math.round(myRatio * 100);
    parts.push(`You initiated ${myInitiations} of ${tagged.length} interactions (${pct}%)`);
    if (slowResponse && avgRT !== null) {
      const fmt = (m) => m < 60 ? `${Math.round(m)}m` : `${(m / 60).toFixed(1)}h`;
      parts.push(`average response time is ${fmt(avgRT)}`);
    }

    return makeSignal(
      'all_the_work',
      severity,
      'Asymmetric Effort',
      parts.join('; ') + '.',
      tagged.length,
      'You\'re carrying the relationship. Real connections have mutual effort.'
    );
  }

  /**
   * SILENCE / FADING (time-since-last-interaction)
   */
  function detectSilenceFading(interactions) {
    if (!interactions.length) return null;

    const lastDate = interactions[interactions.length - 1].date;
    if (!lastDate) return null;

    const daysSince = daysBetween(lastDate, new Date().toISOString().slice(0, 10));
    if (daysSince === null) return null;

    if (daysSince > 14) {
      return makeSignal(
        'silence',
        'high',
        'Gone Quiet',
        `No interaction logged in ${Math.round(daysSince)} days.`,
        1,
        'A long silence can mean fading interest on either side. Reach out intentionally or accept the fade.'
      );
    }
    if (daysSince > 7) {
      return makeSignal(
        'silence',
        'medium',
        'Momentum Slowing',
        `Last interaction was ${Math.round(daysSince)} days ago.`,
        1,
        'Things have slowed down. Consider whether this is mutual or one-sided.'
      );
    }
    return null;
  }

  /**
   * RED FLAG ACCUMULATION
   */
  function detectRedFlagAccumulation(interactions) {
    if (!interactions.length) return null;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCount = interactions.reduce(function (sum, i) {
      const isRecent = i.date && new Date(i.date) >= thirtyDaysAgo;
      return sum + (isRecent && Array.isArray(i.redFlags) ? i.redFlags.length : 0);
    }, 0);

    const totalCount = interactions.reduce(function (sum, i) {
      return sum + (Array.isArray(i.redFlags) ? i.redFlags.length : 0);
    }, 0);

    if (recentCount >= 3) {
      return makeSignal(
        'red_flag_accumulation',
        'high',
        'Red Flags Stacking Up',
        `${recentCount} red flags logged in the last 30 days.`,
        recentCount,
        'Multiple recent red flags is a pattern, not a coincidence. Take a step back and assess.'
      );
    }
    if (totalCount >= 3) {
      return makeSignal(
        'red_flag_accumulation',
        'medium',
        'Red Flag History',
        `${totalCount} total red flags logged across all interactions.`,
        totalCount,
        'Red flags have been accumulating over time. Worth reviewing whether the pattern has improved.'
      );
    }
    return null;
  }

  // ─── Main Exports ─────────────────────────────────────────────────────────

  function analyzeSignals(personId) {
    const interactions = getInteractions(personId);
    if (interactions.length < MIN_INTERACTIONS) return [];

    const detectors = [
      detectBreadcrumbing, detectLowInitiation, detectResponseTimeDeterioration,
      detectGhostingPattern, detectHotAndCold, detectConsistentEffort,
      detectFadingInterest, detectAllTheWork, detectSilenceFading,
      detectRedFlagAccumulation,
    ];

    const signals = detectors.map((fn) => { try { return fn(interactions); } catch (e) { return null; } }).filter(Boolean);

    const hasAllWork = signals.some((s) => s.type === 'all_the_work');
    return signals.filter((s) => !(hasAllWork && s.type === 'low_initiation'));
  }

  function getPersonSignalSummary(personId) {
    const signals = analyzeSignals(personId);
    if (!signals.length) return { level: 'none', topSignal: null, count: 0 };

    const concern = signals.filter((s) => s.type !== 'consistent_effort');
    if (!concern.length) return { level: 'none', topSignal: signals[0].title, count: signals.length };

    const SEVERITY_RANK = { high: 3, medium: 2, low: 1 };
    const sorted = [...concern].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
    const topSignal = sorted[0];

    return { level: topSignal.severity, topSignal: topSignal.title, count: concern.length };
  }

  if (typeof root !== 'undefined') {
    root.analyzeSignals = analyzeSignals;
    root.getPersonSignalSummary = getPersonSignalSummary;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { analyzeSignals, getPersonSignalSummary };
  }
  if (typeof exports !== 'undefined') {
    exports.analyzeSignals = analyzeSignals;
    exports.getPersonSignalSummary = getPersonSignalSummary;
  }

})(typeof window !== 'undefined' ? window : this);
