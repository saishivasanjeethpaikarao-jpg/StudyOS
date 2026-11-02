export function formatInZone(value: Date | string, timezone: string, options: Intl.DateTimeFormatOptions): string {
  try { return new Intl.DateTimeFormat(undefined, { ...options, timeZone: timezone }).format(typeof value === 'string' ? new Date(value) : value); }
  catch { return new Date(value).toLocaleString(); }
}
