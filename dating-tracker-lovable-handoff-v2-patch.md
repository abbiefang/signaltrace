# Lovable Handoff V2 补丁

## 说明

这份文档是对现有 `dating-tracker-lovable-handoff.md` 的增量补丁。
包含 6 个新方向的精简版本，适合直接追加到 handoff 文档末尾。

---

## New: Action Status Update

The unified action status set now includes a positive end state:

- `Continue`
- `Observing`
- `Stop initiating, wait for him`
- `Waiting for decision deadline`
- `Suggest end`
- `Ended`
- **`Committed`** (new)

Committed is the positive terminal state. When triggered, the Object Detail page shifts from decision mode to relationship anchor mode. The key new module is `Why This Person Made Sense` — a positive decision card that mirrors `Reflection`.

---

## New Capabilities to Add

### Must-Have MVP (add to existing list)

- `Committed status` + `Why This Person Made Sense` positive decision card
- `Pre-Mortem Exit Criteria`: user sets exit conditions before investing; system alerts when met

### Should Be In Beta (add to existing list)

- `Dating Energy Budget`: tracks pipeline load, warns when decision quality likely drops
- `Conflicting Signal Detection`: surfaces contradictory evidence explicitly instead of averaging it
- `Dating Fatigue Detection`: detects user burnout signals, suggests pausing
- `Behavioral Prediction`: predicts likely next behavior from each person based on pattern

---

## New Module Summaries for Lovable

### Committed Status

When user marks someone as Committed:
- Object Detail switches from decision page to anchor page
- `Next Move` is replaced by `Why This Person Made Sense`
- `Reflection` becomes positive: why this choice was well-supported
- Hero bar shows `Committed` status, no deadline
- Evidence and Timeline remain for future reference

### Pre-Mortem Exit Criteria

- Triggered on new person creation or after first date debrief
- User sets 1-3 exit conditions in advance
- Stored on Object Detail near Decision Journal
- System alerts when conditions are met
- Modifications are recorded (to detect standards drift)
- Display: status per criterion (`Not triggered` / `Approaching` / `Met`)

### Dating Energy Budget

- Tracks active + observing count vs. user's historical best range
- Conditional card on Dashboard when overloaded
- Suggests: pause lowest priority, focus on top 2-3
- Not always visible — only triggers when needed

### Conflicting Signal Detection

- New sub-section in Evidence module on Object Detail
- Pairs contradictory signals side by side with timestamps
- AI provides interpretation: capability issue vs. willingness issue vs. insufficient data
- Suggests what would resolve the conflict

### Dating Fatigue Detection

- Monitors: skipped debriefs, postponed decisions, declining input quality, stalled pipeline
- Conditional alert on Dashboard
- Suggests: short break, pipeline reduction, voice debrief instead of typing
- Writes to About Me emotional patterns

### Behavioral Prediction

- 1-2 predictions per active person based on Time Intelligence trends
- Shows: prediction, timeframe, what it means if true, what it means if false
- Lives near `What To Verify Next` on Object Detail
- User can confirm outcome for AI calibration
- Prediction accuracy tracked in AI Calibration

---

## Object Detail Page Order Update

Updated order with new modules:

1. `Hero Decision Bar` (now supports Committed state)
2. `Next Move` (becomes `Why This Person Made Sense` when Committed)
3. `Momentum Health + Readiness`
4. `My Lens + Compatibility`
5. `Conflicting Signals` (new — in Evidence or standalone)
6. `What To Verify Next + Behavioral Prediction` (merged or adjacent)
7. `Evidence`
8. `AI Person Summary`
9. `Timeline`
10. `Pre-Mortem Exit Criteria` (new)
11. `Decision Journal`
12. `Reflection`
13. `Reply Assistant`
14. `What This Person Is Teaching You`

---

## Dashboard Update

Two new conditional cards in the Pattern / Emotional Alert area:

### Energy Check (conditional)
- Trigger: active objects exceed user's historical best range
- Content: load count + suggestion to focus
- Actions: `Review pipeline` / `Pause lowest priority`

### Fatigue Alert (conditional)
- Trigger: fatigue signal threshold reached
- Content: behavioral evidence of burnout
- Actions: `Take a break` / `Focus on top 2`

---

## New Notification Types

- `Pre-Mortem Triggered`: exit criteria met, with End / Override / Review actions
- `Energy Overload`: pipeline too full, with Review / Dismiss actions
- `Fatigue Detected`: decision quality declining, with Pause / Focus actions
- `Prediction Confirmed`: AI prediction matched reality, with Review / End actions
- `Committed`: positive confirmation, with View decision card action

---

## Tone Examples for New Features

### Good
- `Your pre-set exit criteria has been met. This is you, from two weeks ago, reminding yourself.`
- `You are tracking 6 active people. Your best decisions usually happen with 3-4.`
- `His words say interest. His actions say delay. The conflict is between stated intent and actual follow-through.`

### Bad
- `You're burning out! Take a break NOW.`
- `He's clearly lying to you.`
- `You should definitely commit to this person.`
