// Shared NZ (Pacific/Auckland) timezone helpers.
//
// Server Components and cron jobs run on Vercel in UTC, so any "is this
// today/yesterday" or "start of day" logic based on the runtime's local
// clock silently uses UTC instead of NZ time — causing late-evening NZ
// activity to read as the wrong calendar day for hours until UTC catches
// up. These helpers force every such comparison through Pacific/Auckland
// regardless of where the code executes.

export const NZ_TIME_ZONE = 'Pacific/Auckland'

// "YYYY-MM-DD" for the given instant, read as NZ wall-clock date.
export function nzDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-CA', { timeZone: NZ_TIME_ZONE }).format(d)
}

export function isNzToday(date: Date | string): boolean {
  return nzDateKey(date) === nzDateKey(new Date())
}

export function isNzYesterday(date: Date | string): boolean {
  return nzDateKey(date) === nzDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000))
}

// True if `date`'s NZ calendar day is strictly before today's NZ calendar day.
export function isNzPast(date: Date | string): boolean {
  return nzDateKey(date) < nzDateKey(new Date())
}

// How far `date` sits ahead of UTC when read as NZ wall-clock time (ms).
export function nzOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: NZ_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value
  const hour = Number(map.hour) === 24 ? 0 : Number(map.hour)
  const asUtc = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), hour, Number(map.minute), Number(map.second))
  return asUtc - date.getTime()
}

// [start, end) UTC instants spanning a full NZ calendar day, `daysFromNow`
// days from now (0 = today, 1 = tomorrow, -1 = yesterday).
export function nzDayRangeUtc(daysFromNow: number, now: Date = new Date()): { start: Date; end: Date } {
  const offset = nzOffsetMs(now)
  const nzWallNow = new Date(now.getTime() + offset)
  const dayStartWall = Date.UTC(nzWallNow.getUTCFullYear(), nzWallNow.getUTCMonth(), nzWallNow.getUTCDate() + daysFromNow)
  const dayEndWall = Date.UTC(nzWallNow.getUTCFullYear(), nzWallNow.getUTCMonth(), nzWallNow.getUTCDate() + daysFromNow + 1)
  return { start: new Date(dayStartWall - offset), end: new Date(dayEndWall - offset) }
}

// "MMM d, yyyy" formatted in NZ time.
export function formatNzDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    timeZone: NZ_TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric',
  }).format(d)
}

// "MMM d, yyyy, h:mm a" formatted in NZ time.
export function formatNzDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    timeZone: NZ_TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(d)
}

// "MMM d" formatted in NZ time (no year — compact UI like notification lists).
export function formatNzShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', { timeZone: NZ_TIME_ZONE, month: 'short', day: 'numeric' }).format(d)
}

// "MMM d, h:mm a" formatted in NZ time (no year).
export function formatNzShortDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    timeZone: NZ_TIME_ZONE, month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(d)
}
