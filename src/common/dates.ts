// Los días (`@db.Date`) viajan como YYYY-MM-DD; "hoy" se calcula en la zona de
// la clínica, nunca con la hora del servidor.

const CLINIC_TZ = 'America/Santiago';

export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TZ }).format(
    new Date(),
  );
}

/** YYYY-MM-DD → Date a medianoche UTC (lo que guarda una columna DATE). */
export function toDbDate(day: string): Date {
  return new Date(`${day.slice(0, 10)}T00:00:00.000Z`);
}

/** Columna DATE → YYYY-MM-DD. */
export function fromDbDate(value: Date): string;
export function fromDbDate(value: Date | null): string | null;
export function fromDbDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function addDays(day: string, days: number): string {
  const date = toDbDate(day);
  date.setUTCDate(date.getUTCDate() + days);
  return fromDbDate(date);
}

/** dd-mm-aaaa para textos legibles (auditoría y correos). */
export function formatDay(day: string): string {
  const [y, m, d] = day.slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
}
