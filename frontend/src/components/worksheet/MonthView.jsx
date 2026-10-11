import { useCallback, useEffect, useState } from 'react'
import API from '../../api/axios'
import { STATUS_META, fmtMonth, getApiError, isSundayStr, shiftMonth } from './worksheetUtils'

const cellClass = (c) => {
  if (c.marks.length === 2) return 'both'
  if (c.marks[0] === 'RED') return 'red'
  if (c.marks[0] === 'BLUE') return 'blue'
  return { GREEN: 'green', OPEN: 'open', ABSENT: 'absent', OFF: 'off', FUTURE: 'future', NA: 'na' }[c.status] || 'off'
}

const cellTitle = (c) => {
  const text = c.marks.length
    ? c.marks.map((m) => (m === 'RED' ? 'Unfinished' : 'Late plan')).join(' + ')
    : STATUS_META[c.status].label
  return `${c.date}: ${text}`
}

export default function MonthView({ isAdmin, onPick }) {
  const [month, setMonth] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await API.get('/worksheet/month', { params: month ? { month } : {} })
      setData(r.data)
      setError('')
    } catch (e) {
      setError(getApiError(e, 'Failed to load the month'))
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  const holidayMap = new Map((data ? data.holidays : []).map((h) => [h.date, h.name]))

  return (
    <div>
      <div className='ws-toolbar'>
        <div className='ws-datenav'>
          <button className='ws-btn' onClick={() => data && setMonth(shiftMonth(data.month, -1))}>Prev</button>
          <span className='ws-monthlabel'>{data ? fmtMonth(data.month) : '...'}</span>
          <button className='ws-btn' onClick={() => data && setMonth(shiftMonth(data.month, 1))}>Next</button>
          <button className='ws-btn' onClick={() => setMonth('')}>This month</button>
        </div>
        <div className='ws-legend'>
          <span><i className='ws-mc green' /> Complete</span>
          <span><i className='ws-mc blue' /> Late plan</span>
          <span><i className='ws-mc red' /> Unfinished</span>
          <span><i className='ws-mc both' /> Both</span>
          <span><i className='ws-mc absent' /> Absent</span>
          <span><i className='ws-mc off' /> Off</span>
          <span><i className='ws-mc open' /> Open</span>
        </div>
      </div>

      {error && <div className='ws-banner err'>{error}</div>}

      {loading && !data ? (
        <div className='ws-empty'>Loading month...</div>
      ) : data && (
        <div className='ws-scroll'>
          <table className='ws-month'>
            <thead>
              <tr>
                <th className='ws-m-name'>{isAdmin ? 'Staff' : 'You'}</th>
                {data.dates.map((d) => (
                  <th
                    key={d}
                    className={`ws-m-day ${isSundayStr(d) ? 'sun' : ''} ${holidayMap.has(d) ? 'hol' : ''}`}
                    title={holidayMap.get(d) || ''}
                  >
                    {Number(d.slice(8))}
                  </th>
                ))}
                <th className='ws-m-sum red'>Red</th>
                <th className='ws-m-sum blue'>Blue</th>
                <th className='ws-m-sum green'>Done</th>
                <th className='ws-m-sum amber'>Abs</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td className='ws-m-name'>{u.name}</td>
                  {u.cells.map((c) => (
                    <td key={c.date} className='ws-m-cell'>
                      <button
                        className={`ws-mc ${cellClass(c)}`}
                        title={cellTitle(c)}
                        onClick={() => onPick(c.date, u.id)}
                      >
                        {c.status === 'ABSENT' ? 'A' : ''}
                      </button>
                    </td>
                  ))}
                  <td className='ws-m-sum'>{u.summary.red}</td>
                  <td className='ws-m-sum'>{u.summary.blue}</td>
                  <td className='ws-m-sum'>{u.summary.green}</td>
                  <td className='ws-m-sum'>{u.summary.absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}