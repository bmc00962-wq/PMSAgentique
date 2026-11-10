import { supabase } from '@/lib/supabase';
import { parseMigrationBundle, verifyMigrationChecksums } from '@/lib/migrationValidation';

export async function downloadMigrationPackage(): Promise<{ filename: string }> {
  const { data, error } = await supabase.functions.invoke('export-migration', { method: 'POST' });
  if (error) throw new Error("L'export de migration a échoué. Vérifiez votre accès administrateur.");
  const bundle = parseMigrationBundle(data);
  await verifyMigrationChecksums(bundle);

  const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  const filename = 'migration-package.json';
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return { filename };
}
