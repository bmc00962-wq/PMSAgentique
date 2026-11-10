import { z } from 'zod';
import type { MigrationBundle } from '@/types/migration';

const SAFE_FILENAME = /^(?:\d{2}_[A-Za-z_]+\.sql|README\.md|manifest\.json)$/;
const bundleSchema = z.object({
  formatVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  files: z.record(z.string().regex(SAFE_FILENAME), z.string().max(2_000_000)),
});
const manifestSchema = z.object({
  formatVersion: z.literal(1), scope: z.literal('schema-and-security-only'), completeDatabaseBackup: z.literal(false),
  counts: z.object({ tables: z.number().int().nonnegative(), policies: z.number().int().nonnegative() }),
  checksums: z.record(z.string().regex(SAFE_FILENAME), z.string().regex(/^[a-f0-9]{64}$/)),
});

export function parseMigrationBundle(input: unknown): MigrationBundle {
  const bundle = bundleSchema.parse(input);
  const required = ['00_preflight.sql', '01_tables.sql', '02_functions.sql', '03_relationships.sql', '04_security.sql',
    '05_storage.sql', '06_validate_schema.sql', '07_install_triggers_AFTER_DATA.sql', 'README.md', 'manifest.json'];
  if (required.some(name => !bundle.files[name])) throw new Error('The migration package is incomplete. Generate it again.');
  return bundle as MigrationBundle;
}

export function parseMigrationManifest(content: string) {
  return manifestSchema.parse(JSON.parse(content) as unknown);
}

export async function verifyMigrationChecksums(bundle: MigrationBundle): Promise<void> {
  const manifest = parseMigrationManifest(bundle.files['manifest.json']);
  for (const [name, content] of Object.entries(bundle.files)) {
    if (name === 'manifest.json') continue;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
    const actual = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
    if (manifest.checksums[name] !== actual) throw new Error('Migration file integrity check failed. Generate the package again.');
  }
}
