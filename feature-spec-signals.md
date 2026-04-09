# SignalTrace — Signal Analysis Feature Spec

**Version:** 1.0  
**Status:** Draft  
**Owner:** Product  
**Scope:** Detection logic, data model, presentation rules, integration with existing modules

---

## 1. What This Feature Is

Signal Analysis is the core intelligence layer of SignalTrace. It takes logged behavioral data across interactions with a tracked person and surfaces patterns — not impressions, not hunches, but observable patterns with timestamps and evidence.

The product does not tell the user what to think. It shows what the data actually says. The user decides what it means.

This is the differentiating capability that makes SignalTrace different from a journal. A journal stores what happened. Signal Analysis tells you what it looks like when you zoom out.

---

## 2. Design Principles

**2.1 Facts, not verdicts.**  
Every signal output must be traceable to specific logged events. No signal should contain editorial language ("red flag," "suspicious," "he's not interested"). The signal names, descriptions, and reads are neutral and factual.

**2.2 Show the data, not the interpretation.**  
Pattern reads are limited to: what the data shows, what this pattern typically indicates, and what would change the signal. The user draws the conclusion.

**2.3 Contradictions are surfaced, not smoothed over.**  
If a person shows both high responsiveness and consistent vague planning, both signals appear. The product does not average conflicting evidence into a neutral read. Conflict is information.

**2.4 Confidence is explicit.**  
Every signal carries a confidence level: Observing (emerging pattern, limited data), Confirmed (3+ consistent data points), Contradicted (pattern was present, has since reversed). Confirmed ≠ definitive. Observing ≠ irrelevant.

**2.5 No unsolicited advice.**  
Signal cards do not end with "you should..." statements. Optional action prompts (e.g., "Set as exit criteria") exist but are secondary and never prescriptive.

**2.6 Tone benchmark.**  
The product sounds like a sharp-minded analyst reviewing a case file — not a therapist, not a friend who hates your ex, not a wellness app. Clinical observation, precise language, no moralizing.

---

## 3. Data Inputs

Signals are generated from the following structured data sources. Each source requires specific logging behavior from the user or is extracted by the AI from free-text entries.

| Data Source | What It Captures | Logged By |
|---|---|---|
| **Interaction Log** | Date, type (text/date/call/other), who initiated, general tone | User or AI-assisted |
| **Statement Index** | Direct quotes, commitments made, stated intentions | User (tagged) or AI extraction |
| **Outcome Tracking** | Whether a stated plan or commitment materialized | User confirmation |
| **Response Time Log** | Timestamp of user message, timestamp of their reply | Auto-captured if integrated; manual otherwise |
| **Plan Log** | Plans proposed (by either party), specificity level, outcome | User entry + outcome confirmation |
| **Debrief Notes** | Free text after interactions; effort/depth/tone rating | User |
| **Effort Tags** | Plan quality, message depth, initiative signals per interaction | User (optional) or AI-extracted from debriefs |

**Minimum data for signal generation:**  
Most signals require a minimum of 3 logged interactions before entering Observing state, and 5+ before entering Confirmed state. Signals with fewer than 3 data points are not surfaced.

---

## 4. Signal Taxonomy

Ten signal types, organized into four categories.

---

### Category A: Investment & Effort

---

#### A1 — Initiation Imbalance

**What it detects:**  
Who is driving the majority of contact — messages, plans, follow-up.

**Input data:**  
Each interaction tagged with initiator (User / Them / Mutual). Last 10 interactions used for calculation.

**Detection logic:**  
- Observing: User initiated ≥ 65% of last 8+ interactions  
- Confirmed: User initiated ≥ 70% of last 10+ interactions, sustained over 2+ weeks  
- Contradicted: Ratio shifts to ≤ 50% user-initiated over last 5 interactions

**Signal read (example):**  
`You initiated 8 of the last 10 conversations. The 2 he initiated were both replies to your silence of 3+ days.`

**What would change this:**  
`If he initiates 3 of the next 5 conversations independently, this signal would shift to Observing.`

---

#### A2 — Effort Trajectory

**What it detects:**  
Whether the quality and effort of plans and communication is increasing, stable, or declining over time.

**Input data:**  
Effort tags per interaction (user-rated or AI-extracted from debrief notes). Tags: plan initiative level, specificity of plans proposed, message depth/length trend.

**Detection logic:**  
- Observing: Effort ratings declining across 3 consecutive interactions  
- Confirmed: Consistent decline across 5+ interactions, or a clear tier downgrade in plan quality (e.g., dinner → coffee → "come over")  
- Contradicted: Effort ratings increase after a period of decline

**Signal read (example):**  
`Plan quality has stepped down across your last 4 interactions: dinner reservation (Feb 14) → casual lunch, he chose (Feb 22) → no plan proposed, suggested you come to him (Mar 1) → last two interactions were text only, no plan discussed.`

**What would change this:**  
`A specific, effortful plan proposed by him — something requiring advance planning or accommodation of your schedule.`

---

#### A3 — Reciprocity Gap

**What it detects:**  
Asymmetry in emotional investment, information sharing, and responsiveness — whether the interaction is functionally one-directional.

**Input data:**  
Debrief notes tagged with: did he ask questions, did he reference past conversations, did he share personal information, message depth (shallow / medium / substantial).

**Detection logic:**  
- Observing: 3+ consecutive interactions where user is primary sharer / questioner  
- Confirmed: 5+ interactions with consistently low reciprocity scores; he does not ask questions, does not reference past conversations, does not offer unprompted personal information  
- Contradicted: Reciprocity score increases noticeably in last 3 interactions

**Signal read (example):**  
`In your last 5 conversations, you asked 14 questions. He asked 2. He has not referenced anything from previous conversations. You know his job, his last relationship, and his travel history. He has not asked about yours.`

---

### Category B: Consistency & Follow-Through

---

#### B1 — Stated-Action Gap

**What it detects:**  
Whether things he says — plans, intentions, commitments — are followed through with corresponding behavior.

**Input data:**  
Statement Index entries tagged as commitments or stated intentions + Outcome Tracking (whether the thing happened).

**Detection logic:**  
- Observing: 2 unresolved or unfulfilled commitments  
- Confirmed: 3+ commitments logged with outcome "did not happen" or "still pending after expected window"  
- Contradicted: Commitments start being fulfilled consistently

**Signal read (example):**  
`He has made 4 forward-looking statements across 3 weeks. None have materialized:  
— "I'll text you Wednesday" (Mar 4) → no contact until Mar 8  
— "Let's do something this weekend" (Mar 9) → no plan was set  
— "I want to take you to that place" (Mar 14) → no follow-up  
— "I'll send you that recommendation" (Mar 16) → not sent`

**What would change this:**  
`A commitment logged and fulfilled within the stated or implied timeframe.`

---

#### B2 — Plan Materialization Rate

**What it detects:**  
The percentage of proposed plans — by either party — that actually happen, specifically plans he proposed or agreed to.

**Input data:**  
Plan Log entries (who proposed, specificity level, outcome: happened / cancelled / rescheduled / never confirmed / still pending).

**Detection logic:**  
- Observing: <60% materialization rate across 5+ proposed plans  
- Confirmed: <50% materialization rate across 8+ proposed plans, or 3+ consecutive plans that did not happen  
- Contradicted: Materialization rate improves to >70% over last 5 plans

**Signal read (example):**  
`6 plans have been discussed. 2 happened. 4 did not:  
— Feb 23: "Saturday dinner" → cancelled day-of (rescheduled, then dropped)  
— Mar 1: "Next week sometime" → no plan set  
— Mar 8: "Wednesday drinks" → he cancelled, proposed new date, new date not followed up  
— Mar 15: "This weekend" → you did not hear back`

**Supplementary metric:**  
Who cancels more, and at what notice. Track: same-day cancellations vs. advance rescheduling.

---

#### B3 — Vague Planning Pattern

**What it detects:**  
A pattern of forward references ("soon," "next week," "we should do X") that function as engagement maintenance without generating actual plans.

**Input data:**  
AI extraction from logged messages and debrief notes. Phrases like "we should," "let's do," "soon," "sometime," "I want to," "next time" tagged automatically. Outcome: did a specific plan materialize within 5 days?

**Detection logic:**  
- Observing: 3+ vague forward references with no concrete plan following  
- Confirmed: 5+ vague references across 2+ weeks, with materialization rate <30%  
- Contradicted: Vague references begin being followed by specific plans within 48 hours

**Signal read (example):**  
`He has used vague forward references 6 times in 3 weeks. A specific plan has followed once.  
Phrases logged: "we should hang out soon" (x2), "I want to take you somewhere" (x1), "let's do something this weekend" (x2), "next week for sure" (x1).  
Average time between vague reference and next specific plan: 14 days (one instance). The other 5 did not result in a specific plan.`

**Note:** This signal pairs frequently with Stated-Action Gap and should be surfaced together when both are active.

---

### Category C: Availability & Timing

---

#### C1 — Contact Window Pattern

**What it detects:**  
Whether his contact is concentrated in a specific time window (hour of day, day of week) in a way that suggests structural unavailability outside that window.

**Input data:**  
Timestamp data from all logged incoming messages. Minimum: 15 data points.

**Detection logic:**  
- Observing: >70% of messages fall within a 4-hour window or specific 2-day cluster  
- Confirmed: >80% of messages consistently in the same window across 3+ weeks  
- Contradicted: Messaging pattern becomes more distributed over last 2 weeks

**Signal read (example):**  
`83% of his messages arrive between 9pm and midnight (Monday–Thursday). Weekend contact is rare: 4 messages total in 5 weeks, all Sunday evening.`

**Pattern read:**  
`This is a consistent structural pattern, not random variation. Contact during this window does not indicate general availability.`

**Note:** This signal does not speculate on the cause. It states the pattern. The user draws their own conclusion.

---

#### C2 — Re-engagement Trigger Pattern

**What it detects:**  
Whether re-engagement after gaps is triggered by specific conditions — your silence, your activity, weekends, or nothing predictable.

**Input data:**  
Gap periods (silences >72 hours) + what preceded re-engagement. Cross-referenced with: who had last contact, day of week, any notable external context the user logged.

**Detection logic:**  
- Observing: 2 gaps where re-engagement followed a specific condition  
- Confirmed: 3+ gaps where re-engagement follows the same trigger within a predictable window  
- Contradicted: He initiates contact outside pattern conditions

**Signal read (example):**  
`3 of 4 periods of silence ended with him reaching out within 12-24 hours of your last outreach stopping. The 4th ended after 6 days with no apparent trigger. Pattern: re-engagement correlates with your withdrawal, not with elapsed time alone.`

**What would change this:**  
`Unprompted contact during a period when you have not withdrawn and conversation is still active.`

---

#### C3 — Gap Escalation

**What it detects:**  
Whether the length of gaps between contact is increasing over time — a trend signal, not a single-instance signal.

**Input data:**  
Timestamps of all incoming contact. Average gap calculated across time buckets (week 1-2, week 3-4, month 2, etc.).

**Detection logic:**  
- Observing: Average gap has increased by >50% from first 2 weeks to current  
- Confirmed: Average gap has more than doubled; gap in last 10 days exceeds all previous gaps  
- Contradicted: Average gap decreases over a 2-week period

**Signal read (example):**  
`Contact frequency over time:  
— Weeks 1–2: Average gap 18 hours  
— Weeks 3–4: Average gap 36 hours  
— Weeks 5–6: Average gap 72 hours  
— Last 10 days: 1 message (6 days ago)`

---

### Category D: Depth & Progression

---

#### D1 — Advancement Stall

**What it detects:**  
Whether the relationship is advancing (deepening, more integration, more planning, more investment) or has plateaued at an early stage despite continued contact.

**Input data:**  
Depth ratings from debrief notes (user-rated: surface / medium / deep), whether any new "firsts" have occurred (first call, first meeting, first personal disclosure, first introduction to his world), plan quality trend.

**Detection logic:**  
- Observing: No depth progression across 4+ interactions  
- Confirmed: 6+ interactions logged, depth score stable or declining, no new milestones reached  
- Contradicted: Clear depth increase (new milestone, personal disclosure, integration into his life)

**Signal read (example):**  
`You have had 8 interactions across 5 weeks. Depth ratings have not increased since interaction 3. In the last 4 debriefs you rated conversations as "surface." He has not introduced any new personal context, initiated any deeper conversation topics, or moved toward meeting in person. Interaction pattern: text-heavy, no calls, no plans.`

---

#### D2 — Conflicting Signal Pair

**What it detects:**  
Directly contradicting evidence from the same person — cases where one behavior confirms interest and another contradicts it — making an averaged read unreliable.

**Input data:**  
Any two logged data points that stand in direct logical contradiction. AI compares: Statement Index vs. Outcome Tracking; high responsiveness score vs. low initiation score; warmth in messages vs. vague planning pattern; stated future interest vs. advancement stall.

**Detection logic:**  
This signal is triggered when two other signals conflict, or when AI detects a direct contradiction between a logged statement and a logged outcome. Minimum: 1 clear contradiction pair.

**Signal format:**  
Each Conflicting Signal Pair is shown as a matched set, not a score.

```
Signal A: [Behavior or statement that suggests interest/investment]
Source: [Where logged] · [Date]

Signal B: [Behavior or statement that contradicts Signal A]
Source: [Where logged] · [Date]

Pattern read: [What this conflict typically indicates]
What would resolve this: [What observation would allow a cleaner read]
```

**Example:**

```
Signal A: "He texted 'I really want to see you again' and 'you're different from everyone else I've dated'"  
Source: Statement Index · Mar 25

Signal B: He has not proposed a specific plan in the 9 days since that message.  
Source: Plan Log · Mar 26–Apr 3

Pattern read: Words indicate intent. Behavior indicates low initiative or structural unavailability. This conflict is between stated desire and demonstrated follow-through. This is not resolvable by word-level evidence alone.  
What would resolve this: A specific, confirmed plan proposed by him within the next 3 days.
```

---

## 5. Signal Output Structure

Each signal displayed in the app follows this structure:

```
[Signal Name]                              [Status: Observing / Confirmed / Contradicted]

[1–2 sentence data summary with specifics]

Evidence:
— [Data point 1 — timestamped]
— [Data point 2 — timestamped]
— [Data point 3 — timestamped]

Pattern read: [What this typically indicates — 1 sentence, clinical]

[Optional] What would change this: [Specific observable condition]
```

**Rules:**
- Signal name uses neutral language only (see taxonomy above)
- Evidence items use direct quotes or specific numbers — never generalizations
- Pattern reads use present tense, third person: "This pattern typically indicates..." not "He is..."
- No "you should" statements in signal cards
- Conflicting Signal Pairs always shown as pairs — never as a single averaged score

---

## 6. Signal Confidence Levels

| Level | Meaning | Visual Treatment |
|---|---|---|
| **Observing** | Pattern emerging, ≥3 data points, not yet sustained | Neutral indicator, no alert |
| **Confirmed** | Pattern consistent across ≥5 data points over ≥2 weeks | Active indicator, surfaces in summary |
| **Contradicted** | Was Confirmed, evidence has since reversed | Marked as reversed, kept in history |
| **Resolved** | No longer active — person ended or pre-mortem triggered | Moved to archive |

Signals do not expire. They stay visible until their status changes.

---

## 7. Where Signals Surface

### 7.1 Signals Panel — Object Detail Page

Primary location. Sits between `My Lens + Compatibility` and `What To Verify Next`.

- Shows all active signals for this person, ordered by: Confirmed first, then Observing, then Contradicted (collapsed)
- Each signal is expandable to show full evidence
- Conflicting Signal Pairs always fully expanded
- Count badge on section header: "3 signals active"

### 7.2 Dashboard Signal Indicator

Conditional. Appears in the person card on the Dashboard when ≥1 Confirmed signal is active.

- Shows signal count only: "2 confirmed signals"
- Does not name signals on the Dashboard (avoids out-of-context reads)
- Tapping opens directly to Signals Panel on Object Detail

### 7.3 Weekly Review

Each person's weekly summary includes a signals block:

```
James · Signals this week
────────────────────────────
New: Vague Planning Pattern (Observing)
Updated: Stated-Action Gap → Confirmed (was Observing)
No change: Initiation Imbalance (Confirmed)
```

### 7.4 Pre-Mortem Integration

When a signal reaches Confirmed status, the system checks whether any active Pre-Mortem exit criteria have been met.

- If met: Pre-Mortem notification fires (`Your pre-set exit criteria has been met`)
- If approaching: Status on exit criterion updates to `Approaching`
- The signal that triggered the check is linked in the exit criteria status

### 7.5 What To Verify Next

Confirmed signals and unresolved Conflicting Signal Pairs automatically populate `What To Verify Next` with specific observation prompts:

```
Based on Vague Planning Pattern:
→ Does he follow up with a specific plan after the next forward reference, and within what timeframe?

Based on Stated-Action Gap:
→ Log whether the "Wednesday text" he mentioned actually happens.
```

---

## 8. Signal Generation: Automatic vs. Manual

| Signal | Auto-generated | Requires user input |
|---|---|---|
| Initiation Imbalance | ✓ (if initiation tagged per interaction) | Tag who initiated each interaction |
| Effort Trajectory | Partial (from debrief notes) | Effort rating per debrief |
| Reciprocity Gap | Partial (AI extraction from debriefs) | Confirm or adjust AI-extracted scores |
| Stated-Action Gap | ✓ (AI flags from Statement Index) | Confirm outcomes in Outcome Tracking |
| Plan Materialization Rate | ✓ (from Plan Log) | Log plans + outcomes |
| Vague Planning Pattern | ✓ (AI extraction from message logs) | None required if messages are logged |
| Contact Window Pattern | ✓ (from timestamps) | Requires timestamp data — manual or integrated |
| Re-engagement Trigger | ✓ (from interaction log gaps) | None required |
| Gap Escalation | ✓ (from timestamps) | Requires timestamp data |
| Advancement Stall | Partial (depth ratings) | Depth rating per debrief |
| Conflicting Signal Pair | ✓ (cross-analysis of active signals) | None — generated from other signal data |

**AI-assisted extraction:**  
For users who log free-text, the AI scans debrief notes for signal-relevant data and prompts confirmation: "I noticed you mentioned he cancelled again. Want to log this in Plan Materialization?" The user confirms or edits before it's recorded. AI suggestions do not write to signal data automatically.

---

## 9. Signal Naming Reference

These are the display names used in the UI. All neutral. No loaded language.

| Internal ID | Display Name |
|---|---|
| A1 | Initiation Imbalance |
| A2 | Effort Trajectory |
| A3 | Reciprocity Gap |
| B1 | Stated-Action Gap |
| B2 | Plan Materialization Rate |
| B3 | Vague Planning Pattern |
| C1 | Contact Window Pattern |
| C2 | Re-engagement Trigger Pattern |
| C3 | Gap Escalation |
| D1 | Advancement Stall |
| D2 | Conflicting Signal Pair |

**Do not use in UI:** red flag, warning, suspicious, manipulative, toxic, unavailable (as verdict), stringing along, breadcrumbing, ghosting (as a signal label).

These words belong to the user's interpretation, not to the product's analysis layer.

---

## 10. What the Signals Feed Into

| Signal | Downstream module |
|---|---|
| Any Confirmed signal | Dashboard indicator, Weekly Review |
| Stated-Action Gap, Plan Materialization, Vague Planning | Pre-Mortem Exit Criteria check |
| Conflicting Signal Pair | Conflicting Signal Detection module (Object Detail) |
| Any Confirmed signal | What To Verify Next (auto-populates) |
| Advancement Stall, Effort Trajectory | Behavioral Prediction (informs next prediction) |
| All signals | AI Person Summary (factual basis for summary read) |
| All signals | Decision Journal (signals active at time of each decision entry are recorded) |
| Patterns across multiple people | About Me → Emotional Patterns (e.g., "You tend to continue past confirmed Stated-Action Gap signals") |

---

## 11. Signal History

Signals are never deleted. Once generated, they move through states:

`Observing → Confirmed → Contradicted → Resolved (archived)`

The full signal history for a person is accessible in the Timeline view, tagged as signal events:

```
Mar 8  · Vague Planning Pattern → Observing
Mar 22 · Vague Planning Pattern → Confirmed
Apr 1  · Stated-Action Gap → Observing
Apr 5  · Conflicting Signal Pair generated (Stated Intent vs. Plan Materialization)
Apr 9  · Pre-Mortem Exit Criteria #1 triggered
```

This history survives even after a person is marked Ended. It feeds into the Reflection Guide ("These signals were active when you made your decision") and into the About Me pattern layer.

---

## 12. Edge Cases and Guardrails

**12.1 Early-stage data scarcity**  
Signals are not generated until minimum data thresholds are met. The Signals panel shows: `Not enough data yet. Signals will surface as you log more interactions.` No placeholder signals, no guessing.

**12.2 Positive signal handling**  
Signals are not only negative. Effort Trajectory and Plan Materialization Rate can move in positive directions. When a signal that was Confirmed moves to Contradicted (e.g., Initiation Imbalance reverses), this is surfaced as an update:  
`Initiation Imbalance — no longer active. He initiated 4 of the last 5 conversations.`

**12.3 User can dispute a signal**  
Any signal can be flagged by the user as "context I haven't logged explains this." This pauses the signal from escalating for 7 days and prompts the user to add context. If context is added that genuinely contradicts the pattern, signal status updates. If no context is added after 7 days, signal resumes.

**12.4 Avoid over-triggering**  
A person can have a maximum of 5 active signals shown simultaneously (Conflicting Signal Pairs count as one). Lowest-confidence signals are collapsed behind a "See all" expansion. This prevents the Signals panel from becoming overwhelming and preserves the credibility of the most important signals.

**12.5 No cumulative "score"**  
Signals are not combined into a match score, risk score, or verdict. There is no "overall signal health" indicator. The user reads the individual signals and decides what they mean in aggregate. Aggregation encourages lazy reading. The product does not aggregate.

---

## 13. Tone Examples

### Correct

> `You initiated 8 of the last 10 conversations.`

> `He has referenced future plans 4 times in 3 weeks. No specific date has been set.`

> `Words indicate intent. Behavior indicates low initiative. This conflict is between stated desire and demonstrated follow-through.`

> `Contact frequency has decreased by approximately 75% since week 2.`

> `3 of 4 re-engagement instances followed a period where you had withdrawn contact.`

### Incorrect

> `He's not putting in effort.`

> `This is a red flag.`

> `He's clearly not serious about you.`

> `You deserve better than this.`

> `Based on these signals, you should consider ending this.`

---

## 14. Open Questions for Product Decision

1. **Timestamp data source:** Full signal fidelity requires message timestamps. Does the MVP require manual timestamp logging, or is integration with messaging platforms required? If manual, what is the minimum viable logging UI that doesn't add too much friction?

2. **AI extraction accuracy:** Vague Planning Pattern and Reciprocity Gap depend on AI extraction from free-text debrief notes. What is the acceptable false-positive rate before the AI should ask for confirmation rather than auto-tagging?

3. **Positive signal display:** Should positive signals (e.g., Effort Trajectory improving, Plan Materialization Rate high) surface proactively, or only in the context of a previously-active negative signal reversing? Proactive positive surfacing changes the feel of the product — worth a deliberate decision.

4. **Multi-person signal pattern:** At what point, if at all, does the product surface patterns across people? (e.g., "You have had Stated-Action Gap confirmed in 4 of your last 5 tracked people.") This touches About Me / pattern layer — needs separate spec if in scope.

5. **Signal in Committed state:** When a person is marked Committed, signals are archived. Should the archived signals remain visible for reference, or be hidden? The case for visible: they're part of the decision record. The case for hidden: they shift the relationship anchor page toward doubt instead of confidence.
