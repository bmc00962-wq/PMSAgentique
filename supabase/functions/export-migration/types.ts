// Migration export contains metadata only: no customer records, Auth users, or secrets.
export interface SqlObject { name: string; ddl: string }
export interface TableObject extends SqlObject { rls: boolean; force_rls: boolean }
export interface FunctionObject extends SqlObject {
  signature: string; security_definer: boolean; config: string[] | null;
}
export interface TriggerObject extends SqlObject { schema: string; table_name: string; enabled: string }
export interface ExtensionObject { name: string; schema: string; version: string }
export interface Snapshot {
  version: string;
  tables: TableObject[];
  constraints: SqlObject[];
  foreignKeys: SqlObject[];
  indexes: SqlObject[];
  functions: FunctionObject[];
  policies: SqlObject[];
  grants: SqlObject[];
  defaultGrants: SqlObject[];
  comments: SqlObject[];
  triggers: TriggerObject[];
  extensions: ExtensionObject[];
  storage: SqlObject[];
  storagePolicies: SqlObject[];
  warnings: string[];
}
export type Query = <T extends object>(text: string) => Promise<T[]>;
export interface MigrationBundle {
  formatVersion: 1;
  generatedAt: string;
  files: Record<string, string>;
}
export const identifier = (value: string): string => `"${value.replace(/"/g, '""')}"`;
export const literal = (value: string): string => `'${value.replace(/'/g, "''")}'`;
export function transaction(title: string, statements: string[]): string {
  return `-- ${title}\n-- TARGET ONLY: fresh Supabase project; never execute on the source.\nbegin;\nset local standard_conforming_strings = on;\nset local search_path = pg_catalog, public;\n${statements.join('\n\n')}\ncommit;\n`;
}
