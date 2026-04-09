# SignalTrace — Technical Architecture

**Version:** 1.0  
**Date:** April 9, 2026  
**Status:** Draft for Review

---

## 1. Product Context

SignalTrace is a mobile-first AI dating decision system for women aged 25–40. Its core purpose is to help users convert messy, ambiguous dating signals into structured evidence, clear judgment, and deliberate action — replacing emotional reactivity with pattern-based reasoning.

The app is deeply personal. It stores intimate records: what people said, what they did, how the user felt, what decisions were made, and why. The architecture must treat privacy and data security as a first-order concern, not an afterthought.

---

## 2. Recommended Stack

### 2.1 Platform: Mobile-First, iOS Primary

**Recommendation: React Native (Expo) — iOS first, Android later**

Rationale:
- Target audience is explicitly iPhone users (per logo brief and product design)
- React Native with Expo enables rapid MVP iteration with near-native feel
- Shared codebase makes future Android expansion cost-efficient
- TypeScript throughout enables strong type safety across frontend and backend
- The app is UI/UX-intensive (complex cards, timelines, journals) — React Native handles this well at the MVP stage
- Alternative (Swift/SwiftUI native) would be faster and more polished at scale but requires significantly more engineering time; revisit post-PMF

**Key frontend libraries:**
- `Expo` (managed workflow) — OTA updates, push notifications, camera, audio
- `Zustand` — lightweight, non-boilerplate state management
- `WatermelonDB` — SQLite-based local database; supports offline-first and reactive queries
- `React Navigation` — navigation stack
- `expo-secure-store` — encrypted local key storage
- `expo-av` — voice note recording/playback
- Custom component library (no heavy UI kit; bespoke design per brand)

### 2.2 Backend: Supabase BaaS + Dedicated AI Service

**Primary backend: Supabase**

Supabase provides:
- **PostgreSQL** — relational database with full SQL power
- **Auth** — email/password, Apple Sign In, Google Sign In (Apple Sign In masks email for privacy)
- **Row Level Security (RLS)** — database-enforced multi-tenancy; users can only read/write their own rows
- **Storage** — encrypted object storage for voice notes
- **Edge Functions** — serverless functions (Deno/TypeScript) for business logic and AI orchestration
- **Realtime** — WebSocket subscriptions for live dashboard updates

**AI Service Layer: Supabase Edge Functions → OpenAI API**

AI calls are orchestrated server-side, not from the client, for two reasons:
1. API keys never touch the client device
2. Prompts can include server-side context (full history, user patterns) without transmitting raw personal data to a third-party SDK on-device

AI model: **OpenAI GPT-4o** (or GPT-4.1 as available)  
Fallback/cost optimization: GPT-4o-mini for lower-stakes analysis (signal categorization, quick summaries)

### 2.3 Infrastructure Summary

| Layer | Technology | Hosted By |
|---|---|---|
| Mobile app | React Native + Expo | User device / App Store |
| Database | PostgreSQL | Supabase (managed) |
| Auth | Supabase Auth | Supabase |
| File storage | Supabase Storage | Supabase (S3-compatible) |
| Business logic | Supabase Edge Functions | Supabase (Deno runtime) |
| AI analysis | OpenAI GPT-4o via Edge Functions | OpenAI API |
| Push notifications | Expo Push Notifications → APNs | Expo / Apple |

**Total external dependencies:** Supabase, OpenAI, Expo. No analytics SDKs. No advertising SDKs. No data brokers.

---

## 3. System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER DEVICE (iOS)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React Native App (Expo)                     │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │  UI Layer   │  │ Zustand Store│  │ WatermelonDB   │  │  │
│  │  │  (screens,  │◄─┤  (app state) │  │ (local SQLite  │  │  │
│  │  │   cards)    │  │              │  │  offline cache) │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │  │
│  │         │                │                   │           │  │
│  │         └────────────────┴───────────────────┘           │  │
│  │                          │                               │  │
│  │                    Supabase SDK                          │  │
│  └──────────────────────────┼───────────────────────────────┘  │
│                             │ HTTPS / WSS                       │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                        SUPABASE                                 │
│                             │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │                    Auth (JWT)                            │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │          PostgreSQL + Row Level Security                 │  │
│  │  (all personal data; RLS ensures user isolation)         │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │               Edge Functions (Deno/TS)                   │  │
│  │                                                          │  │
│  │  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ AI Orchestrator│  │Signal Analyzer│  │Notification │  │  │
│  │  │ (prompts,      │  │(conflict,     │  │Dispatcher   │  │  │
│  │  │  summaries)    │  │ prediction,   │  │(pre-mortem, │  │  │
│  │  │                │  │ fatigue)      │  │ fatigue,    │  │  │
│  │  └────────┬───────┘  └──────────────┘  │ energy)     │  │  │
│  │           │                             └─────────────┘  │  │
│  └───────────┼─────────────────────────────────────────────┘  │
│              │                                                  │
│  ┌───────────▼─────────────────────────────────────────────┐  │
│  │          Supabase Storage (voice notes, encrypted)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
           OpenAI API (GPT-4o)
           [called server-side only;
            no raw personal data in logs]
```

### 3.1 Key Data Flows

**New Interaction Logged:**
1. User fills debrief form on device → saved to WatermelonDB (local) immediately (offline support)
2. On sync: record pushed to Supabase PostgreSQL
3. Edge Function triggered: AI analyzes new interaction in context of full person history
4. AI result written back to `ai_analysis_cache` table
5. Client receives updated analysis via Supabase Realtime or next poll

**Pre-Mortem Exit Criteria Check:**
1. On every new Interaction or Signal write, Edge Function checks all active ExitCriteria for that person
2. If any criterion is `approaching` or `met`, inserts a Notification record
3. Push notification delivered via Expo → APNs

**Dating Fatigue Detection:**
1. Nightly Edge Function (cron) computes fatigue metrics per active user
2. Writes to `user_daily_metrics` table
3. If fatigue threshold crossed, inserts Notification and updates Dashboard state
4. Client reads Dashboard state on next open

**AI Person Summary / Conflicting Signals:**
1. Client requests fresh AI analysis (explicit refresh or auto-triggered after new interaction)
2. Edge Function assembles context: all Signals, Interactions, Statements for that Person
3. Context is stripped of any PII that isn't needed for analysis (e.g., platform name replaced with neutral label internally if needed)
4. GPT-4o called with structured prompt
5. Response stored in `ai_analysis_cache` with TTL; returned to client

---

## 4. Full Data Schema

All tables include implicit `created_at TIMESTAMPTZ DEFAULT now()` and `updated_at TIMESTAMPTZ` columns. All primary keys are UUIDs. All tables have RLS policies enforcing `auth.uid() = user_id`.

---

### 4.1 `users` (managed by Supabase Auth)

Standard Supabase Auth table. Extended via `user_profiles`.

---

### 4.2 `user_profiles`

Stores the "About Me" / Me Memory layer — what the user has learned about herself.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | unique; 1:1 with user |
| `display_name` | TEXT | optional; no real name required |
| `subscription_tier` | ENUM | `free` \| `beta` \| `paid` |
| `decision_capacity_baseline` | INT | historical best active-person count |
| `personal_standards` | JSONB | array of {standard, importance, is_dealbreaker} |
| `emotional_patterns` | JSONB | AI-detected user behavioral patterns |
| `growth_timeline` | JSONB | array of {event, date, note} milestones |
| `ai_calibration_stats` | JSONB | {predictions_total, confirmed, did_not_happen, accuracy_rate} |
| `onboarding_completed_at` | TIMESTAMPTZ | |
| `notification_settings` | JSONB | per-type notification prefs |
| `data_export_requested_at` | TIMESTAMPTZ | GDPR |
| `deleted_at` | TIMESTAMPTZ | soft delete; hard purge scheduled |

---

### 4.3 `persons`

The core entity — a person the user is tracking. Deliberately avoids requiring real names; user controls what they record.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `label` | TEXT | user-given name or nickname |
| `platform` | TEXT | "Hinge", "Bumble", "IRL", "App", "Other", etc. |
| `platform_identifier` | TEXT ENCRYPTED | optional; user's note to identify them on platform |
| `added_at` | TIMESTAMPTZ | when person was first added |
| `status` | ENUM | `continue` \| `observing` \| `stop_initiating` \| `waiting_deadline` \| `suggest_end` \| `ended` \| `committed` |
| `status_updated_at` | TIMESTAMPTZ | |
| `decision_deadline` | TIMESTAMPTZ | nullable; deadline for current decision |
| `priority_rank` | INT | user-assigned ordering on dashboard |
| `is_archived` | BOOLEAN | default false |
| `archived_at` | TIMESTAMPTZ | nullable |
| `committed_at` | TIMESTAMPTZ | nullable; when Committed status was set |
| `ended_at` | TIMESTAMPTZ | nullable |
| `end_reason` | TEXT | nullable; user's summary of why ended |
| `private_notes` | TEXT ENCRYPTED | general freeform notes |
| `metadata` | JSONB | tags, color label, any UI display preferences |

**Indexes:** `user_id`, `status`, `is_archived`, `priority_rank`

---

### 4.4 `interactions`

A logged event: a date, a text exchange, a phone call, an observation.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `person_id` | UUID FK → persons | |
| `type` | ENUM | `date` \| `text_exchange` \| `call` \| `observation` \| `quick_capture` \| `other` |
| `occurred_at` | TIMESTAMPTZ | when the interaction happened |
| `title` | TEXT | optional user label |
| `debrief_text` | TEXT ENCRYPTED | user's full written debrief |
| `overall_energy` | ENUM | `positive` \| `neutral` \| `negative` \| `mixed` \| `unclear` |
| `is_voice_note` | BOOLEAN | |
| `voice_note_storage_path` | TEXT | nullable; Supabase Storage path (encrypted at rest) |
| `voice_transcript` | TEXT ENCRYPTED | nullable; auto-transcribed text |
| `ai_analysis` | JSONB | AI's structured interpretation of this interaction |
| `debrief_quality_score` | FLOAT | AI-estimated richness of the debrief (for fatigue detection) |
| `is_debrief_skipped` | BOOLEAN | user logged event without debrief (fatigue signal) |

**Indexes:** `user_id`, `person_id`, `occurred_at`

---

### 4.5 `signals`

A specific, discrete piece of evidence: a statement, a behavior, a pattern observation. The atomic unit of the evidence layer.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `person_id` | UUID FK → persons | |
| `interaction_id` | UUID FK → interactions | nullable; signal may be standalone |
| `signal_type` | ENUM | `statement` \| `behavior` \| `response_time` \| `cancellation` \| `initiative` \| `follow_through` \| `pattern` \| `other` |
| `content` | TEXT ENCRYPTED | what was said or done |
| `is_verbatim_quote` | BOOLEAN | true if exact quote |
| `occurred_at` | TIMESTAMPTZ | |
| `source_type` | ENUM | `in_person` \| `text` \| `call` \| `observation` |
| `signal_valence` | ENUM | `positive` \| `negative` \| `neutral` \| `ambiguous` |
| `signal_category` | ENUM | `consistency` \| `initiative` \| `follow_through` \| `communication` \| `emotional_availability` \| `commitment` \| `alignment` \| `red_flag` \| `green_flag` |
| `ai_weight` | FLOAT | AI-assigned importance (0.0–1.0); null until analyzed |
| `ai_tags` | JSONB | array of AI-generated semantic tags |
| `user_verified` | BOOLEAN | user confirmed this signal's interpretation |

**Indexes:** `user_id`, `person_id`, `interaction_id`, `signal_valence`, `signal_category`, `occurred_at`

---

### 4.6 `exit_criteria`

Pre-Mortem: standards the user sets in advance, before emotional investment escalates.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `person_id` | UUID FK → persons | |
| `criterion_text` | TEXT ENCRYPTED | the exit condition |
| `status` | ENUM | `not_triggered` \| `approaching` \| `met` |
| `display_order` | INT | 1, 2, or 3 |
| `set_at` | TIMESTAMPTZ | when this criterion was created |
| `triggered_at` | TIMESTAMPTZ | nullable; when status changed to met |
| `dismissed_at` | TIMESTAMPTZ | nullable; if user chose Override |
| `revision_history` | JSONB | array of {previous_text, changed_at, changed_reason}; immutable append-only log |

**Notes:** `revision_history` is append-only. The system never deletes prior versions — this is what enables standards drift detection.

**Indexes:** `user_id`, `person_id`, `status`

---

### 4.7 `decision_journal_entries`

A chronological record of every deliberate decision the user made about a person.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `person_id` | UUID FK → persons | |
| `interaction_id` | UUID FK → interactions | nullable; decision linked to specific event |
| `entry_type` | ENUM | `continue` \| `pause` \| `status_change` \| `checkpoint` \| `committed` \| `ended` \| `reflection` \| `override_exit_criteria` |
| `new_status` | ENUM | the status set at this decision point |
| `rationale` | TEXT ENCRYPTED | user's written reasoning |
| `ai_recommendation` | TEXT | AI's recommendation at this moment |
| `ai_confidence` | ENUM | `high` \| `medium` \| `low` \| `insufficient_data` |
| `user_confidence` | INT | 1–5 user-rated confidence in the decision |
| `decision_made_at` | TIMESTAMPTZ | |

---

### 4.8 `reflections`

End-of-person reflection, generated when a person is Ended or Committed. Mirrors each other.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `person_id` | UUID FK → persons | |
| `reflection_type` | ENUM | `ended` \| `committed` |
| `ai_summary` | TEXT | AI-generated reflection narrative |
| `key_evidence` | JSONB | array of signal IDs that most supported the conclusion |
| `standards_met` | JSONB | which personal standards this person satisfied |
| `standards_unmet` | JSONB | which personal standards this person failed |
| `patterns_identified` | JSONB | patterns this person exhibited |
| `what_user_learned` | TEXT ENCRYPTED | user's own written reflection |
| `why_this_made_sense` | TEXT | committed only: AI-generated positive decision card |
| `generated_at` | TIMESTAMPTZ | |

---

### 4.9 `predictions`

AI behavioral predictions for a specific person.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `person_id` | UUID FK → persons | |
| `prediction_text` | TEXT | what AI predicts will happen |
| `timeframe_days` | INT | expected window for the prediction to be tested |
| `if_true_meaning` | TEXT | interpretation if prediction is confirmed |
| `if_false_meaning` | TEXT | interpretation if prediction does not occur |
| `generated_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | `generated_at + timeframe_days` |
| `outcome` | ENUM | null \| `confirmed` \| `did_not_happen` \| `inconclusive` |
| `outcome_recorded_at` | TIMESTAMPTZ | nullable |
| `outcome_confirmed_by` | ENUM | `user` \| `system` \| null |
| `linked_interaction_id` | UUID FK | nullable; the interaction that confirmed/denied the prediction |
| `model_version` | TEXT | which AI model generated this |

---

### 4.10 `conflicting_signal_pairs`

Explicitly surfaces contradictory evidence instead of averaging it away.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `person_id` | UUID FK → persons | |
| `signal_a_id` | UUID FK → signals | one side of the contradiction |
| `signal_b_id` | UUID FK → signals | the contradicting side |
| `ai_interpretation` | TEXT | AI's read: capability vs. willingness vs. insufficient data |
| `resolution_suggestion` | TEXT | what would resolve the conflict |
| `status` | ENUM | `active` \| `resolved` \| `dismissed` |
| `detected_at` | TIMESTAMPTZ | |
| `resolved_at` | TIMESTAMPTZ | nullable |
| `resolved_by_interaction_id` | UUID FK | nullable |

---

### 4.11 `notifications`

All system-generated alerts. Stored server-side; push delivery via Expo.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `person_id` | UUID FK → persons | nullable (some alerts are user-level) |
| `notification_type` | ENUM | `pre_mortem_triggered` \| `pre_mortem_approaching` \| `energy_overload` \| `fatigue_detected` \| `prediction_confirmed` \| `deadline_approaching` \| `committed` \| `weekly_reset` |
| `title` | TEXT | |
| `body` | TEXT | |
| `action_payload` | JSONB | deep link data for CTA buttons |
| `is_read` | BOOLEAN | default false |
| `read_at` | TIMESTAMPTZ | nullable |
| `action_taken` | TEXT | nullable; which CTA the user tapped |
| `action_taken_at` | TIMESTAMPTZ | nullable |
| `delivered_at` | TIMESTAMPTZ | nullable; when push was sent |

---

### 4.12 `user_daily_metrics`

Time-series snapshot of user activity and system-calculated load/fatigue scores. Powers Dating Energy Budget and Fatigue Detection. Computed nightly by a cron Edge Function.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `date` | DATE | the day this snapshot represents |
| `active_person_count` | INT | persons with status `continue` or `observing` |
| `interactions_logged` | INT | interactions logged this day |
| `debriefs_skipped` | INT | interactions with `is_debrief_skipped = true` |
| `decisions_postponed` | INT | deadlines extended or missed this day |
| `quick_capture_count` | INT | |
| `avg_debrief_quality` | FLOAT | mean `debrief_quality_score` for the day |
| `fatigue_score` | FLOAT | composite 0.0–1.0; triggers alert above threshold |
| `energy_load_score` | FLOAT | pipeline load vs. user's capacity baseline |
| `fatigue_alert_sent` | BOOLEAN | whether a notification was dispatched |

**Index:** `user_id, date` (unique composite)

---

### 4.13 `ai_analysis_cache`

Prevents repeated AI calls for the same data state. Invalidated when new signals or interactions are added.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `person_id` | UUID FK → persons | nullable for user-level analyses |
| `analysis_type` | ENUM | `person_summary` \| `momentum_health` \| `compatibility` \| `what_to_verify_next` \| `conflicting_signals` \| `behavioral_prediction` \| `reply_assistant` \| `weekly_review` \| `reflection` |
| `content` | JSONB | structured AI output |
| `generated_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | TTL; auto-invalidated on new relevant data |
| `input_hash` | TEXT | hash of the inputs used; detect when regeneration needed |
| `model_version` | TEXT | e.g., `gpt-4o-2024-08-06` |
| `prompt_tokens` | INT | for cost tracking |
| `completion_tokens` | INT | |

---

### 4.14 `weekly_reviews`

System-generated weekly summary, with user annotation layer.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | |
| `week_starting` | DATE | Monday of the review week |
| `ai_summary` | TEXT | AI narrative of the week |
| `patterns_surfaced` | JSONB | array of pattern observations |
| `persons_progressed` | JSONB | who moved status and how |
| `decisions_made` | JSONB | count by type |
| `fatigue_detected` | BOOLEAN | |
| `energy_overloaded` | BOOLEAN | |
| `user_notes` | TEXT ENCRYPTED | user's own reflection on the week |
| `generated_at` | TIMESTAMPTZ | |

---

## 5. Entity Relationship Summary

```
auth.users
  └─── user_profiles (1:1)

persons (many per user)
  ├─── interactions (many per person)
  │      └─── signals (many per interaction, also standalone)
  ├─── signals (direct, standalone)
  ├─── exit_criteria (up to 3 per person)
  ├─── decision_journal_entries (many per person)
  ├─── predictions (many per person)
  ├─── conflicting_signal_pairs (many per person, refs 2 signals each)
  ├─── reflections (1 per terminal state)
  └─── ai_analysis_cache (many, by analysis_type)

user_daily_metrics (many per user, one per day)
notifications (many per user)
weekly_reviews (one per user per week)
```

---

## 6. AI Feature Architecture

Each AI feature maps to a specific Edge Function endpoint and analysis type.

| Feature | Trigger | Model | Output stored in |
|---|---|---|---|
| Person Summary | Post-interaction sync | GPT-4o | `ai_analysis_cache` (person_summary) |
| Momentum Health | Post-interaction sync | GPT-4o-mini | `ai_analysis_cache` (momentum_health) |
| Conflicting Signal Detection | Post-interaction sync | GPT-4o | `conflicting_signal_pairs` + cache |
| Behavioral Prediction | Post-interaction sync | GPT-4o | `predictions` |
| What To Verify Next | On demand / post-interaction | GPT-4o | `ai_analysis_cache` |
| Reply Assistant | On demand | GPT-4o | `ai_analysis_cache` (ephemeral, short TTL) |
| Reflection Guide | On end/commit | GPT-4o | `reflections` |
| Why This Person Made Sense | On commit | GPT-4o | `reflections` (committed type) |
| Pre-Mortem Alert Check | Post-signal write (Edge Function) | Rules-based | `notifications` |
| Dating Fatigue Detection | Nightly cron | Rules + GPT-4o-mini | `user_daily_metrics` + `notifications` |
| Dating Energy Budget | Nightly cron | Rules-based | `user_daily_metrics` + `notifications` |
| Weekly Review | Weekly cron (Sunday night) | GPT-4o | `weekly_reviews` |

### 6.1 Prompt Design Principles

All AI prompts must:
- Receive structured context (JSON), not raw user text pasted inline
- Refer to the person by a neutral placeholder (`Person A`) internally if needed; labels are for display only
- Include explicit instructions to surface contradictions, not smooth them over
- Return structured JSON, not freeform prose, for programmatic parsing
- Include tone guidance: analytical, not prescriptive; observational, not judgmental; never tell the user what to feel

### 6.2 AI Calibration

Prediction accuracy is tracked in `user_profiles.ai_calibration_stats`. When a user confirms or denies a prediction outcome, the result is written back. This data is for in-app display only (showing the user how well the AI is doing), not used to fine-tune models.

---

## 7. Offline & Sync Strategy

The app must work in areas with poor connectivity (subway, etc.) and during moments when the user wants to log immediately after a date.

- **WatermelonDB** (on-device SQLite) is the primary read source for all UI
- All writes go to WatermelonDB first (instant, offline-capable)
- Supabase SDK syncs changes when connectivity is available
- AI analysis is asynchronous and non-blocking — the app functions fully without it
- If AI cache is stale and network is unavailable, UI displays last cached analysis with a timestamp
- Voice notes are queued locally and uploaded when online; UI shows "pending upload" state

---

## 8. Privacy & Security

This section is treated as a hard constraint, not a feature request.

### 8.1 Data Isolation

- **Row Level Security (RLS)** is enforced at the database layer for every table. Even if the application layer is compromised, a user cannot access another user's data.
- RLS policy pattern on all tables: `USING (auth.uid() = user_id)`
- No shared data, no aggregated profiles, no social features, no mutual matching

### 8.2 Encryption

| Data type | At rest | In transit |
|---|---|---|
| All database fields | Supabase managed (AES-256) | TLS 1.3 |
| Sensitive text fields (debrief, signals, quotes, notes) | Field-level application encryption (AES-256-GCM, key per user derived from auth token) | TLS 1.3 |
| Voice notes | Supabase Storage server-side encryption + client-side encryption before upload | TLS 1.3 |
| Local SQLite (WatermelonDB) | SQLCipher (database-level encryption on device) | N/A (local) |
| Auth tokens | Stored in `expo-secure-store` (iOS Keychain-backed) | N/A (local) |

Encryption keys for field-level encryption are derived from the user's auth session and never stored server-side. This means Supabase administrators cannot read the content of sensitive fields.

### 8.3 Authentication

- Apple Sign In supported — allows users to mask their real email address entirely
- Google Sign In supported as alternative
- Email/password as fallback
- JWT tokens; short-lived access tokens, longer-lived refresh tokens stored in iOS Keychain
- No session persistence in unencrypted local storage

### 8.4 AI Data Handling

- AI prompts are constructed server-side (Edge Functions), never on the client
- OpenAI API is called with `store: false` (no retention for model training, per OpenAI API policy)
- Prompts do not include user account identifiers — only opaque person/interaction IDs
- AI responses are not logged to any third-party analytics service
- No personally identifiable context (real names, platform usernames) is transmitted to OpenAI unless the user explicitly includes it in a quoted statement

### 8.5 No Tracking, No Analytics SDKs

- No advertising SDKs (no Meta Pixel, no Google Analytics, no AppsFlyer)
- No behavioral analytics (no Mixpanel, no Amplitude, no Segment) in MVP
- Internal usage analytics (if any) are strictly aggregate and self-hosted via Supabase queries
- Crash reporting: use Sentry with PII scrubbing enabled, or avoid entirely in early private MVP

### 8.6 Data Minimization

- Real names are never required. Users choose their own labels.
- Platform identifiers (e.g., Hinge username) are optional and encrypted if stored
- Photos and profile pictures of tracked persons are explicitly not stored (no image uploads of other people)
- Location data is not collected

### 8.7 User Rights (GDPR / CCPA Ready)

- **Data Export**: user can request full export of all their data as JSON
  - Implemented via Edge Function that assembles all user rows and generates a signed download URL
  - Delivered to registered email within 24 hours
- **Account Deletion**: hard delete of all user data on request
  - Cascade deletes all foreign key records
  - Supabase Storage objects deleted by separate cleanup job
  - Completed within 30 days (target: 72 hours)
- **Data portability**: export format is human-readable JSON with field descriptions
- `deleted_at` field enables soft-delete with scheduled hard purge, giving user a grace period to reconsider

### 8.8 Voice Note Security

- Voice notes are recorded using `expo-av` and encrypted client-side before upload to Supabase Storage
- The encryption key is derived from the user's session; Supabase sees only ciphertext
- Transcription (optional) is performed via OpenAI Whisper API, called server-side; transcripts are immediately encrypted before storage
- Voice note files are automatically deleted from Supabase Storage if the associated interaction is deleted

### 8.9 Threat Model Considerations

| Threat | Mitigation |
|---|---|
| Unauthorized access to another user's data | RLS at DB layer; JWT authentication on all API calls |
| Data breach at Supabase | Field-level encryption for sensitive text; Supabase cannot read content |
| Device theft | SQLCipher encrypts local DB; Face ID / biometric app lock (Expo local auth) |
| AI API key exposure | Keys stored only in Edge Function environment variables; never in client code |
| OpenAI data retention | `store: false` flag on all API calls; structured prompts minimize PII exposure |
| Compromised AI output used to manipulate user | Tone guidelines enforced in system prompt; AI outputs labeled as analysis, not instructions |
| Standards drift via AI | Pre-Mortem Exit Criteria revision history is append-only; modifications surfaced to user |

---

## 9. Phased Rollout Alignment

| Phase | Architecture focus |
|---|---|
| **Phase 1: Private MVP** | Core schema (persons, interactions, signals, exit_criteria, decision_journal); manual entry; basic AI summaries; Supabase Auth + RLS; iOS only |
| **Phase 2: Beta** | AI feature layer (conflicting signals, behavioral prediction, fatigue detection, energy budget); voice notes; push notifications; weekly review; WatermelonDB offline sync |
| **Phase 3: Scale** | Performance optimization; Android support; subscription billing (RevenueCat); AI calibration feedback loop; data export/deletion flows; Sentry integration |

---

## 10. Open Questions / Decisions Required

1. **Field-level encryption implementation:** Using a JS crypto library (e.g., `tweetnacl`) in Edge Functions adds latency but ensures Supabase cannot read sensitive content. The simpler alternative is trusting Supabase's server-side encryption (SOC 2 compliant). Decide based on threat model tolerance.

2. **AI model cost management:** GPT-4o is expensive at scale. Define which features use GPT-4o vs GPT-4o-mini, and whether AI analysis runs eagerly (post every interaction) or lazily (on demand). Recommend lazy for MVP to control costs.

3. **Apple Sign In requirement:** Apple requires Apple Sign In as an option whenever any third-party OAuth is offered (App Store rule). Plan for this from day one.

4. **Voice note transcription:** Whisper API transcription costs money. Decide whether transcription is automatic or user-initiated. User-initiated is recommended for MVP.

5. **Biometric app lock:** Should the app require Face ID / Touch ID to open? Given the sensitivity of the data, this is strongly recommended as a default-on setting from launch.
