import { useCallback, useEffect, useRef, useState } from 'react'
import API from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import RowDrawer from './RowDrawer'
import {
  addDays, chipsFor, countLinks, dotClasses, fmtCountdown,
  fmtDateLong, getApiError, liveFlags, progressPct
} from './worksheetUtils'

const STATUS_OPTIONS = [
  ['PENDING', 'Pending'],
  ['IN_PROGRESS', 'In Progress'],
  ['DONE', 'Done']
]

function Cell({ value, type = 'text', disabled, onCommit, placeholder }) {
  const [draft, setDraft] = useState(String(value ?? ''))
  const focused = useRef(false)
  const cancelled = useRef(false)

  useEffect(() => {
    if (!focused.current) setDraft(String(value ?? ''))
  }, [value])

  const commit = async () => {
    focused.current = false
    if (cancelled.current) {
      cancelled.current = false
      setDraft(String(value ?? ''))
      return
    }
    const next = draft.trim()
    if (next === String(value ?? '')) {
      setDraft(next)
      return
    }
    const payload = type === 'number' ? (next === '' ? null : Number(next)) : next
    const ok = await onCommit(payload)
    if (!ok) setDraft(String(value ?? ''))
  }

  return (
    <input
      className='ws-cell'
      type={type}
      min={type === 'number' ? 0 : undefined}
      value={draft}
      disabled={disabled}
      placeholder={placeholder}
      onFocus={() => { focused.current = true }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          cancelled.current = true
          e.currentTarget.blur()
        }
      }}
    />
  )
}

export default function DaySheet({ isAdmin, date, setDate, selectedId, setSelectedId }) {
  const { user } = useAuth()
  const [sheets, setSheets] = useState([])
  const [shownDate, setShownDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [drawerId, setDrawerId] = useState(null)
  const [form, setForm] = useState({ title: '', client: '', target: '' })
  const [adding, setAdding] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const offsetRef = useRef(0)
  const toastTimer = useRef(null)
  const prevKey = useRef(null)

  const flash = (type, text) => {
    setToast({ type, text })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4500)
  }

  const load = useCallback(async () => {
    try {
      const params = date ? { date } : {}
      if (isAdmin) {
        const r = await API.get('/worksheet/day/all', { params })
        offsetRef.current = Date.parse(r.data.serverNow) - Date.now()
        setShownDate(r.data.date)
        setSheets(r.data.staff.map((s) => ({ ...s, holiday: r.data.holiday })))
      } else {
        const r = await API.get('/worksheet/day', { params })
        offsetRef.current = Date.parse(r.data.serverNow) - Date.now()
        setShownDate(r.data.state.date)
        setSheets([{
          user: r.data.user,
          attendance: r.data.attendance,
          state: r.data.state,
          entries: r.data.entries,
          holiday: r.data.holiday
        }])
      }
      setError('')
      setNowMs(Date.now() + offsetRef.current)
    } catch (e) {
      setError(getApiError(e, 'Failed to load the sheet'))
    } finally {
      setLoading(false)
    }
  }, [isAdmin, date])

  useEffect(() => {
    setLoading(true)
    prevKey.current = null
    load()
    const poll = setInterval(() => { if (!document.hidden) load() }, 60000)
    return () => clearInterval(poll)
  }, [load])

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now() + offsetRef.current), 1000)
    return () => clearInterval(t)
  }, [])

  const flags = shownDate ? liveFlags(shownDate, nowMs) : null

  useEffect(() => {
    if (!flags) return
    const key = `${shownDate}|${flags.planFrozen}|${flags.closed}`
    if (prevKey.current && prevKey.current.split('|')[0] === shownDate && prevKey.current !== key) load()
    prevKey.current = key
  })

  const sheet = sheets.find((s) => s.user && s.user.id === selectedId) || sheets[0] || null
  const st = sheet ? sheet.state : null
  const entries = sheet ? sheet.entries : []
  const ownSheet = !!sheet && sheet.user.role === 'ADMIN'

  const staffCanWrite = !isAdmin && !!st && st.canStaffWrite && !!flags && !flags.closed
  const canWrite = isAdmin || staffCanWrite
  const planEditable = isAdmin || (staffCanWrite && !flags.planFrozen)
  const execEditable = canWrite

  const canDeleteFile = (f) => {
    if (isAdmin) return true
    if (!staffCanWrite || f.uploadedBy !== (user && user.id)) return false
    return !flags.planFrozen || nowMs - Date.parse(f.createdAt) < 15 * 60 * 1000
  }

  const replaceEntry = (entry) => {
    setSheets((prev) => prev.map((s) =>
      s.user.id === entry.userId
        ? { ...s, entries: s.entries.map((x) => (x.id === entry.id ? entry : x)) }
        : s
    ))
  }

  const patch = async (entry, field, value) => {
    try {
      const r = await API.patch(`/worksheet/entries/${entry.id}`, { [field]: value })
      replaceEntry(r.data.entry)
      load()
      return true
    } catch (e) {
      flash('error', getApiError(e, 'Save failed'))
      if (e.response && e.response.status === 403) load()
      return false
    }
  }

  const removeRow = async (entry) => {
    if (!window.confirm('Delete this row and its files?')) return
    try {
      await API.delete(`/worksheet/entries/${entry.id}`)
      await load()
    } catch (e) {
      flash('error', getApiError(e, 'Delete failed'))
      if (e.response && e.response.status === 403) load()
    }
  }

  const addRow = async (ev) => {
    ev.preventDefault()
    if (!sheet || !form.title.trim()) return
    setAdding(true)
    try {
      const body = {
        title: form.title,
        client: form.client,
        targetCount: form.target === '' ? null : Number(form.target)
      }
      if (isAdmin) {
        body.userId = sheet.user.id
        body.date = shownDate
      }
      await API.post('/worksheet/entries', body)
      setForm({ title: '', client: '', target: '' })
      await load()
    } catch (e) {
      flash('error', getApiError(e, 'Could not add the row'))
      if (e.response && e.response.status === 403) load()
    } finally {
      setAdding(false)
    }
  }

  const setAttendance = async (status) => {
    try {
      await API.put('/worksheet/attendance', { userId: sheet.user.id, date: shownDate, status })
      await load()
    } catch (e) {
      flash('error', getApiError(e, 'Could not update attendance'))
    }
  }

  const lockedText = () => {
    if (!st || isAdmin || canWrite) return null
    if (st.status === 'ABSENT') return 'You are marked absent for this day. The sheet is locked.'
    if (st.status === 'OFF') return sheet.holiday ? `Holiday: ${sheet.holiday.name}. No work expected.` : 'Weekly off. No work expected.'
    if (flags.isToday) return 'The sheet is locked after 6:00 PM. Ask admin for changes.'
    return 'Only today can be edited. Ask admin for changes on other days.'
  }

  const adminInfo = () => {
    if (!isAdmin || !st) return null
    if (ownSheet) return 'This is your own sheet. It has no time locks and is not marked red or blue. Use the file panel to share rows with staff.'
    if (st.status === 'ABSENT') return 'Marked absent. Staff cannot edit this day. Admin edits are still allowed.'
    if (st.status === 'OFF') return sheet.holiday ? `Holiday: ${sheet.holiday.name}.` : 'Weekly off.'
    return null
  }
  
  const chips = st ? chipsFor(st) : []
  const att = sheet && sheet.attendance ? sheet.attendance.status : null
  const doneCount = entries.filter((e) => e.status === 'DONE').length
  const totalLinks = entries.reduce((n, e) => n + countLinks(e.proof), 0)
  const totalFiles = entries.reduce((n, e) => n + e.files.length, 0)

  let countdown = null
  if (flags && st && !ownSheet && flags.isToday && st.working && !flags.closed) {
    if (!flags.planFrozen) countdown = { text: `Plan due in ${fmtCountdown(flags.secsToPlan)}`, urgent: flags.secsToPlan <= 900 }
    else countdown = { text: `Sheet locks in ${fmtCountdown(flags.secsToLock)}`, urgent: flags.secsToLock <= 900 }
  }

  const message = lockedText() || adminInfo()
  const drawerEntry = entries.find((e) => e.id === drawerId) || null

  return (
    <div>
      {toast && <div className={`ws-toast ${toast.type}`}>{toast.text}</div>}

      <div className='ws-toolbar'>
        <div className='ws-datenav'>
          <button className='ws-btn' onClick={() => shownDate && setDate(addDays(shownDate, -1))}>Prev</button>
          <input className='ws-in' type='date' value={shownDate} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button className='ws-btn' onClick={() => shownDate && setDate(addDays(shownDate, 1))}>Next</button>
          <button className='ws-btn' onClick={() => setDate('')}>Today</button>
        </div>
        <div className='ws-statusbar'>
          {countdown && <span className={`ws-countdown ${countdown.urgent ? 'urgent' : ''}`}>{countdown.text}</span>}
          {chips.map((c, i) => <span key={i} className={`ws-chip ${c.cls}`}>{c.label}</span>)}
        </div>
      </div>

      {shownDate && <div className='ws-daytitle'>{fmtDateLong(shownDate)}</div>}

      {isAdmin && sheets.length > 0 && (
        <div className='ws-pills'>
          {sheets.map((s) => (
            <button
              key={s.user.id}
              className={`ws-pill ${sheet && s.user.id === sheet.user.id ? 'on' : ''}`}
              onClick={() => setSelectedId(s.user.id)}
            >
              <span className='ws-dots'>
                {dotClasses(s.state).map((c, i) => <i key={i} className={`ws-dot ${c}`} />)}
              </span>
              {s.user.name}{s.user.role === 'ADMIN' ? ' (Admin)' : ''}
            </button>
          ))}
        </div>
      )}

      {isAdmin && sheet && !ownSheet && (
        <div className='ws-att'>
          <span className='ws-att-label'>Attendance for {sheet.user.name}:</span>
          <button className={`ws-btn small ${att === 'ABSENT' ? 'amber' : ''}`} onClick={() => setAttendance('ABSENT')}>Absent</button>
          <button className={`ws-btn small ${att === 'PRESENT' ? 'green' : ''}`} onClick={() => setAttendance('PRESENT')}>Present</button>
          {att && <button className='ws-btn small' onClick={() => setAttendance(null)}>Clear</button>}
        </div>
      )}

      {message && <div className='ws-banner'>{message}</div>}
      {!isAdmin && staffCanWrite && flags.planFrozen && (
        <div className='ws-banner warn'>
          The 11:45 AM plan deadline has passed. New rows are marked LATE, and Task, Client and Target are frozen.
        </div>
      )}
      {error && <div className='ws-banner err'>{error}</div>}

      {loading ? (
        <div className='ws-empty'>Loading sheet...</div>
      ) : !sheet ? (
        <div className='ws-empty'>No staff members found.</div>
      ) : (
        <>
          <div className='ws-summary'>
            <span><b>{entries.length}</b> rows</span>
            <span><b>{doneCount}</b> done</span>
            <span><b>{totalFiles}</b> files</span>
            <span><b>{totalLinks}</b> proof links</span>
          </div>

          <div className='ws-scroll'>
            <table className='ws-table'>
              <thead>
                <tr>
                  <th className='w-idx'>#</th>
                  <th className='w-task'>Task</th>
                  <th className='w-client'>Client / Project</th>
                  <th className='w-num'>Target</th>
                  <th className='w-num'>Done</th>
                  <th className='w-status'>Status</th>
                  <th className='w-rem'>Remarks</th>
                  <th className='w-proof'>Files</th>
                  <th className='w-del' />
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr className='ws-emptyrow'><td colSpan={9} className='ws-norows'>No work added for this day.</td></tr>
                )}
                {entries.map((e, i) => {
                  const links = countLinks(e.proof)
                  const fc = e.files.length
                  const label = fc || links
                    ? [fc ? `${fc} file${fc !== 1 ? 's' : ''}` : '', links ? `${links} link${links !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' + ')
                    : (canWrite ? 'Add' : '-')
                  return (
                    <tr key={e.id} className={`ws-tr ${e.status.toLowerCase()}`}>
                      <td className='ws-idx' data-label='#'>
                        {i + 1}
                        {e.isLate && <span className='ws-late' title='Added after 11:45 AM'>LATE</span>}
                        {e.isShared && <span className='ws-shared' title='Visible to staff'>SHARED</span>}
                      </td>
                      <td data-label='Task'><Cell value={e.title} disabled={!planEditable} onCommit={(v) => patch(e, 'title', v)} /></td>
                      <td data-label='Client'><Cell value={e.client || ''} disabled={!planEditable} onCommit={(v) => patch(e, 'client', v)} /></td>
                      <td data-label='Target'><Cell type='number' value={e.targetCount ?? ''} disabled={!planEditable} onCommit={(v) => patch(e, 'targetCount', v)} /></td>
                      <td data-label='Done'>
                        <div className='ws-donecell'>
                          <Cell type='number' value={e.doneCount} disabled={!execEditable} onCommit={(v) => patch(e, 'doneCount', v)} />
                          {e.targetCount ? (
                            <div className={`ws-bar ${progressPct(e) === 100 ? 'full' : ''}`}><i style={{ width: `${progressPct(e)}%` }} /></div>
                          ) : null}
                        </div>
                      </td>
                      <td data-label='Status'>
                        <select
                          className={`ws-select ${e.status.toLowerCase()}`}
                          value={e.status}
                          disabled={!execEditable}
                          onChange={(ev) => patch(e, 'status', ev.target.value)}
                        >
                          {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                      <td data-label='Remarks'><Cell value={e.remarks || ''} disabled={!execEditable} onCommit={(v) => patch(e, 'remarks', v)} /></td>
                      <td data-label='Files'>
                        <button className={`ws-proof ${fc || links ? 'has' : ''}`} onClick={() => setDrawerId(e.id)}>{label}</button>
                      </td>
                      <td data-label=''>
                        {planEditable && <button className='ws-del' onClick={() => removeRow(e)}>Delete</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {canWrite && (
            <form className='ws-add' onSubmit={addRow}>
              <input className='ws-in grow' placeholder='New task, e.g. Create 50 backlinks' value={form.title} maxLength={300} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input className='ws-in' placeholder='Client / Project' value={form.client} maxLength={150} onChange={(e) => setForm({ ...form, client: e.target.value })} />
              <input className='ws-in narrow' type='number' min='1' placeholder='Target' value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
              <button type='submit' className='ws-btn primary' disabled={adding || !form.title.trim()}>
                {adding ? 'Adding...' : 'Add row'}
              </button>
            </form>
          )}
        </>
      )}

      {drawerEntry && (
        <RowDrawer
          key={drawerEntry.id}
          entry={drawerEntry}
          isAdmin={isAdmin}
          ownerIsAdmin={ownSheet}
          canUpload={canWrite}
          canEditProof={execEditable}
          canDeleteFile={canDeleteFile}
          onPatch={patch}
          onChanged={load}
          onClose={() => setDrawerId(null)}
          flash={flash}
        />
      )}
    </div>
  )
}