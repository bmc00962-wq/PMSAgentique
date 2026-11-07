import { describe, expect, it } from 'vitest';
import { parseMigrationBundle, parseMigrationManifest } from '@/lib/migrationValidation';

const names = ['00_preflight.sql', '01_tables.sql', '02_functions.sql', '03_relationships.sql', '04_security.sql',
  '05_storage.sql', '06_validate_schema.sql', '07_install_triggers_AFTER_DATA.sql', 'README.md', 'manifest.json'];
const bundle = () => ({ formatVersion: 1, generatedAt: '2026-11-07T12:00:00.000Z',
  files: Object.fromEntries(names.map(name => [name, '-- metadata only'])) });

describe('Migration package validation', () => {
  it('accepts a complete, versioned schema package', () => {
    expect(Object.keys(parseMigrationBundle(bundle()).files)).toHaveLength(10);
  });
  it('rejects missing security SQL', () => {
    const input = bundle(); delete input.files['04_security.sql'];
    expect(() => parseMigrationBundle(input)).toThrow();
  });
  it('rejects path traversal and credential filenames', () => {
    for (const name of ['../../.env', '.env', 'users.csv', 'data.sql']) {
      const input = bundle(); input.files[name] = 'not allowed';
      expect(() => parseMigrationBundle(input)).toThrow();
    }
  });
  it('does not accept a manifest claiming a full data backup', () => {
    expect(() => parseMigrationManifest(JSON.stringify({ formatVersion: 1,
      scope: 'full-backup', completeDatabaseBackup: true, counts: { tables: 36, policies: 175 }, checksums: {} }))).toThrow();
  });
  it('requires valid checksum metadata', () => {
    expect(() => parseMigrationManifest(JSON.stringify({ formatVersion: 1,
      scope: 'schema-and-security-only', completeDatabaseBackup: false, counts: { tables: 36, policies: 175 },
      checksums: { '01_tables.sql': 'invalid' } }))).toThrow();
  });
});
