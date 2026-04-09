# Feature Spec: Interaction Logging
**Signal Trace — Core Feature**
Version: 1.0
Status: Ready for development

---

## 1. Overview

Interaction Logging is the primary data input mechanism of Signal Trace. Every piece of evidence the app surfaces — signals, patterns, timelines, conflict detection, AI summaries — originates from logged interactions.

An "interaction" is any meaningful event involving a tracked person: a date, a conversation, a text exchange, a cancellation, a moment of silence, a statement made, an action taken or not taken. The logging system must make it fast to capture a raw impression in under 30 seconds, and rich enough to support structured evidence review when the user wants to go deeper.

The system has two input modes:
- **Quick Capture**: minimum friction, captures the essential signal right after an event
- **Full Log**: structured debrief, used when the user has time and wants to build complete evidence

Both modes write to the same underlying data model. Neither is superior — Quick Capture entries are not incomplete, they are just less detailed. The app should never make the user feel penalized for using Quick Capture.

---

## 2. Data Model: Interaction Record

Each logged interaction produces one `Interaction` record attached to a `Person` object.

### 2.1 Core Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | auto | System-generated |
| `person_id` | UUID | auto | Foreign key to Person |
| `created_at` | timestamp | auto | Device time at save; immutable after creation |
| `edited_at` | timestamp | auto | Updated on any field change |
| `interaction_date` | date | required | Date the interaction occurred (not necessarily today) |
| `interaction_time` | time | optional | Approximate time; displayed as "morning / afternoon / evening / night" if time unknown |
| `type` | enum | required | See Section 3.1 |
| `channel` | enum | optional | See Section 3.2 |
| `duration` | enum | optional | "Under 30 min / 30–90 min / 1.5–3 hrs / 3+ hrs / All day" |
| `initiated_by` | enum | optional | "Me / Them / Mutual / Unknown" |
| `summary` | text | required | Free text, 1–500 characters. The core observation. |
| `energy_rating` | int 1–5 | optional | How the user felt during/after this interaction |
| `tags` | array[string] | optional | See Section 5 |
| `signals` | array[Signal] | optional | Structured signal entries; see Section 2.2 |
| `statements` | array[Statement] | optional | Direct quotes captured; see Section 2.3 |
| `follow_up_flag` | boolean | default false | Marks interaction as something to monitor |
| `is_deleted` | boolean | default false | Soft delete; see Section 7 |

### 2.2 Signal Sub-records

Each `Signal` within an interaction is a discrete piece of behavioral evidence.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | auto | |
| `interaction_id` | UUID | auto | |
| `category` | enum | required | See Section 3.3 |
| `valence` | enum | required | `Positive / Negative / Neutral / Unclear` |
| `description` | text | required | What was observed, in the user's own words |
| `is_flagged_conflict` | boolean | default false | System-set; see Conflicting Signal Detection |

### 2.3 Statement Sub-records

Verbatim or near-verbatim things the person said that the user wants to track.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | auto | |
| `interaction_id` | UUID | auto | |
| `quote` | text | required | The statement itself |
| `context` | text | optional | Brief context for why this was notable |
| `is_commitment` | boolean | default false | User marks if this was a stated commitment/plan |

---

## 3. Taxonomy

### 3.1 Interaction Types

| Value | Display Label | Description |
|---|---|---|
| `date_first` | First date | Initial in-person meeting |
| `date_subsequent` | Date | Any date after the first |
| `text_exchange` | Text / DM exchange | Significant text conversation (not casual catch-up) |
| `call_video` | Call or video call | Voice or video interaction |
| `cancelled` | Cancelled / rescheduled | They or user cancelled a planned meeting |
| `no_response` | No response | User sent a message; person did not respond |
| `ghosted_returned` | Returned after silence | Person re-initiated after a gap |
| `plan_made` | Plan made | A concrete future plan was agreed |
| `plan_vague` | Vague plan mentioned | "We should do something" — non-committal |
| `observation` | General observation | A behavior or pattern noticed, no direct interaction required |
| `matched` | Matched / connected | Initial match or introduction |
| `other` | Other | Free form |

### 3.2 Channel

| Value | Display Label |
|---|---|
| `in_person` | In person |
| `text_sms` | Text / iMessage |
| `app_dm` | App DM (Hinge, Bumble, etc.) |
| `instagram` | Instagram |
| `whatsapp` | WhatsApp |
| `phone_call` | Phone call |
| `video_call` | Video call |
| `other` | Other |

### 3.3 Signal Categories

| Value | Display Label | Examples |
|---|---|---|
| `initiative` | Initiative | Who reached out first; who planned; who followed up |
| `follow_through` | Follow-through | Commitments kept or broken; plans that materialized |
| `response_time` | Response time | How fast or slow they responded; pattern over time |
| `emotional_availability` | Emotional availability | Depth of conversation; personal sharing; presence on dates |
| `consistency` | Consistency | Whether words match actions across multiple interactions |
| `respect` | Respect | Whether they were on time, considerate, attentive |
| `investment` | Investment | Effort visible in planning, attention, remembering details |
| `clarity` | Clarity | Whether they were direct vs. vague about intentions |
| `physical` | Physical dynamic | Comfort, chemistry, physical cues |
| `red_flag` | Red flag | Any behavior that triggered concern |
| `green_flag` | Green flag | A notably positive behavior worth anchoring |
| `other` | Other | |

---

## 4. Add Interaction Flow

### 4.1 Entry Points

The "Add Interaction" action is accessible from three places:
1. **FAB (Floating Action Button)** on the Dashboard — requires person selection in Step 1
2. **"+ Log" button** on a Person Profile — person is pre-selected, skip to Step 2
3. **Quick Capture shortcut** from notification or widget — opens minimal Quick Capture overlay

### 4.2 Quick Capture Mode

Designed to be completed in under 30 seconds. Shown as a bottom sheet overlay, does not navigate away from current screen.

**Fields presented (in order):**
1. **Person** — dropdown, searchable, most recent persons shown first. Required.
2. **What happened?** — single free-text field, placeholder: *"What happened? One line is fine."* Required. 500 character limit.
3. **Type** — horizontal scroll chip row, single select. Default: none selected. Optional but nudged.
4. **How did it feel?** — 5-dot energy rating, unlabeled. Optional.
5. **Save** button — active as soon as Person + summary are filled.

**Behavior:**
- Saving Quick Capture creates a full Interaction record with all non-captured fields null/default
- After save: brief confirmation toast ("Logged"), sheet dismisses. No navigation.
- The user can optionally tap "Add more detail →" on the toast to expand into Full Log mode for this record

### 4.3 Full Log Mode

A dedicated screen (full-screen, not a sheet). Entered when:
- User taps "Log interaction" from Person Profile
- User expands a Quick Capture entry via "Add more detail"
- User taps "Debrief" from a date reminder notification

**Step 1 — Who and When**

Displayed at top, always visible, not a separate step screen:
- **Person** — if arriving from Person Profile, pre-filled and read-only. Otherwise, searchable dropdown.
- **Date of interaction** — date picker, defaults to today. User can set to past date. Cannot be set to future.
- **Approximate time** — optional, shows as time-of-day selector with 4 buckets: Morning / Afternoon / Evening / Night. Not a precise time picker.
- **Interaction type** — same chip list as Quick Capture but with all options visible (scrollable grid), not horizontal scroll strip.

**Step 2 — What Happened**

- **Summary** — text area, placeholder: *"What happened? What did you notice? How did it end?"* Required. 500 characters.
- **Channel** — single-select chip row. Optional.
- **Duration** — single-select chip row (Under 30 min / 30–90 min / 1.5–3 hrs / 3+ hrs / All day). Optional. Hidden if type is text_exchange, no_response, observation.
- **Initiated by** — single-select chip row (Me / Them / Mutual / Unknown). Optional.

**Step 3 — Signals (optional section, expandable)**

Section header: *"What did this tell you?"*
Collapsed by default if arriving from Quick Capture expansion; expanded by default if entering from Debrief flow.

The user can add one or more Signal entries. Each entry is an inline form:
- **Category** — dropdown from Signal Categories list. Required per entry.
- **Valence** — 4-option chip: Positive / Negative / Neutral / Unclear. Required per entry.
- **Description** — short text field (200 chars), placeholder varies by category:
  - Initiative: *"e.g. He planned the whole date without asking. Or: I always initiate texts."*
  - Follow-through: *"e.g. He confirmed plans the day before, as promised."*
  - Red flag: *"e.g. He was 20 minutes late with no message."*
- "+ Add another signal" link below each entry

UX rules:
- Signal entries can be added in any order, no minimum required
- Each entry has a trash icon to delete it inline
- No maximum enforced, but if user adds >5, show subtle nudge: *"That's thorough. You can always add more later."*

**Step 4 — Statements (optional section, expandable)**

Section header: *"Did they say anything worth saving?"*
Collapsed by default.

Each Statement entry:
- **Quote** — text field (300 chars), placeholder: *"What did they say, as close to word-for-word as you can."*
- **Context** — text field (200 chars), optional. Placeholder: *"Why does this matter? What were they responding to?"*
- **Mark as commitment** — toggle. Label: *"This was a stated plan or commitment."* Default off.
- "+ Add another quote" link

**Step 5 — Wrap-up**

- **Tags** — free-entry with suggestions, multi-select. See Section 5.
- **Follow-up flag** — toggle. Label: *"I want to watch this."* Subtext: *"This will show up in What To Verify Next."* Default off.
- **Notes to self** — optional text field. Private, not surfaced in AI analysis unless explicitly included. Placeholder: *"Anything you don't want to forget. This is just for you."*

**Save behavior:**
- "Save" button is always visible at bottom, becomes active once Person + summary are filled
- On save: navigate to Person Profile, scroll to Timeline section, new entry briefly highlighted

### 4.4 Debrief Flow (post-date prompt)

When a user logs a date-type interaction and saves, a debrief prompt appears:

*"Want to do a quick debrief while it's fresh?"*

Options: `Do it now` / `Remind me later` / `Skip`

If "Remind me later": push notification sent in 2–4 hours (system default) or user's preferred debrief window.

The debrief prompt specifically surfaces:
- What To Verify Next (from Person Profile, pre-loaded)
- Any active Pre-Mortem criteria and whether this interaction touched them
- A single AI-generated question: *"You said you wanted to see if he follows through. Did he?"*

The debrief does not create a new record — it adds depth to the already-saved interaction record.

---

## 5. Tagging and Categorization System

### 5.1 Purpose

Tags serve three functions:
1. User-defined filtering and search across the interaction feed
2. Lightweight categorization without requiring full signal structure
3. Source material for pattern detection across people and time

### 5.2 System-defined Tags (auto-suggested, user can remove)

Applied automatically by the app based on interaction type and signals:

| Tag | Auto-trigger condition |
|---|---|
| `first date` | type = date_first |
| `cancelled` | type = cancelled |
| `no response` | type = no_response |
| `came back` | type = ghosted_returned |
| `plan made` | type = plan_made or statement with is_commitment = true |
| `green flag` | any signal with category = green_flag |
| `red flag` | any signal with category = red_flag |
| `commitment made` | any statement with is_commitment = true |
| `worth watching` | follow_up_flag = true |

Auto-applied tags are shown with a subtle filled background vs. user-created tags which are shown with a bordered style. The distinction is visual only; both behave the same for filtering.

### 5.3 User-defined Tags

- User can type any tag freely; max 30 characters per tag
- As user types, existing tags used with this person are shown first, then global tag history
- Max 10 tags per interaction
- Tags are stored globally per user account, not per person — a tag used with one person can be used again with another
- No color system in v1; color tagging is a Phase 2 feature

### 5.4 Tag Management

- Tags can be added or removed at any time via Edit Interaction
- Removing a tag from one interaction does not remove it from others
- Global tag list is accessible via Settings > Tags
- In Settings, user can rename or merge tags (renamed everywhere retroactively)
- Deleting a tag removes it from all records; user must confirm

### 5.5 Tag-based Filtering

On Person Profile, interaction list can be filtered by tag. Tapping a tag in any interaction card opens a filtered view of that person's interactions with the same tag. Cross-person tag filtering (e.g., "show all 'cancelled' interactions across everyone") is a Phase 2 feature.

---

## 6. Person Profile View (Object Detail)

### 6.1 Purpose

The Person Profile is the central decision-support page for one tracked person. It synthesizes all logged interactions into structured analysis. It is read-optimized, not a data-entry screen.

### 6.2 Page Structure

Listed in display order:

---

**A. Hero Decision Bar** (sticky at top, always visible)

Contents:
- Person name + platform source (e.g., "Hinge · added Mar 18")
- Current action status (pill): Continue / Observing / Stop initiating / Waiting for decision deadline / Suggest end / Ended / Committed
- Decision deadline (if set): shown as "Decide by Apr 22" with days remaining
- Quick status change button: tapping opens a status picker bottom sheet

Status transitions:
- Any status → any status, user-controlled
- When set to `Ended` or `Committed`: confirmation modal with brief prompt before applying
- When set to `Committed`: triggers Committed flow (see Section 6.8)

---

**B. Next Move** (card below hero bar)

- AI-generated recommended action based on current evidence
- Single sentence, action-oriented: *"He set a specific plan. Confirm and observe follow-through."*
- Supporting reasoning shown on expand (2–3 lines)
- "This doesn't apply" → user can dismiss; action logged in Decision Journal
- When status = Committed: this module becomes "Why This Person Made Sense" (see Section 6.8)

---

**C. Momentum Health + Readiness**

- Visual indicator of current interaction momentum: Rising / Stable / Stalling / Declining
- Derived from: recency of last interaction, frequency trend, initiated_by distribution
- "Readiness" score (internal): probability this person will respond well to a specific next action
- Not shown as a number — shown as a qualitative label with brief explanation

---

**D. My Lens + Compatibility**

- User's stated priorities (from About Me / Profile Setup) mapped against observed evidence
- Displayed as match / mismatch / insufficient data per criterion
- E.g., "Initiative — Mismatch (you reached out first in 4 of 5 exchanges)"
- Only populated once there are ≥3 logged interactions with signals

---

**E. Conflicting Signals** (appears once system detects a conflict pair)

- Each conflict shown as a two-column card: Signal A vs. Signal B
- Both have timestamp and brief description
- AI read: one sentence interpreting the conflict
- Resolve prompt: what would resolve this if observed next
- "Mark as resolved" — user can dismiss if they have new evidence

---

**F. What To Verify Next + Behavioral Prediction**

Two sub-sections in one module:

*What To Verify Next*
- 1–3 questions derived from: open conflicts, unverified statements, pattern gaps
- Each is a simple question: *"Did he follow through on the dinner plan he mentioned?"*
- Tapping opens quick log flow pre-tagged with this verification context

*Behavioral Prediction* (appears after ≥4 interactions)
- 1–2 AI predictions about likely next behavior
- Format: Prediction / Timeframe / If true / If false
- Two action buttons per prediction: "This happened" / "This didn't happen"
- Confirmed predictions are logged to AI Calibration

---

**G. Evidence**

Structured list of all logged signals across all interactions, grouped by category:
- Initiative
- Follow-through
- Consistency
- ... etc.

Within each category: entries sorted by date (newest first). Each entry shows: date, interaction type, signal valence chip, description.

Filter bar at top of Evidence: All / Positive / Negative / Unclear

"View all" expands full list; collapsed view shows top 5 per category.

---

**H. AI Person Summary**

Paragraph-style summary of this person based on all logged evidence. Regenerated on each page load if new interactions exist since last generation. User can tap "Regenerate" manually.

Tone: factual, non-judgmental, grounded in logged data only. Does not speculate beyond evidence.

---

**I. Timeline**

Chronological list of all interactions, newest first. Each entry:
- Date + type icon
- Summary (first 100 chars, expandable)
- Tag chips
- Energy rating if logged
- Tap to view full interaction detail

Interaction types shown with distinct icons (date = calendar dot, text exchange = speech bubble, cancelled = X, etc.)

"+ Log interaction" button at top of Timeline section (shortcut).

---

**J. Your Exit Criteria** (Pre-Mortem)

Shown after user sets it, or prompted if not yet set (nudge card).

- Each criterion shown with status: Not triggered / Approaching / Met
- "Approaching" shown in amber, "Met" shown in red with action buttons
- On "Met": two buttons — `End It` and `Override (recorded)`
- Override is always allowed but always logged; no silent overrides
- "Edit criteria" link — opens edit sheet; shows original vs. proposed change; saves with timestamp

---

**K. Decision Journal**

Chronological log of user-authored decision entries and auto-generated milestones.

Auto-generated entries (system writes these):
- Person added
- Status changes
- Pre-Mortem criteria modifications
- Committed state entry

User-authored entries:
- Available from "+ Add note" button in this section
- Free text, 500 character limit
- Cannot be edited after 24 hours (enforces authenticity of the journal)
- Can be deleted at any time

---

**L. Reflection**

Surfaced when status = Suggest End or Ended. AI-generated guide:
- Why ending is the right call based on evidence
- What to take forward
- Pattern to watch for in the next person

When status = Committed: becomes "Why This Person Made Sense" (see Section 6.8).

---

**M. Reply Assistant**

Input: paste a message received. Output: suggested reply options with different tones (warm / neutral / assertive).

Not used for ghostwriting — framed as drafting support. Reply is never sent from within the app.

---

**N. What This Person Is Teaching You**

AI-generated 1–2 sentence insight about what this experience is revealing about the user's patterns.
Updated when interaction count crosses thresholds (3, 7, 15 interactions).
User can dismiss or save to About Me.

---

### 6.3 Person Profile Header (non-sticky)

Above the Hero Bar when scrolled to top:
- Name (editable inline)
- Platform / source (editable)
- Avatar / initials circle (no photo upload in v1; initials auto-generated from name)
- Date added to tracker
- Total interactions logged (e.g., "12 interactions")
- "Edit person" link → opens person detail edit sheet

### 6.4 Edit Person

Editable fields:
- Name
- Platform / source (Hinge / Bumble / Tinder / IRL / Friend intro / Other)
- Custom note (e.g., "met at Sarah's party") — not shown in analysis, just for user context
- Pre-Mortem exit criteria (also editable inline from Section J)

Non-editable:
- Date added
- Interaction history

### 6.5 Person List (for context)

The main list of all tracked persons is on the Dashboard. Sort options:
- Last interaction (default)
- Status
- Date added
- Name

Each person card on the list shows: name, platform, status pill, last interaction summary (truncated), days since last interaction.

---

## 7. Edit and Delete Behavior

### 7.1 Edit Interaction

Access: from Timeline entry, tap to open detail view → "Edit" button in top right.

Editing rules:
- All fields are editable except `created_at` and `person_id`
- `interaction_date` can be changed; editing it does not affect Timeline sort position (Timeline always sorts by `interaction_date`, not `created_at`)
- Adding signals/statements post-save is treated as editing; `edited_at` is updated
- If an interaction is edited after AI analysis has been run, a subtle label appears: *"Evidence updated since last AI summary"* on the AI Person Summary card. AI summary does not auto-regenerate; user triggers manually.

### 7.2 Delete Interaction

Access: from full interaction detail view → three-dot menu → "Delete"

Behavior:
- Confirmation modal: *"This interaction and all its signals will be removed permanently. This cannot be undone."*
- Hard delete of the interaction record and all child signal/statement records
- Soft delete is not used at the interaction level (user data, not system data)
- If the deleted interaction was the most recent one for a person, the Timeline shows the next most recent
- If the deleted interaction was the only one for a person, the person remains in the system with 0 interactions
- AI Person Summary is flagged as stale after deletion; user must manually regenerate

### 7.3 Delete Person

Access: Person Profile → "Edit person" → "Remove person" (destructive action at bottom)

Behavior:
- Confirmation modal: *"[Name] and all [X] logged interactions will be permanently deleted. This cannot be undone."*
- Hard delete of person + all interactions + all child records
- Person's tags are NOT deleted globally; tags from this person's interactions remain in the user's tag library

### 7.4 Undo / Recovery

- There is no undo for deletion in v1
- There is no export-before-delete flow in v1
- Export of all data is available globally via Settings > Export (CSV), which should be communicated to users before they delete

---

## 8. Edge Cases and Handling

### 8.1 Backdated Interactions

User can log an interaction with a past date, including dates before the person was added to the system.

Handling:
- Allowed without restriction
- Timeline re-sorts correctly
- AI summary processes all interactions regardless of entry order vs. chronological order
- If backdated date is before person's `created_at`, a subtle label shows on that interaction: "Added retroactively"

### 8.2 Logging Multiple Interactions on the Same Day

Allowed. Timeline shows them in the order they were created within that date, newest created_at first.

### 8.3 Duplicate Interactions

The app does not prevent duplicates. If a user logs the same date twice, both records exist. The user can delete one.

In a future phase: if two interactions share the same date and type within a 5-minute window, a "Did you already log this?" prompt appears on save.

### 8.4 Interaction Type Mismatches

Example: user selects type `date_subsequent` but logs no duration or signals. This is valid — the app cannot enforce completeness without penalizing quick capture.

The app will surface a nudge on the Person Profile: *"You have [X] interactions with no signals yet. Adding signals improves AI accuracy."* (Only shown if user has ≥5 unsignaled entries.)

### 8.5 Long Text Inputs

Summary field: 500 character hard limit with character counter shown at 400.
Signal description: 200 character hard limit.
Statement quote: 300 character hard limit.
If user pastes text that exceeds limits, it is truncated at the limit with no data loss — user is shown what was cut and asked to confirm or shorten manually.

### 8.6 Offline State

The app must function fully offline. Interactions logged offline are stored locally and synced on next connection. If a sync conflict occurs (unlikely in single-user app), the more recent `edited_at` wins.

### 8.7 Very Early Stage (0–2 interactions)

When a person has 0 or 1 interactions:
- AI Person Summary: not shown. Placeholder: *"Add a few more interactions to unlock AI analysis."*
- Conflicting Signals: not shown.
- Behavioral Prediction: not shown.
- Compatibility: not shown.
- What To Verify Next: shown with generic prompts based on interaction type only.
- Momentum: shown as "Not enough data yet."

All suppressed modules have placeholder states, not blank space, with clear messaging about what triggers them.

### 8.8 Person Marked Ended or Committed

When status = Ended:
- Person moves to "Ended" section at bottom of person list (or separate tab)
- All interactions remain fully accessible and editable
- Person can be reactivated — status changed back to any active state
- Reactivation is noted in Decision Journal automatically

When status = Committed:
- Person remains at top of list with `Committed` pill
- All active-mode modules (Next Move, What To Verify Next, Decision deadline) become read-only anchors
- Evidence and Timeline remain active and editable — the user may still want to log interactions within the relationship
- See Section 6.8 for full Committed page behavior

### 8.9 Pre-Mortem Criteria Already Met at Time of Logging

If a user logs an interaction and the data in that interaction triggers a Pre-Mortem criterion:
- System checks after save
- If met: push notification + in-app banner appears on Person Profile
- Banner is non-blocking; user can dismiss
- Pre-Mortem card in Section J updates status to "Met" automatically

### 8.10 Empty States

**Person has no interactions logged:**
- Timeline section shows: *"Nothing logged yet. Tap + to log your first interaction."*
- All other sections suppressed with clear "start here" guidance pointing to the log button

**User has no people tracked:**
- Dashboard shows onboarding prompt: *"Add your first person to start tracking."*
- No empty state shame copy; no urgency language

### 8.11 Signal Added to Wrong Interaction

User can edit the interaction and remove the signal. There is no "move signal to another interaction" feature in v1.

### 8.12 Statement Marked as Commitment — Then Proven False

User logs the statement with `is_commitment = true`. Later the commitment is broken.

The user should log a new interaction of type `date_subsequent` or `observation`, add a Signal with category `follow_through`, valence `Negative`, and description referencing what was not honored.

The app surfaces the original statement alongside this signal in the Conflicting Signals module automatically — words-to-action discrepancy is a core conflict type.

There is no "mark commitment as broken" action on the statement itself; all resolution is captured through new interactions.

---

## 6.8 Committed State — Full Behavior

When user sets status to Committed:

**Confirmation modal:**
> *"You're marking [Name] as Committed. This will save a decision record you can revisit anytime."*
> `Continue` / `Cancel`

**On confirm:**
1. Decision Journal receives auto-entry: *"Committed on [date]."*
2. Object Detail page restructures:
   - Hero Bar: status = Committed, no deadline shown
   - Next Move → "Why This Person Made Sense" (AI-generated positive decision card)
   - Reflection module → positive mode: *"Why this choice was evidence-based"*
   - Pre-Mortem, Decision deadline, Behavioral Prediction: archived (read-only, collapsed by default)
   - Evidence, Timeline, Decision Journal: fully retained and still editable

**"Why This Person Made Sense" card content (AI-generated):**
- Which of your stated standards did this person meet, and how
- The key behavioral evidence supporting the decision
- What distinguished them from people you ended
- Your most consistent judgment across all interactions
- One forward-looking note: *"The patterns that led here. Stay aware of them."*

**What does NOT change:**
- Interaction logging remains active — user can still log interactions
- Person remains in main list (not moved to archived)
- All history is fully accessible

---

## 9. Notification Touchpoints Related to Interaction Logging

| Trigger | Notification content | Actions |
|---|---|---|
| Date logged (type = date) | *"Want to do a quick debrief for your [Name] date?"* | Debrief now / Later / Skip |
| 48 hours since date logged with no debrief | *"Your [Name] debrief is still waiting."* | Debrief now / Skip |
| Pre-Mortem criterion met | *"Your pre-set exit criteria for [Name] has been met."* | Review / Override |
| No interaction logged for person in N days (user-configurable threshold) | *"Nothing logged for [Name] in [N] days."* | Log now / Dismiss |
| Behavioral prediction time window expires | *"Did [Name]'s behavior match what AI expected?"* | He did / He didn't |

Notification scheduling rules:
- Debrief prompt: sent 2–4 hours after date interaction is logged (default), or at user's configured debrief time
- All notifications respect user's Do Not Disturb hours (configurable in Settings)
- If user has dismissed the same notification type 3 times in a row: suppress and show in-app nudge only

---

## 10. AI Processing Notes for Developers

The following interaction fields are consumed by AI modules:

| AI Module | Consumes |
|---|---|
| AI Person Summary | summary, signals (all), statements, interaction_date, type, initiated_by |
| Conflicting Signal Detection | signals, statements (is_commitment), interaction_date across all interactions |
| What To Verify Next | signals (Unclear/Negative), statements (is_commitment), follow_up_flag |
| Behavioral Prediction | initiated_by, type, interaction_date, response timing (derived), signals (consistency, follow_through) |
| Momentum Health | interaction_date, initiated_by — across last 5 interactions |
| Compatibility | signals (all) mapped against user's stated priorities from About Me |
| Reflection / Why This Person Made Sense | signals, statements, Decision Journal entries, Pre-Mortem criteria |
| Pre-Mortem trigger check | type, signals, statements (is_commitment), interaction_date — evaluated on each interaction save |

AI modules should process only logged data. The system must never infer or speculate beyond what the user has explicitly recorded. If data is insufficient for a module, the module shows a suppressed state rather than generating a low-confidence output.

---

## 11. Open Questions for Product Decision

1. **Voice debrief**: V2 feature spec mentions voice input as a lower-friction debrief method. Should Quick Capture support voice-to-text in v1?

2. **Photo attachment**: Should the user be able to attach a screenshot (e.g., of a text conversation) to an interaction? This would feed into the Statement Index. Adds complexity but is a natural use case.

3. **Platform API integration**: Future state — can the app pull in matched-date timestamps or message timestamps from dating apps to pre-populate interaction dates? Out of scope for v1.

4. **Interaction visibility in Analytics**: Is there a separate Analytics view (e.g., "across all the people I've tracked, how often do I initiate?") or is cross-person analysis always surfaced through Dashboard pattern cards only?

5. **Edit window for Decision Journal**: Currently spec'd at 24-hour lock. Is this the right window? Should the lock apply only to the auto-generated entries or to user-authored entries too?

6. **Minimum content for debrief prompt**: Currently the debrief prompt is triggered for all date-type interactions. Should it only trigger when signals were NOT logged at time of save? (i.e., if user added signals, skip the debrief nudge)

---

*End of spec. Version 1.0 covers MVP and early beta scope. V2 extensions (Behavioral Prediction, Fatigue Detection, Energy Budget) are referenced but not fully specified here.*
