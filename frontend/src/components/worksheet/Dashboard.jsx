import { useCallback, useEffect, useState } from 'react'
import API from '../../api/axios'
import { MARK_META, STATUS_META, countLinks, dotClasses, fmtDateLong, getApiError } from './worksheetUtils'

export default function Dashboard({ onOpen }) {
  const [day, setDay] = useState(null)
  const [month, setMonth] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [d, m] = await Promise.all([API.get('/worksheet/day/all'), API.get('/worksheet/month')])
      setDay(d.data)
      setMonth(m.data)
      setError('')
    } catch (e) {
      setError(getApiError(e, 'Failed to load the dashboard'))
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(() => { if (!document.hidden) load() }, 60000)
    return () => clearInterval(t)
  }, [load])

  if (error) return <div className='ws-banner err'>{error}</div>
  if (!day) return <div className='ws-empty'>Loading dashboard...</div>

  const staff = day.staff
    .filter((s) => s.user.role === 'MEMBER')
    .map((s) => {
      const rows = s.entries.length
      const done = s.entries.filter((e) => e.status === 'DONE').length
      const onTime = s.entries.filter((e) => !e.isLate).length
      const files = s.entries.reduce((n, e) => n + e.files.length, 0)
      const links = s.entries.reduce((n, e) => n + countLinks(e.proof), 0)
      const pct = rows ? Math.round((done / rows) * 100) : 0
      return { ...s, rows, done, onTime, files, links, pct }
    })

  const working = staff.filter((s) => s.state.working && !s.state.isFuture)
  const planOk = working.filter((s) => s.onTime > 0).length
  const totalRows = staff.reduce((n, s) => n + s.rows, 0)
  const totalDone = staff.reduce((n, s) => n + s.done, 0)
  const attention = staff.filter((s) => s.state.marks.length > 0).length
  const nowIST = staff[0] ? staff[0].state.nowIST.time : ''

  const order = (s) => (s.state.marks.length ? 0 : s.state.status === 'OPEN' ? 1 : 2)
  const sorted = [...staff].sort((a, b) => order(a) - order(b) || a.user.name.localeCompare(b.user.name))

  return (
    <div>
      <div className='ws-daytitle'>
        {fmtDateLong(day.date)} <span className='ws-hint'>IST {nowIST}{day.holiday ? ` · ${day.holiday.name}` : ''}</span>
      </div>

      <div className='ws-stats'>
        <div className='ws-stat'><div className='ws-stat-l'>Staff working</div><div className='ws-stat-v'>{working.length}<small> / {staff.length}</small></div></div>
        <div className='ws-stat'><div className='ws-stat-l'>Plan on time</div><div className='ws-stat-v'>{planOk}<small> / {working.length}</small></div></div>
        <div className='ws-stat'><div className='ws-stat-l'>Rows done</div><div className='ws-stat-v'>{totalDone}<small> / {totalRows}</small></div></div>
        <div className='ws-stat'><div className='ws-stat-l'>Needs attention</div><div className='ws-stat-v' style={attention ? { color: '#E11D48' } : null}>{attention}</div></div>
      </div>

      <div className='ws-h2'>Today by staff</div>
      <div className='ws-sgrid'>
        {sorted.length === 0 && <div className='ws-empty'>No staff members found.</div>}
        {sorted.map((s) => {
          const st = s.state
          const chips = st.status === 'FLAGGED' ? st.marks.map((m) => MARK_META[m]) : [STATUS_META[st.status]]
          return (
            <div key={s.user.id} className={`ws-scard ${dotClasses(st)[0]}`}>
              <div className='ws-sc-top'>
                <div className='ws-sc-name'>{s.user.name}</div>
                <div className='ws-sc-chips'>{chips.map((c, i) => <span key={i} className={`ws-chip ${c.cls}`}>{c.label}</span>)}</div>
              </div>
              <div className={`ws-bar ${s.pct === 100 && s.rows ? 'full' : ''}`} style={{ margin: 0 }}><i style={{ width: `${s.pct}%` }} /></div>
              <div className='ws-sc-meta'>
                <span><b>{s.done}/{s.rows}</b> done</span>
                <span><b>{s.files}</b> files</span>
                <span><b>{s.links}</b> links</span>
                <span>{s.rows > 0 && s.onTime === 0 ? 'Plan was late' : s.rows > 0 ? 'Plan on time' : 'No plan yet'}</span>
              </div>
              <button className='ws-btn small' onClick={() => onOpen(day.date, s.user.id)}>Open sheet</button>
            </div>
          )
        })}
      </div>

      {month && (
        <>
          <div className='ws-h2'>This month</div>
          <div className='ws-scroll'>
            <table className='ws-mtable'>
              <thead>
                <tr><th>Staff</th><th>Complete days</th><th>Late plan</th><th>Unfinished</th><th>Absent</th></tr>
              </thead>
              <tbody>
                {month.users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.summary.green}</td>
                    <td>{u.summary.blue}</td>
                    <td style={u.summary.red ? { color: '#E11D48', fontWeight: 700 } : null}>{u.summary.red}</td>
                    <td>{u.summary.absent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}