import type { WeekDay } from '@/types/flow'

export const TITLE_MAX_LENGTH = 60
export const DESCRIPTION_MAX_LENGTH = 240
export const MESSAGE_TEXT_MAX_LENGTH = 1000
export const COMMENT_MAX_LENGTH = 1000

export const ATTACHMENT_ACCEPT = 'image/*'
export const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024 // 2 MB, keeps localStorage persistence viable
export const ATTACHMENT_MAX_COUNT = 6

/** Hours a day gets when it's opened (and every day of a new Business Hours step). */
export const DEFAULT_OPENING_HOURS = { startTime: '09:00', endTime: '17:00' } as const

export const WEEK_DAYS: { value: WeekDay; label: string }[] = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]
