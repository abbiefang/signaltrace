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
 *   mood:        'positive' | 'neutral' | 'negative',
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

  const MOOD_SCORE = { positive: 2, neutral: 1, negative: 0 };

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

  /** Gap in days between two ISO date strings. */
  function daysBetween(dateA, dateB) {
    const msA = new Date(dateA).getTime();
    const msB = new Date(dateB).getTime();
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
   * @returns {object}
   */
  function makeSignal(type, severity, title, description, evidenceCount) {
    return { type, severity, title, description, evidenceCount };
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

    const avg = mean(gaps);
    const sd = stdDev(gaps);
    if (avg === null || sd === null) return null;

    // Coefficient of variation: high variance relative to mean
    const cv = sd / avg;

    // Also look for the specific pattern: short gaps → long gap → short gaps again
    const longGapThreshold = avg + sd; // gaps more than 1 std dev above mean
    let burstThenGapThenBurst = false;

    for (let i = 1; i < gaps.length - 1; i++) {
      const before = gaps[i - 1];
      const current = gaps[i];
      const after = gaps[i + 1];
      if (
        before < avg &&
        current > longGapThreshold &&
        after < avg
      ) {
        burstThenGapThenBurst = true;
        break;
      }
    }

    if (cv < 0.7 && !burstThenGapThenBurst) return null;

    const severity = cv > 1.2 || burstThenGapThenBurst ? 'high' : 'medium';
    const maxGap = Math.max(...gaps).toFixed(1);
    const minGap = Math.min(...gaps).toFixed(1);

    return makeSignal(
      'breadcrumbing',
      severity,
      'Inconsistent Contact Pattern',
      `Contact frequency has varied significantly — gaps range from ${minGap} to ${maxGap} days (average: ${avg.toFixed(1)} days). Contact tends to cluster in bursts then go quiet, often resuming after silence.`,
      gaps.length
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

    if (myRatio < 0.75) return null;

    const severity = myRatio >= 0.9 ? 'high' : myRatio >= 0.82 ? 'medium' : 'low';
    const pct = Math.round(myRatio * 100);

    return makeSignal(
      'low_initiation',
      severity,
      'Low Initiation',
      `You initiated ${myInitiations} of ${tagged.length} interactions (${pct}%). They initiated ${theirInitiations}.`,
      tagged.length
    );
  }

  /**
   * RESPONSE TIME DETERIORATION
   * Detects a trend where response times are getting slower over time.
   * Compares average response time in the first half of interactions vs. the second half.
   * Works with both numeric responseTime (legacy) and string values from data.js
   * ("fast"|"normal"|"slow"|"no_response").
   */
  function detectResponseTimeDeterioration(interactions) {
    // Convert string responseTime to numeric minutes; exclude no_response / null
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
    if (ratio < 1.5) return null; // Less than 50% slower — not notable

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
      withRT.length
    );
  }


  /**
   * GHOSTING PATTERN
   * Detects repeated instances of being left on read or receiving no response.
   * Threshold: 2 or more such instances.
   *
   * data.js has no `status` field — maps `responseTime === 'no_response'` as the
   * ghosting indicator. Also accepts explicit `status` values for forward-compat.
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
      ghosted.length
    );
  }

  /**
   * HOT & COLD
   * Detects oscillating engagement — either via explicit 'Hot & cold' red flags
   * or by detecting alternating mood patterns in the interaction log.
   */
  function detectHotAndCold(interactions) {
    if (interactions.length < MIN_INTERACTIONS) return null;

    // Method 1: Explicit red flags
    const explicitCount = interactions.filter((i) =>
      (i.redFlags || []).some(
        (f) => f.toLowerCase().includes('hot') && f.toLowerCase().includes('cold')
      )
    ).length;

    // Method 2: Mood oscillation — alternating positive/negative scores
    const scores = interactions.map((i) => moodScore(i.mood));
    let oscillations = 0;
    for (let i = 1; i < scores.length - 1; i++) {
      const prev = scores[i - 1];
      const curr = scores[i];
      const next = scores[i + 1];
      // A peak or valley surrounded by values on the other side
      if (
        (curr > prev && curr > next && Math.abs(curr - prev) >= 1) ||
        (curr < prev && curr < next && Math.abs(curr - prev) >= 1)
      ) {
        oscillations++;
      }
    }
    const oscRatio = oscillations / (scores.length - 2 || 1);

    if (explicitCount < 2 && oscRatio < 0.4) return null;

    const severity =
      explicitCount >= 3 || oscRatio >= 0.6 ? 'high' : 'medium';

    let desc;
    if (explicitCount >= 2) {
      desc = `"Hot & cold" behavior logged ${explicitCount} times across ${interactions.length} interactions. Engagement level oscillates rather than trending consistently.`;
    } else {
      desc = `Mood and engagement have alternated significantly across ${interactions.length} interactions — no stable baseline.`;
    }

    return makeSignal(
      'hot_and_cold',
      severity,
      'Hot & Cold Pattern',
      desc,
      explicitCount >= 2 ? explicitCount : interactions.length
    );
  }

  /**
   * CONSISTENT EFFORT (positive / green signal)
   * Detects sustained positive engagement over recent interactions.
   * Low severity because this is a green signal — here severity means "salience."
   */
  function detectConsistentEffort(interactions) {
    if (interactions.length < MIN_INTERACTIONS) return null;

    // Look at the last 5 interactions, or all if fewer
    const recent = interactions.slice(-5);

    const withGreenFlags = recent.filter(
      (i) => (i.greenFlags || []).length > 0
    );
    const positiveMoods = recent.filter(
      (i) => i.mood === 'positive'
    );

    // Require green flags in >= 3 of last 5, and majority positive mood
    if (withGreenFlags.length < 3) return null;
    if (positiveMoods.length < Math.ceil(recent.length * 0.6)) return null;

    const streak = withGreenFlags.length;
    const flags = recent
      .flatMap((i) => i.greenFlags || [])
      .slice(0, 5); // top 5 most recent green flags for description

    return makeSignal(
      'consistent_effort',
      'low',
      'Consistent Effort',
      `Green flags logged in ${streak} of the last ${recent.length} interactions. Positive patterns: ${flags.join(', ')}.`,
      streak
    );
  }

  /**
   * FADING INTEREST
   * Compares average mood score of the first 3 interactions vs. the most recent 3.
   * Flags a meaningful decline in tone/energy over time.
   */
  function detectFadingInterest(interactions) {
    if (interactions.length < 6) return null;

    const early = interactions.slice(0, 3).map((i) => moodScore(i.mood));
    const recent = interactions.slice(-3).map((i) => moodScore(i.mood));

    const earlyAvg = mean(early);
    const recentAvg = mean(recent);

    if (earlyAvg === null || recentAvg === null) return null;

    const delta = earlyAvg - recentAvg;
    if (delta < 0.5) return null; // Less than half a mood tier — not notable

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
      `Interaction tone has shifted: first 3 interactions were ${moodLabel(earlyAvg)}, most recent 3 are ${moodLabel(recentAvg)}. Mood score dropped from ${earlyAvg.toFixed(1)} to ${recentAvg.toFixed(1)} (scale 0–2).`,
      6
    );
  }

  /**
   * YOU'RE DOING ALL THE WORK
   * Combined signal: high initiation rate AND slow / deteriorating response times.
   * More severe than either signal alone — indicates asymmetric investment overall.
   */
  function detectAllTheWork(interactions) {
    if (interactions.length < MIN_INTERACTIONS) return null;

    const tagged = interactions.filter(
      (i) => i.initiatedBy === 'me' || i.initiatedBy === 'them'
    );
    if (tagged.length < MIN_INTERACTIONS) return null;

    const myInitiations = tagged.filter((i) => i.initiatedBy === 'me').length;
    const myRatio = myInitiations / tagged.length;

    // Convert string responseTime to numeric minutes; exclude no_response / null
    const withRT = interactions
      .map((i) => ({ ...i, _rtNum: _rtMinutes(i.responseTime) }))
      .filter((i) => i._rtNum !== null);
    const avgRT = withRT.length >= 3 ? mean(withRT.map((i) => i._rtNum)) : null;

    // Requires high initiation imbalance AND evidence of low effort from them
    const highInitiation = myRatio >= 0.75;
    const slowResponse = avgRT !== null && avgRT > 180; // > 3 hours average

    if (!highInitiation) return null;
    if (!slowResponse && myRatio < 0.85) return null; // Only flag solo if initiation is very high

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
      tagged.length
    );
  }

  // ─── Main Exports ─────────────────────────────────────────────────────────

  /**
   * Analyzes all signals for a person.
   *
   * @param {string} personId
   * @returns {Signal[]} Array of signal objects. Empty array if insufficient data.
   *
   * Signal shape:
   *   { type: string, severity: 'high'|'medium'|'low', title: string,
   *     description: string, evidenceCount: number }
   */
  function analyzeSignals(personId) {
    const interactions = getInteractions(personId);

    if (interactions.length < MIN_INTERACTIONS) {
      return [];
    }

    const detectors = [
      detectBreadcrumbing,
      detectLowInitiation,
      detectResponseTimeDeterioration,
      detectGhostingPattern,
      detectHotAndCold,
      detectConsistentEffort,
      detectFadingInterest,
      detectAllTheWork,
    ];

    const signals = detectors
      .map((fn) => {
        try {
          return fn(interactions);
        } catch (e) {
          // Silently skip any detector that errors on partial data
          return null;
        }
      })
      .filter(Boolean);

    // Deduplicate: if both low_initiation AND all_the_work are present,
    // suppress low_initiation (all_the_work is the stronger composite signal)
    const hasAllWork = signals.some((s) => s.type === 'all_the_work');
    return signals.filter(
      (s) => !(hasAllWork && s.type === 'low_initiation')
    );
  }

  /**
   * Returns a summary of signal status for a person.
   * Useful for Dashboard cards and list views.
   *
   * @param {string} personId
   * @returns {{ level: 'high'|'medium'|'low'|'none', topSignal: string|null, count: number }}
   */
  function getPersonSignalSummary(personId) {
    const signals = analyzeSignals(personId);

    if (!signals.length) {
      return { level: 'none', topSignal: null, count: 0 };
    }

    // Exclude green signals from severity assessment
    const concern = signals.filter((s) => s.type !== 'consistent_effort');

    if (!concern.length) {
      return { level: 'none', topSignal: signals[0].title, count: signals.length };
    }

    // Severity priority: high > medium > low
    const SEVERITY_RANK = { high: 3, medium: 2, low: 1 };
    const sorted = [...concern].sort(
      (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
    );

    const topSignal = sorted[0];
    const level = topSignal.severity;

    return {
      level,
      topSignal: topSignal.title,
      count: concern.length,
    };
  }

  // ─── Expose to environment ─────────────────────────────────────────────────

  // Browser: mount on window
  if (typeof root !== 'undefined') {
    root.analyzeSignals = analyzeSignals;
    root.getPersonSignalSummary = getPersonSignalSummary;
  }

  // CommonJS / Node
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { analyzeSignals, getPersonSignalSummary };
  }

  // ESM
  if (typeof exports !== 'undefined') {
    exports.analyzeSignals = analyzeSignals;
    exports.getPersonSignalSummary = getPersonSignalSummary;
  }

})(typeof window !== 'undefined' ? window : this);
