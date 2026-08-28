/**
 * Expands a date-only value (e.g. a "YYYY-MM-DD" from an <input type="date">,
 * which coerces to midnight UTC) to the last instant of that UTC day, so a
 * "to" filter bound is inclusive of everything received on the end day.
 */
export function endOfDayUtc(date: Date): Date {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}
