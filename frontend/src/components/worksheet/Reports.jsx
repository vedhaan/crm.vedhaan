import { useCallback, useEffect, useState } from 'react'
import API from '../../api/axios'
import { downloadCsv, fmtMonth, getApiError, shiftMonth } from './worksheetUtils'

export default function Reports() {
  const [month, setMonth] = useState('')
  const [streamId, setStreamId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await API.get('/worksheet/report', {
        params: { ...(month ? { month } : {}), ...(streamId ? { streamId } : {}) }
      })
      setData(r.data)
      setError('')
    } catch (e) {
      setError(getApiError(e, 'Failed to load the report'))
    } finally {
      setLoading(false)
    }
  }, [month, streamId])

  useEffect(() => { load() }, [load])

  const exportCsv = () => {
    if (!data) return
    const head = [
      'Staff', 'Stream', 'Rows', 'Rows done', 'Target total', 'Done total', 'Est hours', 'Spent hours',
      'Late rows', 'Assigned rows', 'Carried in', 'Carried out', 'Files',
      'Clean days', 'Carried days', 'Late plan days', 'Unfinished days', 'Absent', 'Excused'
    ]
    const rows = data.users.map((u) => [
      u.name, u.stream, u.rows, u.doneRows, u.target, u.done, u.est, u.spent,
      u.late, u.assigned, u.carriedIn, u.carriedOut, u.files,
      u.marks.green, u.marks.carried, u.marks.blue, u.marks.red, u.marks.absent, u.marks.excused
    ])
    downloadCsv(`worksheet-report-${data.month}.csv`, [head, ...rows])
  }

  return (
    <div>
      <div className='ws-toolbar'>
        <div className='ws-datenav'>
          <button className='ws-btn' onClick={() => data && setMonth(shiftMonth(data.month, -1))}>Prev</button>
          <span className='ws-monthlabel'>{data ? fmtMonth(data.month) : '...'}</span>
          <button className='ws-btn' onClick={() => data && setMonth(shiftMonth(data.month, 1))}>Next</button>
          <button className='ws-btn' onClick={() => setMonth('')}>This month</button>
        </div>
        <div className='ws-datenav'>
          {data && (
            <select className='ws-in' value={streamId} onChange={(e) => setStreamId(e.target.value)}>
              <option value=''>All streams</option>
              {data.streamList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <button className='ws-btn primary' onClick={exportCsv} disabled={!data || data.users.length === 0}>Download CSV</button>
        </div>
      </div>

      {error && <div className='ws-banner err'>{error}</div>}

      {loading && !data ? (
        <div className='ws-empty'>Loading report...</div>
      ) : data && (
        <>
          <div className='ws-h2'>By stream</div>
          <div className='v-table-wrap' style={{ marginBottom: 22 }}>
            <div className='v-table-scroll'>
              <table className='v-table'>
                <thead>
                  <tr>
                    <th>Stream</th><th>Staff</th><th>Rows</th><th>Rows done</th><th>Target</th><th>Done</th>
                    <th>Est h</th><th>Spent h</th><th>Assigned</th><th>Carried</th>
                  </tr>
                </thead>
                <tbody>
                  {data.streams.length === 0 && <tr><td colSpan={10} className='ws-norows'>No data.</td></tr>}
                  {data.streams.map((s) => (
                    <tr key={s.name}>
                      <td className='v-cell-main'><span className='v-strong'>{s.name}</span></td>
                      <td data-label='Staff'>{s.people}</td>
                      <td data-label='Rows'>{s.rows}</td>
                      <td data-label='Rows done'>{s.doneRows}</td>
                      <td data-label='Target'>{s.target}</td>
                      <td data-label='Done'><b>{s.done}</b></td>
                      <td data-label='Est h'>{s.est}</td>
                      <td data-label='Spent h'>{s.spent}</td>
                      <td data-label='Assigned'>{s.assigned}</td>
                      <td data-label='Carried'>{s.carriedIn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className='ws-h2'>By person</div>
          <div className='v-table-wrap' style={{ marginBottom: 22 }}>
            <div className='v-table-scroll'>
              <table className='v-table'>
                <thead>
                  <tr>
                    <th>Staff</th><th>Stream</th><th>Rows</th><th>Done rows</th><th>Target</th><th>Done</th>
                    <th>Spent h</th><th>Late rows</th><th>Assigned</th><th>Files</th>
                    <th>Clean days</th><th>Carried days</th><th>Late plan</th><th>Unfinished</th><th>Absent</th><th>Excused</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.length === 0 && <tr><td colSpan={16} className='ws-norows'>No staff found.</td></tr>}
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td className='v-cell-main'><span className='v-strong'>{u.name}</span></td>
                      <td data-label='Stream'>{u.stream}</td>
                      <td data-label='Rows'>{u.rows}</td>
                      <td data-label='Done rows'>{u.doneRows}</td>
                      <td data-label='Target'>{u.target}</td>
                      <td data-label='Done'><b>{u.done}</b></td>
                      <td data-label='Spent h'>{u.spent}</td>
                      <td data-label='Late rows'>{u.late}</td>
                      <td data-label='Assigned'>{u.assigned}</td>
                      <td data-label='Files'>{u.files}</td>
                      <td data-label='Clean days'>{u.marks.green}</td>
                      <td data-label='Carried days'>{u.marks.carried}</td>
                      <td data-label='Late plan'>{u.marks.blue}</td>
                      <td data-label='Unfinished' style={u.marks.red ? { color: '#E11D48', fontWeight: 700 } : null}>{u.marks.red}</td>
                      <td data-label='Absent'>{u.marks.absent}</td>
                      <td data-label='Excused'>{u.marks.excused}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className='ws-h2'>By task type</div>
          <div className='v-table-wrap'>
            <div className='v-table-scroll'>
              <table className='v-table'>
                <thead>
                  <tr><th>Stream</th><th>Type</th><th>Rows</th><th>Rows done</th><th>Done count</th></tr>
                </thead>
                <tbody>
                  {data.byType.length === 0 && <tr><td colSpan={5} className='ws-norows'>No rows this month.</td></tr>}
                  {data.byType.map((t) => (
                    <tr key={`${t.stream}|${t.type}`}>
                      <td className='v-cell-main'><span className='v-strong'>{t.stream}</span></td>
                      <td data-label='Type'>{t.type}</td>
                      <td data-label='Rows'>{t.rows}</td>
                      <td data-label='Rows done'>{t.doneRows}</td>
                      <td data-label='Done count'><b>{t.done}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}