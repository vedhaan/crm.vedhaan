// All worksheet rules live here. IST is a fixed UTC+5:30 offset (no DST),
// so plain arithmetic is safe and needs no library.

const IST_OFFSET_MS = 330 * 60 * 1000
const PLAN_DEADLINE_MIN = 11 * 60 + 45 // 11:45 AM
const LOCK_MIN = 18 * 60               // 6:00 PM

const istNow = (date = new Date()) => {
  const s = new Date(date.getTime() + IST_OFFSET_MS).toISOString()
  return {
    dateStr: s.slice(0, 10),
    time: s.slice(11, 16),
    minutes: Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16))
  }
}

// Date column values come back from Prisma as UTC midnight
const toDateStr = (d) => d.toISOString().slice(0, 10)

const parseDateStr = (str) => {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null
  const d = new Date(`${str}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== str) return null
  return d
}

const isSunday = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`).getUTCDay() === 0

const monthDates = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number)
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return Array.from({ length: total }, (_, i) => `${monthStr}-${String(i + 1).padStart(2, '0')}`)
}

/**
 * Single source of truth for one person on one date.
 * entries: [{ status, isLate }]
 * attendance: 'PRESENT' | 'ABSENT' | null
 * joinedStr: IST date the account was created (earlier days are not judged)
 */
const computeDay = ({ dateStr, entries = [], attendance = null, isHoliday = false, joinedStr = null, now = istNow() }) => {
  const isToday = dateStr === now.dateStr
  const isFuture = dateStr > now.dateStr
  const closed = dateStr < now.dateStr || (isToday && now.minutes >= LOCK_MIN)
  const planFrozen = dateStr < now.dateStr || (isToday && now.minutes >= PLAN_DEADLINE_MIN)
  const isOffDay = isSunday(dateStr) || isHoliday
  const beforeJoin = !!joinedStr && dateStr < joinedStr
  const working = !beforeJoin && attendance !== 'ABSENT' && (attendance === 'PRESENT' || !isOffDay)

  let status
  let marks = []

  if (beforeJoin) status = 'NA'
  else if (attendance === 'ABSENT') status = 'ABSENT'
  else if (!working) status = 'OFF'
  else if (isFuture) status = 'FUTURE'
  else {
    const onTimeRows = entries.filter((e) => !e.isLate).length
    const blue = planFrozen && onTimeRows === 0
    const red = closed && (entries.length === 0 || entries.some((e) => e.status !== 'DONE'))
    if (blue) marks.push('BLUE')
    if (red) marks.push('RED')
    status = marks.length ? 'FLAGGED' : closed ? 'GREEN' : 'OPEN'
  }

  const canStaffWrite = working && isToday && !closed

  let writeBlock = null
  if (!canStaffWrite) {
    if (!isToday) {
      writeBlock = { code: 'DAY_LOCKED', message: 'Only the current date can be edited.' }
    } else if (attendance === 'ABSENT') {
      writeBlock = { code: 'ABSENT', message: 'You are marked absent for this day.' }
    } else if (!working) {
      writeBlock = { code: 'DAY_OFF', message: 'Today is a weekly off or holiday.' }
    } else {
      writeBlock = { code: 'DAY_LOCKED', message: 'Sheet is locked after 6:00 PM.' }
    }
  }

  return {
    date: dateStr,
    status,
    marks,
    working,
    isToday,
    isFuture,
    closed,
    planFrozen,
    isOffDay,
    canStaffWrite,
    writeBlock,
    nowIST: { date: now.dateStr, time: now.time }
  }
}

module.exports = {
  PLAN_DEADLINE_MIN,
  LOCK_MIN,
  istNow,
  toDateStr,
  parseDateStr,
  isSunday,
  monthDates,
  computeDay
}