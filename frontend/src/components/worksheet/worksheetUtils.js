import API from '../../api/axios'
export const PLAN_SECS = 11 * 3600 + 45 * 60
export const LOCK_SECS = 18 * 3600
export const STATUS_OPTIONS_LABEL = { PENDING: 'Pending', IN_PROGRESS: 'In Progress', DONE: 'Done' }
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
  NA: { label: 'Not joined', cls: 'grey' },
  EXEMPT: { label: 'Admin sheet', cls: 'grey' },
}

export const MARK_META = {
  RED: { label: 'Unfinished', cls: 'red' },
  BLUE: { label: 'Late plan', cls: 'blue' }
}

export const dotClasses = (state) =>
  state.marks.length
    ? state.marks.map((m) => MARK_META[m].cls)
    : [STATUS_META[state.status] ? STATUS_META[state.status].cls : 'grey']

export const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.md,.odt,.ods,.odp,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar,.7z'
export const MAX_FILE_MB = 15
export const MAX_FILES_PER_ROW = 10

export const formatBytes = (b) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`

export const extOf = (name) => {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

export const isAllowedFile = (name) => ACCEPT.split(',').includes(extOf(name))

export const fileBadge = (name) => {
  const e = extOf(name)
  if (['.doc', '.docx', '.odt', '.rtf'].includes(e)) return { label: 'DOC', cls: 'doc' }
  if (['.xls', '.xlsx', '.csv', '.ods'].includes(e)) return { label: 'XLS', cls: 'xls' }
  if (['.ppt', '.pptx', '.odp'].includes(e)) return { label: 'PPT', cls: 'ppt' }
  if (e === '.pdf') return { label: 'PDF', cls: 'pdf' }
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(e)) return { label: 'IMG', cls: 'img' }
  if (['.zip', '.rar', '.7z'].includes(e)) return { label: 'ZIP', cls: 'zip' }
  return { label: 'TXT', cls: 'txt' }
}

export const progressPct = (e) =>
  e.targetCount ? Math.min(100, Math.round((e.doneCount / e.targetCount) * 100)) : e.status === 'DONE' ? 100 : 0

export const downloadWorksheetFile = async (id) => {
  const r = await API.get(`/worksheet/files/${id}/download`)
  window.location.assign(r.data.url)
}