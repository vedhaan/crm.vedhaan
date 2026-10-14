import { useCallback, useEffect, useState } from 'react'
import API from '../../api/axios'
import {
  STATUS_OPTIONS_LABEL, addDays, downloadWorksheetFile, fileBadge, fmtDateLong,
  formatBytes, getApiError, progressPct, proofLinks
} from './worksheetUtils'

export default function SharedByAdmin() {
  const [date, setDate] = useState('')
  const [shown, setShown] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await API.get('/worksheet/shared', { params: date ? { date } : {} })
      setShown(r.data.date)
      setEntries(r.data.entries)
      setError('')
    } catch (e) {
      setError(getApiError(e, 'Failed to load shared work'))
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  const download = async (f) => {
    try { await downloadWorksheetFile(f.id) } catch (e) { setError(getApiError(e, 'Download failed')) }
  }

  return (
    <div>
      <div className='ws-toolbar'>
        <div className='ws-datenav'>
          <button className='ws-btn' onClick={() => shown && setDate(addDays(shown, -1))}>Prev</button>
          <input className='ws-in' type='date' value={shown} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button className='ws-btn' onClick={() => shown && setDate(addDays(shown, 1))}>Next</button>
          <button className='ws-btn' onClick={() => setDate('')}>Today</button>
        </div>
      </div>
      {shown && <div className='ws-daytitle'>{fmtDateLong(shown)}</div>}
      {error && <div className='ws-banner err'>{error}</div>}

      {loading ? (
        <div className='ws-empty'>Loading...</div>
      ) : entries.length === 0 ? (
        <div className='ws-empty'>Admin has not shared any work for this day.</div>
      ) : (
        <div className='ws-sgrid'>
          {entries.map((e) => (
            <div key={e.id} className={`ws-scard ${e.status === 'DONE' ? 'green' : ''}`}>
              <div className='ws-sc-top'>
                <div className='ws-sc-name'>{e.title}</div>
                <span className='ws-chip grey'>{STATUS_OPTIONS_LABEL[e.status]}</span>
              </div>
              <div className='ws-hint'>{e.ownerName}{e.client ? ` · ${e.client}` : ''}</div>
              {e.targetCount ? (
                <>
                  <div className='ws-bar' style={{ margin: 0 }}><i style={{ width: `${progressPct(e)}%` }} /></div>
                  <div className='ws-sc-meta'><span><b>{e.doneCount}/{e.targetCount}</b> done</span></div>
                </>
              ) : null}
              {e.remarks && <div className='ws-hint'>{e.remarks}</div>}
              {proofLinks(e.proof).slice(0, 20).map((l, i) => (
                <div key={i}><a href={l} target='_blank' rel='noreferrer' style={{ fontSize: 12, color: '#2563EB', wordBreak: 'break-all' }}>{l}</a></div>
              ))}
              <div className='ws-files'>
                {e.files.map((f) => {
                  const b = fileBadge(f.fileName)
                  return (
                    <div key={f.id} className='ws-file'>
                      <div className={`ws-fb ${b.cls}`}>{b.label}</div>
                      <div className='ws-fi'>
                        <div className='ws-fn' title={f.fileName}>{f.fileName}</div>
                        <div className='ws-fm'>{formatBytes(f.fileSize)}</div>
                      </div>
                      <button className='ws-btn small' onClick={() => download(f)}>Download</button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}