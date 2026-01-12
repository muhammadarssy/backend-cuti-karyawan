import { differenceInDays, parseISO, isWeekend, eachDayOfInterval } from 'date-fns';
/**
 * Menghitung jumlah hari kerja (exclude weekend)
 */
export function calculateWorkingDays(startDate, endDate) {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const workingDays = days.filter((day) => !isWeekend(day));
    return workingDays.length;
}
/**
 * Menghitung jumlah hari total (include weekend)
 */
export function calculateTotalDays(startDate, endDate) {
    return differenceInDays(endDate, startDate) + 1;
}
/**
 * Validasi tanggal
 */
export function validateDateRange(startDate, endDate) {
    return startDate <= endDate;
}
/**
 * Parse string ISO to Date
 */
export function parseDate(dateString) {
    return parseISO(dateString);
}
/**
 * Get current year
 */
export function getCurrentYear() {
    return new Date().getFullYear();
}
/**
 * Get year from date
 */
export function getYearFromDate(date) {
    return date.getFullYear();
}
