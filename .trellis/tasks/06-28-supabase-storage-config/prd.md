# Add Supabase storage config

## Goal

Reserve an optional Supabase-backed storage/database configuration while keeping the current local-only runtime behavior as the default.

The change should make the future cloud persistence choice explicit in checked-in configuration, schema validation, domain types, environment placeholders, and README guidance without adding a Supabase dependency or performing any live network writes.

## Confirmed Facts

- Runtime configuration loads `config/default.json`, `.env`, and `config/mia.json` through `src/config/loadConfig.ts`.
- `src/config/schemas.ts` owns zod validation for default config and environment variables.
- `src/domain/types.ts` owns exported TypeScript domain types for loaded config.
- `tests/config.test.ts` already exercises config loading and schema failures.
- This task is lightweight and PRD-only; no `design.md` or `implement.md` is required.

## Requirements

- Add a `storage` block to `config/default.json` with `provider: "local"`, `freePlan: "supabase"`, and disabled Supabase settings for project URL env name, service role key env name, bucket, and core/social run table names.
- Add optional Supabase placeholders to `.env.example`:
  - `SUPABASE_URL=`
  - `SUPABASE_SERVICE_ROLE_KEY=`
- Extend zod config validation so the new storage block is required and structurally validated.
- Extend domain types so consumers of `DefaultConfig` can access the typed storage settings.
- Document a "Free database/storage option: Supabase" in `README.md`.
- Preserve default behavior: `local` remains the configured provider and `supabase.enabled` remains `false`.

## Acceptance Criteria

- [x] Loading a valid config returns `defaultConfig.storage.provider === "local"` and the expected disabled Supabase reservation values.
- [x] Invalid storage config fails zod validation, covered by config/schema tests.
- [x] `.env.example` includes optional Supabase placeholders but no real secrets.
- [x] README states that Supabase is optional, not used by default, reserved for later cloud persistence, and service role keys must stay in `.env` and out of git.
- [x] No Supabase SDK is introduced and tests do not make live network calls.

## Notes

- TDD order: add failing config/schema tests first, then update config/schema/types/docs to pass.
