import { useCallback, useEffect, useMemo, useState } from 'react'
import API from '../../api/axios'
import { fmtMonth, getApiError, isSundayStr, istOf, shiftMonth } from './worksheetUtils'

const kindOf = (c) => {
  if (c.marks.length === 2) return 'both'
  if (c.marks[0] === 'RED') return 'red'
  if (c.marks[0] === 'BLUE') return 'blue'
  return {
    GREEN: 'green', CARRIED: 'carried', EXCUSED: 'excused', OPEN: 'open',
    ABSENT: 'absent', OFF: 'off', EXEMPT: 'off', FUTURE: 'future'
  }[c.status] || 'na'
}

const SYMBOL = { green: '✓', red: '!', blue: 'L', both: 'L!', absent: 'A', carried: 'C', excused: 'E' }
const LABEL = {
  green: 'Complete', red: 'Unfinished', blue: 'Late plan', both: 'Late plan + Unfinished',
  absent: 'Absent', carried: 'Carried forward', excused: 'Excused', open: 'Open', off: 'Off day',
  future: 'Upcoming', na: 'Not tracked'
}

const initials = (n) => n.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
const dayNum = (d) => Number(d.slice(8))
const dow = (d) => new Date(`${d}T00:00:00.000Z`).getUTCDay()

const tip = (c) =>
  `${c.date}: ${LABEL[kindOf(c)]}${c.rows ? ` (${c.done}/${c.rows} rows done)` : ''}`

const rateOf = (u) => {
  const flagged = u.cells.filter((c) => c.marks.length > 0).length
  const judged = u.summary.green + flagged + (u.summary.carried || 0)
  return judged ? Math.round((u.summary.green / judged) * 100) : null
}

const rateClass = (r) => (r === null ? '' : r >= 90 ? '' : r >= 70 ? 'mid' : 'bad')

export default function MonthView({ isAdmin, onPick }) {
  const [month, setMonth] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('matrix')
  const [calUser, setCalUser] = useState(null)
  const [streamId, setStreamId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await API.get('/worksheet/month', {
        params: { ...(month ? { month } : {}), ...(streamId ? { streamId } : {}) }
      })
      setData(r.data)
      setError('')
    } catch (e) {
      setError(getApiError(e, 'Failed to load the month'))
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  const mode = isAdmin ? view : 'calendar'
  const today = data ? istOf(Date.parse(data.serverNow)).dateStr : ''
  const holidayMap = useMemo(
    () => new Map((data ? data.holidays : []).map((h) => [h.date, h.name])),
    [data]
  )

  const totals = useMemo(() => {
    if (!data) return null
    let green = 0, blue = 0, red = 0, absent = 0, flagged = 0
    data.users.forEach((u) => {
      green += u.summary.green
      blue += u.summary.blue
      red += u.summary.red
      absent += u.summary.absent
      flagged += u.cells.filter((c) => c.marks.length > 0).length
    })
    const judged = green + flagged
    return { green, blue, red, absent, rate: judged ? Math.round((green / judged) * 100) : null }
  }, [data])

  const calU = data ? data.users.find((u) => u.id === calUser) || data.users[0] : null

  return (
    <div>
      <div className='ws-toolbar'>
        <div className='ws-datenav'>
          <button className='ws-btn' onClick={() => data && setMonth(shiftMonth(data.month, -1))}>Prev</button>
          <span className='ws-monthlabel'>{data ? fmtMonth(data.month) : '...'}</span>
          <button className='ws-btn' onClick={() => data && setMonth(shiftMonth(data.month, 1))}>Next</button>
          <button className='ws-btn' onClick={() => setMonth('')}>This month</button>
        </div>
        {isAdmin && (
          <div className='mv-toggle'>
            <button className={view === 'matrix' ? 'on' : ''} onClick={() => setView('matrix')}>Team grid</button>
            <button className={view === 'calendar' ? 'on' : ''} onClick={() => setView('calendar')}>Calendar</button>
          </div>
        )}
        {isAdmin && data && data.streams && data.streams.length > 0 && (
          <select className='ws-in' value={streamId} onChange={(e) => setStreamId(e.target.value)}>
            <option value=''>All streams</option>
            {data.streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {error && <div className='ws-banner err'>{error}</div>}

      {loading && !data ? (
        <div className='ws-empty'>Loading month...</div>
      ) : data && totals && (
        <>
          <div className='mv-stats'>
            <div className='mv-stat mk-c-green'><div className='mv-stat-l'>Complete days</div><div className='mv-stat-v'>{totals.green}</div></div>
            <div className='mv-stat mk-c-blue'><div className='mv-stat-l'>Late plans</div><div className='mv-stat-v'>{totals.blue}</div></div>
            <div className='mv-stat mk-c-red'><div className='mv-stat-l'>Unfinished days</div><div className='mv-stat-v'>{totals.red}</div></div>
            <div className='mv-stat mk-c-amber'><div className='mv-stat-l'>Absences</div><div className='mv-stat-v'>{totals.absent}</div></div>
            <div className='mv-stat mk-c-grey'>
              <div className='mv-stat-l'>Clean-day rate</div>
              <div className='mv-stat-v'>{totals.rate === null ? '-' : `${totals.rate}%`}</div>
            </div>
          </div>

          <div className='mv-legend'>
            <span><i className='mv-lg mk-green'>✓</i>Complete</span>
            <span><i className='mv-lg mk-blue'>L</i>Late plan (after 11:45 AM)</span>
            <span><i className='mv-lg mk-red'>!</i>Unfinished or no work</span>
            <span><i className='mv-lg mk-both'>L!</i>Both</span>
            <span><i className='mv-lg mk-absent'>A</i>Absent</span>
            <span><i className='mv-lg mk-off' />Off day</span>
            <span><i className='mv-lg mk-na' />Not tracked</span>
            <span><i className='mv-lg mk-carried'>C</i>Carried forward</span>
            <span><i className='mv-lg mk-excused'>E</i>Excused</span>
          </div>

          {data.users.length === 0 && <div className='ws-empty'>No staff members found.</div>}

          {data.users.length > 0 && mode === 'matrix' && (
            <div className='mv-card'>
              <div className='mv-scroll'>
                <table className='mv-table'>
                  <thead>
                    <tr>
                      <th className='mv-sl mv-th-name'>Staff</th>
                      {data.dates.map((d) => (
                        <th
                          key={d}
                          className={`mv-dh ${isSundayStr(d) ? 'sun' : ''} ${holidayMap.has(d) ? 'hol' : ''} ${d === today ? 'today' : ''}`}
                          title={holidayMap.get(d) || ''}
                        >
                          <div className='mv-dn'>{dayNum(d)}</div>
                          <div className='mv-dw'>{'SMTWTFS'[dow(d)]}</div>
                        </th>
                      ))}
                      <th className='mv-sr mv-th-name'>
                        <span className='mv-badge mk-green'>✓</span>
                        <span className='mv-badge mk-blue'>L</span>
                        <span className='mv-badge mk-red'>!</span>
                        <span className='mv-badge mk-absent'>A</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => {
                      const rate = rateOf(u)
                      return (
                        <tr key={u.id}>
                          <td className='mv-sl'>
                            <div className='mv-user'>
                              <div className='mv-av'>{initials(u.name)}</div>
                              <div>
                                <div className='mv-un'>{u.name}</div>
                                <div className={`mv-rate ${rateClass(rate)}`}>
                                  <span className='mv-rate-bar'><i style={{ width: `${rate || 0}%` }} /></span>
                                  {rate === null ? 'No data yet' : `${rate}% clean`}
                                </div>
                              </div>
                            </div>
                          </td>
                          {u.cells.map((c) => {
                            const k = kindOf(c)
                            return (
                              <td key={c.date} className={`mv-td ${isSundayStr(c.date) || holidayMap.has(c.date) ? 'offcol' : ''} ${c.date === today ? 'today' : ''}`}>
                                <button
                                  className={`mv-c mk-${k} ${c.date === today ? 'today' : ''}`}
                                  title={tip(c)}
                                  onClick={() => onPick(c.date, u.id)}
                                >
                                  {SYMBOL[k] || ''}
                                </button>
                              </td>
                            )
                          })}
                          <td className='mv-sr'>
                            <span className={`mv-badge mk-green ${u.summary.green ? '' : 'zero'}`}>{u.summary.green}</span>
                            <span className={`mv-badge mk-blue ${u.summary.blue ? '' : 'zero'}`}>{u.summary.blue}</span>
                            <span className={`mv-badge mk-red ${u.summary.red ? '' : 'zero'}`}>{u.summary.red}</span>
                            <span className={`mv-badge mk-absent ${u.summary.absent ? '' : 'zero'}`}>{u.summary.absent}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.users.length > 0 && mode === 'calendar' && calU && (
            <>
              {isAdmin && (
                <div className='ws-pills'>
                  {data.users.map((u) => (
                    <button key={u.id} className={`ws-pill ${u.id === calU.id ? 'on' : ''}`} onClick={() => setCalUser(u.id)}>
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
              <div className='mv-card'>
                <div className='mv-cal'>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((h) => (
                    <div key={h} className={`mv-cal-h ${h === 'Sun' ? 'sun' : ''}`}>{h}</div>
                  ))}
                  {[...Array((dow(data.dates[0]) + 6) % 7).fill(null), ...calU.cells].map((c, i) => {
                    if (!c) return <div key={`p${i}`} className='mv-cc pad' />
                    const k = kindOf(c)
                    const hol = holidayMap.get(c.date)
                    return (
                      <button
                        key={c.date}
                        className={`mv-cc mk-${k} ${c.date === today ? 'today' : ''}`}
                        title={tip(c)}
                        onClick={() => onPick(c.date, calU.id)}
                      >
                        <span className='mv-cc-d'>{dayNum(c.date)}</span>
                        {SYMBOL[k] && <span className='mv-cc-s'>{LABEL[k]}</span>}
                        {c.rows > 0 && <span className='mv-cc-r'>{c.done}/{c.rows} done</span>}
                        {hol && <span className='mv-cc-h'>{hol}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}