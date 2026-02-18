import { differenceInDays, parseISO, isWeekend, eachDayOfInterval } from 'date-fns';

/**
 * Menghitung jumlah hari kerja (exclude weekend)
 */
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const workingDays = days.filter((day) => !isWeekend(day));
  return workingDays.length;
}

/**
 * Menghitung jumlah hari total (include weekend)
 */
export function calculateTotalDays(startDate: Date, endDate: Date): number {
  return differenceInDays(endDate, startDate) + 1;
}

/**
 * Menghitung jumlah hari cuti berdasarkan departemen
 * - SECURITY: Senin-Minggu (semua hari dihitung)
 * - Lainnya: Senin-Jumat (exclude weekend)
 */
export function calculateCutiDays(startDate: Date, endDate: Date, includeWeekend: boolean = false): number {
  if (includeWeekend) {
    return calculateTotalDays(startDate, endDate);
  }
  return calculateWorkingDays(startDate, endDate);
}

/**
 * Validasi tanggal
 */
export function validateDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate;
}

/**
 * Parse string ISO to Date
 */
export function parseDate(dateString: string): Date {
  return parseISO(dateString);
}

/**
 * Get current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Get year from date
 */
export function getYearFromDate(date: Date): number {
  return date.getFullYear();
}
