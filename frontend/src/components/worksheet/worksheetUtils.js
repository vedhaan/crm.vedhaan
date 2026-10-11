export const PLAN_SECS = 11 * 3600 + 45 * 60
export const LOCK_SECS = 18 * 3600
const IST_MS = 330 * 60 * 1000

// The server clock is the only clock that matters. These helpers are used
// for countdowns and button states only. The backend enforces every rule.
export const istOf = (ms) => {
  const d = new Date(ms + IST_MS)
  const iso = d.toISOString()
  return {
    dateStr: iso.slice(0, 10),
    secs: d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds(),
    label: iso.slice(11, 16)
  }
}

export const liveFlags = (dateStr, nowMs) => {
  const n = istOf(nowMs)
  const isToday = dateStr === n.dateStr
  const past = dateStr < n.dateStr
  return {
    isToday,
    closed: past || (isToday && n.secs >= LOCK_SECS),
    planFrozen: past || (isToday && n.secs >= PLAN_SECS),
    secsToPlan: isToday ? PLAN_SECS - n.secs : null,
    secsToLock: isToday ? LOCK_SECS - n.secs : null,
    istTime: n.label
  }
}

export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const shiftMonth = (monthStr, n) => {
  const [y, m] = monthStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7)
}

export const isSundayStr = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`).getUTCDay() === 0

export const fmtDateLong = (dateStr) =>
  new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  })

export const fmtDateShort = (dateStr) =>
  new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'
  })

export const fmtMonth = (monthStr) =>
  new Date(`${monthStr}-01T00:00:00.000Z`).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric', timeZone: 'UTC'
  })

export const fmtCountdown = (secs) => {
  const s = Math.max(0, Math.floor(secs))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(r).padStart(2, '0')}s`
}

export const proofLinks = (proof) =>
  proof ? proof.split(/\s+/).filter((x) => /^https?:\/\//i.test(x)) : []

export const countLinks = (proof) => proofLinks(proof).length

export const getApiError = (err, fallback) => err?.response?.data?.message || fallback

export const STATUS_META = {
  OPEN: { label: 'Open', cls: 'open' },
  GREEN: { label: 'Complete', cls: 'green' },
  FLAGGED: { label: 'Flagged', cls: 'red' },
  ABSENT: { label: 'Absent', cls: 'amber' },
  OFF: { label: 'Off day', cls: 'grey' },
  FUTURE: { label: 'Upcoming', cls: 'grey' },
  NA: { label: 'Not joined', cls: 'grey' }
}

export const MARK_META = {
  RED: { label: 'Unfinished', cls: 'red' },
  BLUE: { label: 'Late plan', cls: 'blue' }
}

export const dotClasses = (state) =>
  state.marks.length
    ? state.marks.map((m) => MARK_META[m].cls)
    : [STATUS_META[state.status] ? STATUS_META[state.status].cls : 'grey']