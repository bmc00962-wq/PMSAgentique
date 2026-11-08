interface ExportFailure { status: number; code: string; error: string; diagnostic: string }

// Only allowlisted codes reach the browser/logs; never log URLs, SQL, tokens or driver messages.
export function exportFailure(error: unknown, stage: string): ExportFailure {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const diagnostic = typeof value.code === 'string' && /^(?:[A-Z0-9]{5}|PGRST\d{3})$/.test(value.code)
    ? value.code : 'INTERNAL';
  if (error instanceof Error && error.message.startsWith('Unsupported schema')) {
    return { status: 422, code: 'UNSUPPORTED_SCHEMA', diagnostic, error: 'Unsupported schema features require a reviewed PostgreSQL dump.' };
  }
  if (diagnostic === '42501') return { status: 403, code: 'EXPORT_FORBIDDEN', diagnostic, error: 'An active platform administrator membership is required.' };
  if (diagnostic === 'PGRST202' || diagnostic === '42883') return {
    status: 503, code: 'CATALOG_NOT_READY', diagnostic, error: 'The catalog export service is not available yet. Retry shortly.',
  };
  if (diagnostic === '57014') return { status: 503, code: 'EXPORT_TIMEOUT', diagnostic, error: 'The catalog read timed out. Retry the export.' };
  const code = stage === 'catalog' ? 'CATALOG_QUERY_FAILED' : stage === 'bundle' ? 'PACKAGE_BUILD_FAILED' : 'EXPORT_UNAVAILABLE';
  return { status: 503, code, diagnostic, error: 'The export failed. Retry or contact support with the reference provided.' };
}
