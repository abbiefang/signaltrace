# Signal Trace — Feature Priority

**Version:** MVP + Beta planning  
**Last updated:** 2026-04-09  
**Source files:** dating-tracker-v2-additions.md, dating-tracker-lovable-handoff-v2-patch.md, signal-trace-logo-brief.md

---

## Product Vision

Signal Trace is a mobile-first AI dating decision system for women who are intentional about how they invest time and attention. The core promise: turn messy, contradictory dating signals into clear judgment and deliberate action.

The product is not a dating diary or a mood tracker. It is a decision support system. Everything it does should reduce the gap between what a user observes and what she concludes.

---

## Core Problem Being Solved

When dating multiple people simultaneously, users face three compounding problems:

1. **Signal confusion** — One person's behavior is internally contradictory. Good texting, inconsistent follow-through. Said the right things, never plans. Users can see the pieces but can't synthesize them into a verdict.

2. **Standards drift** — Under emotional investment, users gradually lower their own exit criteria without noticing. They extend deadlines, rationalize red flags, and make the same excuses they'd never accept from a friend doing the same thing.

3. **Decision fatigue** — Tracking multiple people simultaneously degrades judgment quality. Users default to reactive decisions — responding to whoever shows up next — rather than proactive ones based on accumulated evidence.

The product addresses all three. The person who needs this app is already perceptive. She just needs structure to match her perception.

---

## MVP Must-Have Features

These are non-negotiable for a private MVP. Without them, the core loop doesn't close.

---

### 1. Person / Object Management
**What:** Create, view, and manage profiles for each person being tracked. Basic info: name, platform, date added, current status.  
**Why MVP:** Everything else hangs off this. No person records, no product.  
**Priority:** P0

---

### 2. Status System
**What:** A unified action status set applied per person. States:
- `Continue`
- `Observing`
- `Stop initiating — wait for him`
- `Waiting for decision deadline`
- `Suggest end`
- `Ended`
- `Committed` *(see module 9)*

**Why MVP:** This is how users operationalize a judgment. The status tells the user what to *do*, not just how to *feel*. Without it, the app is a log, not a decision tool. Committed must be in MVP because excluding positive terminal states makes the product feel like a culling machine, not a decision system — and that shapes first-impression perception.  
**Priority:** P0

---

### 3. Quick Capture / Interaction Logging
**What:** Low-friction input to log any interaction — date, text exchange, behavior, observation. Should not require the user to categorize or structure every entry at input time. Voice input is a plus, not a requirement.  
**Why MVP:** Users will drop the product the moment logging becomes work. High-quality later analysis requires consistent early capture. This is the data collection layer.  
**Priority:** P0

---

### 4. Evidence Module
**What:** Structured display of logged evidence per person, organized by type:
- Behavioral signals
- Statements / quoted language
- Interaction patterns

**Why MVP:** Evidence is the basis for all AI outputs and user decisions. Without a coherent evidence layer, the AI summary and decision journal have nothing to work with. The Statement Index (tracking what was said vs. what was done) is part of this.  
**Priority:** P0

---

### 5. Timeline
**What:** Chronological view of all interactions and events for each person. Dates, milestones, gaps.  
**Why MVP:** Time is one of the most important signals in dating. How long since the last date. How quickly he followed up. Whether pace has changed. This is not optional context — it is core evidence.  
**Priority:** P0

---

### 6. Decision Journal
**What:** A running log of decisions made per person, with date and brief rationale. Auto-populated when status changes. Also supports manual entries.  
**Why MVP:** Prevents retroactive rationalization. Users can see what they decided and why, at the time they decided it — not reconstructed after the fact. This is the accountability layer.  
**Priority:** P0

---

### 7. AI Person Summary
**What:** An AI-synthesized read of each person based on evidence. Not a sentiment score. A structured assessment: what the evidence supports, what remains unverified, what the key tension is.  
**Why MVP:** This is the primary AI output. Everything the app collects should produce something the user couldn't easily produce herself. If the AI summary is generic, the product fails its promise.  
**Priority:** P0

---

### 8. Hero Decision Bar + Next Move
**What:** Per-person decision interface showing current status, AI recommendation, and a concrete next action. The "what should I actually do this week" answer.  
**Why MVP:** Closing the loop from observation to action. Users need not just analysis but a directive. Next Move reduces the activation cost of acting on good judgment.  
**Priority:** P0

---

### 9. Pre-Mortem Exit Criteria
**What:** At person creation or after first date, user sets 1–3 exit conditions in advance. System tracks whether conditions are met and alerts the user. Edits are recorded to detect standards drift.  
**Why MVP:** This is the highest-leverage feature in the product for the core problem of standards drift. It works because the standard is set by the user, in her own words, before emotional investment sets in. The AI saying "end this" is easy to dismiss. The user from two weeks ago saying "end this if he cancels twice" is not. Pre-mortem and reflection are complementary — pre-mortem prevents entry into bad territory, reflection prevents re-entry. Both belong in MVP.  
**Sample copy:**
- At trigger: *"Your pre-set exit criteria has been met. This is you, from two weeks ago, reminding yourself."*
- At edit: *"This change has been recorded. Is this a judgment update or a standards drift?"*  
**Priority:** P0

---

### 10. Committed Status + Why This Person Made Sense
**What:** Positive terminal state when user enters a relationship. Object detail switches from decision mode to relationship anchor mode. Core new module: *Why This Person Made Sense* — an auto-generated positive decision card showing which standards were met, key evidence, and how this person differed from others who were ended.  
**Why MVP:** Without a positive exit state, the product is psychologically asymmetric — it only helps users leave, never helps them commit with confidence. That will hurt retention (users stop using the app when they find someone good) and will distort first impressions (feels like a red-flag detector, not a decision support tool). The committed card also serves a second purpose: it gives users evidence-based confidence during the anxiety of early relationship — "I didn't commit out of excitement, I committed because the evidence was consistent."  
**Priority:** P0

---

### 11. Dashboard
**What:** Overview of all active and observing people. Summary metrics: who needs a decision, who's overdue for contact, who has unresolved signals. Entry point to all Object Detail pages.  
**Why MVP:** Navigation and orientation. Without a coherent dashboard, users with multiple people tracked will lose the overview.  
**Priority:** P0

---

### 12. Debrief System
**What:** Structured post-date input flow. Prompts for what happened, what was said, how it felt, what changed in the assessment. Feeds directly into Evidence and AI Summary.  
**Why MVP:** Quick Capture handles the raw input. Debrief handles the synthesis. The combination gives the AI enough structured signal to produce meaningful analysis rather than just pattern-matching raw text.  
**Priority:** P0

---

## Beta / Should-Have Features

These belong in a Beta release. They require the MVP data layer to function properly. They also carry higher engineering and AI complexity.

---

### 13. Conflicting Signal Detection
**What:** Surfaces contradictory evidence within a single person explicitly — side by side, with timestamps. AI interprets the conflict: capability issue, willingness issue, or insufficient data. Suggests what would resolve it.  
**Why Beta, not MVP:** Requires sufficient evidence density to detect real contradiction vs. noise. Won't work meaningfully until users have logged several interactions. The core Evidence module is prerequisite.  
**Sample output:**  
- Signal A: *"He texted 'I really want to see you again' on Mar 25"*  
- Signal B: *"He has not proposed a specific date in the 8 days since"*  
- AI Read: *"Words suggest interest. Behavior suggests low initiative. The conflict is between stated intent and actual follow-through."*  
- Resolve: *"If he sets a specific plan within 3 days without prompting, upgrade. If not, this is a pattern, not a delay."*  
**Priority:** P1

---

### 14. Behavioral Prediction
**What:** 1–2 AI predictions per active person based on Time Intelligence trends and Statement Index consistency. Shows: prediction, timeframe, what it means if true, what it means if false. User confirms outcome, which feeds AI calibration.  
**Why Beta, not MVP:** Requires a track record of logged behavior per person to predict meaningfully. High risk of being wrong early and undermining trust. Should only surface once sufficient pattern data exists.  
**Priority:** P1

---

### 15. Reflection Guide
**What:** Post-ending structured reflection: why the end was the right call, what the pattern was, what this person taught the user. Positive mirror is the Committed card.  
**Why Beta:** Valuable for long-term self-awareness and learning from the pipeline, but not required to close the core decision loop. Also benefits from having multiple ended relationships in the system before it becomes insightful.  
**Priority:** P1

---

### 16. What To Verify Next
**What:** Per-person module that specifies 1–3 specific behaviors or statements to look for in the next interaction. Driven by unresolved evidence gaps and Conflicting Signal Detection.  
**Why Beta:** Depends on Conflicting Signal Detection and AI Summary quality. Could be a simplified version in MVP as part of Next Move, but the full verification-loop feature belongs in Beta.  
**Priority:** P1

---

### 17. Momentum Health + Readiness
**What:** Assessment of where a relationship is in terms of investment, reciprocity, and decision readiness. Signals when a decision point is approaching.  
**Why Beta:** Useful but interpretive. Requires calibration data and sufficient interaction history to be accurate rather than noise.  
**Priority:** P1

---

### 18. Reply Assistant
**What:** AI-assisted message drafting for difficult or pivotal conversations. Grounded in evidence and user's stated communication style.  
**Why Beta:** High value, but the quality depends entirely on having a rich evidence layer. In MVP, the AI doesn't have enough context to draft well. Also: getting this wrong (generic, off-tone replies) is worse than not having it.  
**Priority:** P1

---

### 19. About Me / Me Memory
**What:** User profile built from historical patterns — what standards they tend to maintain, what types they tend to excuse, how their decision quality correlates with pipeline size. Grows over time.  
**Why Beta:** Requires accumulated data across multiple people and multiple ended/committed outcomes. Has no meaningful output in a private MVP with limited history.  
**Priority:** P1

---

## Post-Beta / Future

These are valid product directions but should not shape MVP or Beta scope decisions.

---

### 20. Dating Energy Budget
**What:** Tracks active + observing pipeline size vs. user's historical best decision range. Conditional alert when load exceeds optimum.  
**Why post-Beta:** The "historical best range" baseline requires substantial usage history. Without it, the alert is an arbitrary threshold, not a personalized insight. The fatigue detection also depends on this data.  
**Priority:** P2

---

### 21. Dating Fatigue Detection
**What:** Passive monitoring of user behavioral signals — skipped debriefs, postponed decisions, declining input quality — to detect burnout and suggest pausing.  
**Why post-Beta:** Requires baseline behavioral data per user to distinguish "fatigued user" from "user who just doesn't log much." False positives here damage trust. Needs a trained baseline.  
**Priority:** P2

---

### 22. Weekly Reset
**What:** A weekly structured review prompt: who progressed, who stalled, what decisions are pending, what the user's state is.  
**Why post-Beta:** Valuable retention driver, but not core to the decision loop. MVP should focus on making single-person analysis excellent before adding cadence features.  
**Priority:** P2

---

### 23. Annual Review
**What:** Year-in-review view: patterns, commitments, decisions, growth.  
**Why post-Beta:** Requires a full year of data. Not relevant until product has been in users' hands for 6+ months.  
**Priority:** P3

---

## What Not to Build in MVP

| Feature | Reason to defer |
|---|---|
| Social / sharing features | Product is explicitly private and personal |
| Partner-facing features | Out of scope — this is a self-facing decision tool |
| Integration with dating apps | High complexity, fragile APIs, not core to decision support |
| Community / peer comparison | Risks normalizing low standards, not raising them |
| Gamification / streaks | Wrong incentive structure — this is not a habit app |
| Notification heavy design | Should surface insights on user's terms, not interrupt her |

---

## Priority Summary

| Priority | Features |
|---|---|
| **P0 — Private MVP** | Person management, Status system (incl. Committed), Quick Capture, Evidence, Timeline, Decision Journal, AI Person Summary, Hero Decision Bar + Next Move, Pre-Mortem Exit Criteria, Why This Person Made Sense, Dashboard, Debrief |
| **P1 — Beta** | Conflicting Signal Detection, Behavioral Prediction, Reflection Guide, What To Verify Next, Momentum Health, Reply Assistant, About Me / Me Memory |
| **P2 — Post-Beta** | Dating Energy Budget, Dating Fatigue Detection, Weekly Reset |
| **P3 — Future** | Annual Review, social/sharing, app integrations |

---

## Reasoning Notes

**On including Pre-Mortem and Committed in MVP:** Both are listed as V2 additions in the source documents, but both address the product's stated core problem more directly than most "base" features. Pre-Mortem is the single clearest intervention against standards drift — the app's most important job. Committed closes the product's psychological loop. Deferring either weakens the first impression significantly.

**On AI quality as a prerequisite:** Several P1 features (Reply Assistant, Behavioral Prediction, Conflicting Signal Detection) are only as good as the data layer beneath them. Shipping them before Evidence and Debrief are solid is a trust risk, not a shortcut. The AI outputs that are most likely to get users hooked are AI Person Summary and Next Move — both of which can operate on thin but structured data. Prioritize those.

**On scope discipline:** The product is not a CRM, a journal, or a self-help tool. Every feature should be evaluated against one question: does this help the user make a clearer, more evidence-based decision about whether to continue investing in a specific person? If the answer is "not directly," defer it.
