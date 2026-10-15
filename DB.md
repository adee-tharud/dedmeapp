## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Nullable |
| `check_in_frequency_days` | `int4` |  |
| `reminder_time` | `time` |  |
| `grace_period_hours` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `caregivers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `name` | `text` |  |
| `email` | `text` |  |
| `phone` | `text` |  Nullable |
| `relationship` | `text` |  Nullable |
| `status` | `text` |  |
| `invite_token` | `uuid` |  |
| `invite_expires_at` | `timestamptz` | Nullable (defaults to now() + 72 hours) |
| `last_invite_sent_at` | `timestamptz` | Nullable |
| `created_at` | `timestamptz` |  |
| `caregiver_user_id` | `uuid` |  Nullable |
| `accepted_at` | `timestamptz` |  Nullable |

## Table `check_ins`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `checked_in_at` | `timestamptz` |  |

## Table `messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `recipient_name` | `text` |  |
| `recipient_email` | `text` |  |
| `recipient_phone` | `text` |  Nullable |
| `body` | `text` |  |
| `timing_type` | `text` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `escalation_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `stage` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `push_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `token` | `text` |  |
| `platform` | `text` |  |
| `created_at` | `timestamptz` |  |

## RLS Policies

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `caregiver reads watched profile` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM caregivers   WHERE ((caregivers.user_id = profiles.id) AND (caregivers.caregiver_user_id = auth.uid()) AND (caregivers.status = 'accepted'::text))))` | — |
| `insert own profile` | INSERT | public | PERMISSIVE | — | `(auth.uid() = id)` |
| `own profile` | ALL | public | PERMISSIVE | `(auth.uid() = id)` | `(auth.uid() = id)` |
| `select own profile` | SELECT | public | PERMISSIVE | `(auth.uid() = id)` | — |
| `update own profile` | UPDATE | public | PERMISSIVE | `(auth.uid() = id)` | `(auth.uid() = id)` |

### `check_ins`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `caregiver reads watched check-ins` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM caregivers   WHERE ((caregivers.user_id = check_ins.user_id) AND (caregivers.caregiver_user_id = auth.uid()) AND (caregivers.status = 'accepted'::text))))` | — |
| `own check-ins` | ALL | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `own messages` | ALL | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `caregivers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `accept invite by token` | UPDATE | public | PERMISSIVE | `(status = 'pending'::text)` | `(auth.uid() = caregiver_user_id)` |
| `caregiver accepts invite` | UPDATE | public | PERMISSIVE | `(auth.uid() = caregiver_user_id)` | `(auth.uid() = caregiver_user_id)` |
| `caregiver reads own link` | SELECT | public | PERMISSIVE | `(auth.uid() = caregiver_user_id)` | — |
| `insert own caregivers` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `own caregivers` | ALL | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| `select own caregivers` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `update own caregivers` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `escalation_events`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `own escalation log` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `push_tokens`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `own push tokens delete` | DELETE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `own push tokens insert` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `own push tokens select` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

