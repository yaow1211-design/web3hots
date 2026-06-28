# Database Guidelines

> Database patterns and conventions for this project.

---

## Overview

<!--
Document your project's database conventions here.

Questions to answer:
- What ORM/query library do you use?
- How are migrations managed?
- What are the naming conventions for tables/columns?
- How do you handle transactions?
-->

(To be filled by the team)

---

## Query Patterns

<!-- How should queries be written? Batch operations? -->

(To be filled by the team)

---

## Migrations

<!-- How to create and run migrations -->

(To be filled by the team)

---

## Naming Conventions

<!-- Table names, column names, index names -->

(To be filled by the team)

---

## Common Mistakes

<!-- Database-related mistakes your team has made -->

### Scenario: Reserved Supabase storage config

#### 1. Scope / Trigger

- Trigger: changes that add or modify storage/database provider configuration, environment keys, table names, or bucket names.
- This project currently stores run outputs locally. Supabase is only a reserved free-plan target until a later cloud persistence implementation is built.

#### 2. Signatures

- Loaded app config shape: `AppConfig.defaultConfig.storage`.
- Domain type owner: `src/domain/types.ts`.
- Runtime validation owner: `src/config/schemas.ts`.
- Checked-in default owner: `config/default.json`.

#### 3. Contracts

- `storage.provider`: literal `"local"`.
- `storage.freePlan`: literal `"supabase"`.
- `storage.supabase.enabled`: must be `false` until a real Supabase write path exists.
- `storage.supabase.projectUrlEnv`: literal `"SUPABASE_URL"`.
- `storage.supabase.serviceRoleKeyEnv`: literal `"SUPABASE_SERVICE_ROLE_KEY"`.
- `storage.supabase.bucket`: non-empty string; current value is `"broadcast-bot-runs"`.
- `storage.supabase.tables.coreRuns`: non-empty string; current value is `"broadcast_core_runs"`.
- `storage.supabase.tables.socialRuns`: non-empty string; current value is `"broadcast_social_runs"`.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` may appear in `.env.example` as empty optional placeholders. Real service role keys must stay only in local `.env` and must never be committed.

#### 4. Validation & Error Matrix

- Missing `storage` -> zod validation fails before runner logic starts.
- `storage.provider !== "local"` -> zod validation fails.
- `storage.supabase.enabled !== false` -> zod validation fails with a message that cloud persistence is not implemented yet.
- Empty bucket or table names -> zod validation fails.
- Empty Supabase env placeholders -> allowed while the provider remains local and disabled.

#### 5. Good/Base/Bad Cases

- Good: local default config includes the complete reserved Supabase shape and `enabled: false`.
- Base: `.env.example` includes blank Supabase placeholders, and `loadConfig` still succeeds without requiring values.
- Bad: adding `@supabase/supabase-js`, live network calls, or real service role keys before the cloud persistence task exists.

#### 6. Tests Required

- Config loading test asserts the checked-in `config/default.json` exposes the exact local/Supabase reservation values.
- Schema validation test rejects attempts to enable Supabase before persistence exists.
- Existing runner tests with temporary `config/default.json` fixtures must include the required `storage` block so they keep testing runner behavior instead of failing early in config validation.
- Verification must include a dependency search for `@supabase` / `supabase-js` when the task is only reserving configuration.

#### 7. Wrong vs Correct

Wrong:

```json
{
  "storage": {
    "provider": "supabase",
    "supabase": {
      "enabled": true,
      "serviceRoleKey": "real_secret"
    }
  }
}
```

Correct:

```json
{
  "storage": {
    "provider": "local",
    "freePlan": "supabase",
    "supabase": {
      "enabled": false,
      "projectUrlEnv": "SUPABASE_URL",
      "serviceRoleKeyEnv": "SUPABASE_SERVICE_ROLE_KEY",
      "bucket": "broadcast-bot-runs",
      "tables": {
        "coreRuns": "broadcast_core_runs",
        "socialRuns": "broadcast_social_runs"
      }
    }
  }
}
```
