const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/** True for a 24-hour `HH:mm` string, e.g. `09:00`, `17:30`. */
export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value)
}

/** Minutes since midnight for an `HH:mm` string. */
export function toMinutes(value: string): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
}

/** Returns an error message for an invalid opening range, or `null` when it is valid. */
export function getTimeRangeError(start: string, end: string): string | null {
  if (!isValidTime(start) || !isValidTime(end)) return 'Enter both an opening and closing time'
  if (toMinutes(start) >= toMinutes(end)) return 'Closing time must be after opening time'
  return null
}
