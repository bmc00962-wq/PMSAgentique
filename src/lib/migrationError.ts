import { MIGRATION_ERRORS } from '@/constants/migrationErrors';
import type { Language } from '@/lib/i18n';

export function migrationErrorMessage(body: unknown, status: number, language: Language): string {
  const copy = MIGRATION_ERRORS[language];
  const value = body !== null && typeof body === 'object' ? body as Record<string, unknown> : {};
  const code = typeof value.code === 'string' ? value.code : '';
  const fallback = status === 401 ? copy.SESSION_REQUIRED : status === 403 ? copy.EXPORT_FORBIDDEN : copy.EXPORT_UNAVAILABLE;
  // Do not render arbitrary server errors or infrastructure HTML, even on a legacy response.
  const message = Object.prototype.hasOwnProperty.call(copy, code) && code !== 'reference'
    ? copy[code as Exclude<keyof typeof copy, 'reference'>] : fallback;
  const reference = typeof value.requestId === 'string' && /^[a-f0-9-]{36}$/i.test(value.requestId) ? value.requestId : null;
  return reference ? `${message} ${copy.reference} : ${reference}` : message;
}
