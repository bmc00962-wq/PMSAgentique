export interface MigrationBundle {
  formatVersion: 1;
  generatedAt: string;
  files: Record<string, string>;
}
export interface MigrationExportSummary {
  filename: string;
  tables: number;
  policies: number;
  generatedAt: string;
}
