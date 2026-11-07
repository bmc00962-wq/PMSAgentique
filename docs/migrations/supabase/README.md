# PMS → Supabase: schema and security migration

Prepared on 2026-11-07. This package prepares a migration; it does not migrate the running application or export customer records.

## Get your migration files

1. Sign in to the PMS with the existing **platform super administrator** account.
2. Open **SaaS Admin** at `/saas-admin`.
3. In **Prepare Supabase migration**, click **Download migration ZIP** (the panel follows the global FR/EN/AR language selector).
4. Extract `pms-supabase-migration-YYYY-MM-DD.zip`. Start with its `README.md` and `manifest.json`.

The export service reads PostgreSQL catalogs in a repeatable-read, read-only transaction. It does not insert, update or remove application records, disable source RLS, change the source backend, or export secrets. A verified database membership with `role = platform_super_admin` and `status = active` is required. Client-editable metadata, supplied role names and tenant IDs are not accepted as proof of authorization.

The download uses the existing server-side `SUPABASE_DB_URL`; no database password is put into the browser. If the deployment cannot connect through that configured URL, the service returns an actionable error instead of fabricating a partial package. Contact OnSpace support for approved access if necessary.

## Observed source inventory

Read-only catalog inspection on the preparation date confirmed:

| Object | Observed count |
| --- | ---: |
| PostgreSQL version | 15.14 |
| Public application tables | 36 |
| Tables with RLS enabled | 36 |
| Public RLS policies | 175 |
| Application PostgreSQL functions | 5 |
| Custom triggers | 3 |
| Storage buckets | 0 |
| Storage policies | 0 |
| Non-owner schema/table/function privilege entries | 762 |
| Application functions with implicit PUBLIC execution | 5 |

The download re-reads live metadata. The manifest, not this static inventory, is authoritative for that download.

## ZIP contents and execution order

| File | Purpose | When to run |
| --- | --- | --- |
| `00_preflight.sql` | Refuse an occupied target; check Supabase roles and extension placement | First, on a fresh target |
| `01_tables.sql` | Columns, defaults/generated columns, primary/unique/check constraints, indexes and RLS flags | Second |
| `02_functions.sql` | Live function definitions including security-definer and search-path configuration | Third |
| `03_relationships.sql` | Foreign keys, including the profile link to target `auth.users` | Fourth |
| `04_security.sql` | Original public schema/table/function grants, defaults, policies and comments | Fifth |
| `05_storage.sql` | Bucket definitions and custom `storage.objects` policies; no files | Sixth |
| `07_install_triggers_AFTER_DATA.sql` | Original application/Auth triggers and enabled states | **Only after Auth and application record imports** |
| `06_validate_schema.sql` | Compare source metadata with restored metadata | **After step 07**, despite the filename numbering |
| `manifest.json` | Scope, current inventory, exclusions, warnings, SQL/guide SHA-256 checksums | Review before execution |
| `supabase/functions/...` | Existing four application Edge Functions and shared CORS source | Redeploy separately |
| `EDGE_FUNCTIONS_SCOPE.md` | Scope and portability caveats for existing function source | Review before redeployment |

Generated SQL is for a fresh staging Supabase project. It is transactional but not a rerunnable upsert migration. No script is executed automatically on either database. Objects belong to the destination migration administrator (`postgres`), not the original OnSpace platform owner; object-owner/grantor differences and default privilege inheritance must be reviewed.

The supported snapshot scope matches the currently observed schema: ordinary public application tables, application functions, constraints/indexes, public policies/grants, application-owned custom Auth/Storage triggers, and bucket/`storage.objects` policies. It is not a replacement for `pg_dump`. Public views, partitioned tables, sequences, enum/domain types, identity columns, or non-function routines cause a fail-closed error so an incomplete export cannot be mistaken for a full migration.

## Transfers not included

### Records and Auth identities

Ask OnSpace support for a consistent, approved record/Auth export or approved PostgreSQL access. Preserve user UUIDs, tenant UUIDs, memberships, foreign keys, and numeric precision. Import identities before `public.user_profiles`. Password hashes/identity portability must be explicitly confirmed; CSV user profiles do not preserve passwords.

Keep target signup and writes disabled and leave provisioning triggers uninstalled throughout the imports. Importing historical users with provisioning enabled can create duplicate tenants and memberships. New UUIDs require a deliberately designed mapping across every affected relationship; do not silently replace identities.

Application data has self/cyclic relationships. `ledger_entries.reversed_by` is a self-reference; `agent_runs` and `approval_requests` are linked. Use a reviewed transactional data restore or a phased import for nullable references. Omit generated columns such as computed reservation nights when importing. Alphabetical table-by-table CSV imports alone are not sufficient.

### Storage

The current source has no buckets, but any subsequently created buckets/policies are included at export time. File bytes are never included. Transfer them separately with authenticated Storage APIs, preserving object paths. Review persisted source URLs and signed URL expiration; copied bucket metadata is not a file backup.

### Edge Functions and configuration

The ZIP bundles exactly these repository source files: `create-reservation/index.ts`, `cancel-reservation/index.ts`, `can-user-perform/index.ts`, `send-message/index.ts`, and `_shared/cors.ts`.

Deploy all four application functions to the new Supabase project, using destination `SUPABASE_*` values. Recreate SMTP/email templates, redirect URLs, password and OTP settings, and any other provider secrets separately. Never copy source service-role credentials to the frontend or include `.env` in shared files. `send-message` references OnSpace AI and `ONSPACE_AI_KEY`; availability outside OnSpace is not guaranteed, so review that integration before promising AI functionality on the destination.

## Existing security caveats: preservation is not remediation

The source has broad API-role table grants, including operations not governed by RLS, and all five custom functions have implicit PUBLIC execution. All five application functions are SECURITY DEFINER; some do not declare a fixed search path. These are preserved for migration fidelity, not certified as safe. Review tenant provisioning and privileged RPC execution before production.

The existing frontend also contains fixed demo tenant IDs, a stub `resolveTenantContext`, and some fail-open/stub authorization paths. Several workflow functions perform separate writes despite comments describing atomic locking. Migrating the schema does not repair these issues. Test tenant isolation and role permissions through both the REST API and Edge Functions, not only through hidden UI controls.

The original `docs/DISASTER_RECOVERY.md` contains legacy operational assumptions. Do not assume its PITR, replica, simulated test results or authentication bypass suggestions describe capabilities of this OnSpace project. This migration does not implement any authentication bypass.

## Validation and cutover checklist

- [ ] Review SQL, original grants/SECURITY DEFINER functions, and manifest warnings with a developer.
- [ ] Restore into a new staging Supabase project, not the current OnSpace backend.
- [ ] Resolve extension-schema differences without blindly moving target extensions. Source `pgcrypto` is in `public`; an existing target extension in `extensions` deliberately blocks preflight pending review.
- [ ] Preserve identities and import approved records before enabling provisioning triggers.
- [ ] Run the generated metadata comparison and review every difference. PostgreSQL version rendering and owner/grantor differences require assessment, not automatic dismissal.
- [ ] Compare source/target counts and IDs for all 36 tables, plus finance totals and user/tenant links.
- [ ] Verify default privileges, object permissions, Storage metadata and file access separately.
- [ ] Test anonymous access, two unrelated tenants, inactive memberships, every operational role and guessed cross-tenant UUIDs.
- [ ] Test OTP/password login, signup, logout and redirects with the destination Auth configuration.
- [ ] Test concurrent/overlapping reservations, cancellation, partial failure recovery, and finance/audit consistency.
- [ ] Test all four deployed Edge Functions with destination JWTs; keep JWT verification enabled.
- [ ] Before cutover, pause source writes and obtain a final consistent data export; reconcile all late changes.
- [ ] Switch only the exported application's or newly created Supabase-backed project's environment to destination credentials. **This existing OnSpace project cannot change backend type in place.**
- [ ] Require users to sign in again. Do not transfer access/refresh tokens.
- [ ] Keep the source intact until restoration, security and operational tests pass.

## What was checked here

The table, policy and privilege-rendering catalog SELECTs were executed successfully against the source and returned the inventory above. No source DDL or record mutations were executed. Frontend parser/path-safety tests were added in `src/__tests__/migrationExport.test.ts`.

Browser download, deployment connectivity, automated test execution, destination restore, identity migration and staging functional/security tests have **not** been executed in this development session. These remain verification steps, not claimed results.

## Support request

A ready-to-send request is in `docs/migrations/supabase/ONSPACE_EXPORT_REQUEST.txt`. Do not include passwords or API secrets.

Official reference: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
