export type TimezoneOption = {
  label: string
  value: string
}

/** UTC offset of a timezone as `GMT+05:30` (DST-aware for the given date). */
export function getUtcOffset(timeZone: string, date: Date = new Date()): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value
  return !name || name === 'GMT' ? 'GMT+00:00' : name
}

/**
 * Chromium still reports some zones under their old names (e.g. `Asia/Calcutta`),
 * so users searching for the current name wouldn't find them.
 */
const RENAMED_ZONES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Europe/Kiev': 'Europe/Kyiv',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
}

/** All IANA timezones as select options, UTC first, labelled like `(GMT+00:00) UTC`. */
export function getTimezoneOptions(date: Date = new Date()): TimezoneOption[] {
  const zones =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  const current = zones.map((zone) => RENAMED_ZONES[zone] ?? zone)
  const list = ['UTC', ...new Set(current.filter((zone) => zone !== 'UTC'))]
  return list.map((zone) => ({
    value: zone,
    label: `(${getUtcOffset(zone, date)}) ${zone.replaceAll('_', ' ')}`,
  }))
}
