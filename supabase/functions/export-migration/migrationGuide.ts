import type { Snapshot } from './types.ts';

export function migrationGuide(snapshot: Snapshot, generatedAt: string): string {
  return `# PMS → Supabase migration package

Generated: ${generatedAt}; source PostgreSQL ${snapshot.version}.
Inventory: ${snapshot.tables.length} public tables, ${snapshot.policies.length} public policies, ${snapshot.functions.length} application functions, ${snapshot.triggers.length} custom triggers, ${snapshot.storage.length} Storage buckets.

## Important scope
This is a live catalog-derived SCHEMA/SECURITY package, NOT a full backup or a completed migration.
No customer records, Auth identities/passwords, sessions, file contents, or secret values are included.
The ZIP also includes existing Edge Function source code from the application repository when downloaded through SaaS Admin. Review its runtime dependencies separately.
Metadata is read through one fixed, STABLE catalog RPC using the verified caller's JWT; no direct PostgreSQL connection is required. The source-only export_migration_catalog helper and its execution grants are excluded from this destination package.

## Restore order (fresh staging Supabase project only)
1. Create a new Supabase project and back up any destination data. Never run these scripts on OnSpace Cloud.
2. Review the SQL and manifest warnings. Confirm target postgres role, PostgreSQL compatibility, exposed schema, and extension schemas. If pgcrypto is already in extensions while the source uses public, preflight deliberately stops: have a developer review schema-qualified crypto dependencies; do not relocate platform extensions blindly.
3. Run 00_preflight.sql, then 01_tables.sql, 02_functions.sql, 03_relationships.sql, 04_security.sql, 05_storage.sql, in that order. Each file is transactional and aborts on conflicts; these are not rerunnable upserts.
4. Keep signup and application writes closed in the destination. Import Auth identities with preserved UUIDs using an approved migration process BEFORE importing public.user_profiles. Do not copy managed auth/storage schema DDL over the target.
5. Import approved application data with original IDs and monetary precision. Keep provisioning triggers uninstalled during both imports so user restoration cannot create duplicate tenants. Circular relationships exist: ledger_entries.reversed_by is a self-reference and agent_runs/approval_requests are linked. Use a reviewed transactional data dump or load nullable references in phases; alphabetical CSV imports are not a complete restore strategy.
6. Run 07_install_triggers_AFTER_DATA.sql ONLY after Auth and public data are imported. Missing identity exports cannot be replaced by inserting public profiles alone. If UUID preservation is not possible, design and validate an explicit ID mapping first.
7. Run 06_validate_schema.sql. Any returned metadata difference needs review. Separately compare all source/target row counts and IDs, verify default privileges and Storage bucket metadata, and perform the tests below. The schema comparison does not prove customer isolation.
8. Transfer Storage files via authenticated Storage APIs; preserve bucket/path and rewrite persisted source URLs only after checking the mapping. Storage metadata alone does not transfer file bytes.
9. Deploy create-reservation, cancel-reservation, can-user-perform and send-message from the included supabase/functions directories. SUPABASE_* values must belong to the DESTINATION; never copy the source service-role key. Keep JWT verification enabled and verify every function authorizes its caller.
10. Recreate SMTP/OTP templates, password policy, redirect URLs, provider configuration and secrets. Source OTP length is 4, minimum password length 6, expiration 3600s, signup enabled, Google disabled; verify what the target supports instead of assuming identical settings. send-message references OnSpace AI and ONSPACE_AI_KEY; its availability outside OnSpace must be confirmed or the AI path adapted separately. No AI credentials are included.
11. Use an exported application or a new OnSpace project created with Supabase selected. This existing OnSpace Cloud project cannot switch backend in place. Set the destination URL and public client key in that NEW environment, not in the current project's generated variables.
12. During cutover, pause source writes, capture a consistent final data export, reconcile row counts and finance totals, test the destination, then change the deployed application. Keep the original project intact for recovery. Old sessions will require reauthentication; do not transfer session tokens.

## Mandatory staging tests
- Anonymous users cannot read tenant operational records; active plans remain public as intended.
- Tenant A cannot read or write Tenant B records, including guessed UUIDs and linked foreign keys.
- Inactive memberships receive no operational access; every application role has its expected limitations.
- Test both authenticated API calls and Edge Functions; RLS alone does not enforce all business-role permissions.
- Signup produces one profile, one tenant and the intended membership after triggers are installed.
- Sign-in, OTP verification, password setting, sign-out and redirects work in Preview and standalone deployment.
- Create/modify/cancel a reservation; test overlapping simultaneous requests, partial failures and finance/audit consistency. Existing function comments are not proof of transactional locking.
- Restore user IDs, ownership links and membership roles; never grant platform_super_admin through client-editable metadata.
- Review PUBLIC execution of SECURITY DEFINER functions and wide API-role grants before enabling production.

## Preserved behavior is not a security certification
${snapshot.warnings.map(w => '- ' + w).join('\n')}

## Missing exports: request from OnSpace support
Contact contact@onspace.ai for an approved consistent record/Auth export or approved PostgreSQL access. Preserve tenant/user UUIDs, password portability (if supported), grants/trigger customizations and encrypted-data prerequisites. CSV files alone cannot preserve Auth passwords, all column types, cyclic dependencies or schema security.

## References
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- docs/migrations/supabase/README.md in your exported project

The manifest contains SHA-256 checksums for server-generated SQL/guide files. Existing Edge Function code is bundled separately by the client and must be code-reviewed and redeployed; it is not part of the catalog's single-statement metadata snapshot.
`;
}
