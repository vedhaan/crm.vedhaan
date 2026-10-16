import { useCallback, useEffect, useState } from 'react'
import API from '../../api/axios'
import { getApiError } from './worksheetUtils'

const parseTypes = (text) =>
  [...new Set(text.split(',').map((t) => t.trim()).filter(Boolean))].slice(0, 25)

function StreamCard({ stream, onChanged, onError }) {
  const [form, setForm] = useState({
    name: stream.name,
    countLabel: stream.countLabel,
    types: stream.taskTypes.join(', '),
    requireProof: stream.requireProof
  })
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await API.patch(`/worksheet/streams/${stream.id}`, {
        name: form.name,
        countLabel: form.countLabel,
        taskTypes: parseTypes(form.types),
        requireProof: form.requireProof
      })
      onError('')
      await onChanged()
    } catch (e) {
      onError(getApiError(e, 'Could not save the stream'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Delete the "${stream.name}" stream?`)) return
    setBusy(true)
    try {
      await API.delete(`/worksheet/streams/${stream.id}`)
      onError('')
      await onChanged()
    } catch (e) {
      onError(getApiError(e, 'Could not delete the stream'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='v-card' style={{ marginBottom: 12 }}>
      <div className='v-card-body'>
        <div className='v-row2'>
          <div className='v-field'>
            <label className='v-label'>Stream name</label>
            <input className='v-input' value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className='v-field'>
            <label className='v-label'>Count label (what Target counts)</label>
            <input className='v-input' value={form.countLabel} maxLength={40} onChange={(e) => setForm({ ...form, countLabel: e.target.value })} />
          </div>
        </div>
        <div className='v-field'>
          <label className='v-label'>Task types (comma separated)</label>
          <textarea className='v-textarea' style={{ minHeight: 60 }} value={form.types} onChange={(e) => setForm({ ...form, types: e.target.value })} />
        </div>
        <label className='ws-switch' style={{ marginBottom: 12 }}>
          <input type='checkbox' checked={form.requireProof} onChange={(e) => setForm({ ...form, requireProof: e.target.checked })} />
          Require a file or proof link before a row can be marked Done
        </label>
        <div className='v-row-actions' style={{ justifyContent: 'space-between' }}>
          <span className='v-muted'>{stream.userCount} staff in this stream</span>
          <div className='v-row-actions'>
            <button type='button' className='v-btn sm soft-danger' disabled={busy} onClick={remove}>Delete</button>
            <button type='button' className='v-btn sm primary' disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StreamsManager() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [newForm, setNewForm] = useState({ name: '', countLabel: '', types: '' })

  const load = useCallback(async () => {
    try {
      const r = await API.get('/worksheet/streams')
      setData(r.data)
    } catch (e) {
      setError(getApiError(e, 'Failed to load streams'))
    }
  }, [])

  useEffect(() => { load() }, [load])

  const seed = async () => {
    try {
      await API.post('/worksheet/streams/seed')
      setError('')
      await load()
    } catch (e) {
      setError(getApiError(e, 'Could not add the default streams'))
    }
  }

  const create = async (ev) => {
    ev.preventDefault()
    try {
      await API.post('/worksheet/streams', {
        name: newForm.name,
        countLabel: newForm.countLabel,
        taskTypes: parseTypes(newForm.types)
      })
      setNewForm({ name: '', countLabel: '', types: '' })
      setError('')
      await load()
    } catch (e) {
      setError(getApiError(e, 'Could not create the stream'))
    }
  }

  const setStream = async (userId, streamId) => {
    try {
      await API.put(`/worksheet/staff/${userId}/stream`, { streamId: streamId || null })
      setError('')
      await load()
    } catch (e) {
      setError(getApiError(e, 'Could not change the stream'))
    }
  }

  if (!data) return <div className='ws-empty'>{error || 'Loading streams...'}</div>

  return (
    <div>
      {error && <div className='ws-banner err'>{error}</div>}

      <div className='ws-h2' style={{ marginTop: 0 }}>Staff and their streams</div>
      <div className='v-table-wrap' style={{ marginBottom: 22 }}>
        <div className='v-table-scroll'>
          <table className='v-table'>
            <thead>
              <tr><th>Name</th><th>Role</th><th>Stream</th></tr>
            </thead>
            <tbody>
              {data.staff.map((s) => (
                <tr key={s.id}>
                  <td className='v-cell-main'><span className='v-strong'>{s.name}</span></td>
                  <td data-label='Role'>{s.role}</td>
                  <td data-label='Stream'>
                    <select className='v-select sm' value={s.streamId || ''} onChange={(e) => setStream(s.id, e.target.value)}>
                      <option value=''>No stream</option>
                      {data.streams.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className='ws-h2'>Streams</div>
      {data.streams.length === 0 && (
        <div className='ws-empty' style={{ marginBottom: 14 }}>
          <div style={{ marginBottom: 12 }}>No streams yet.</div>
          <button type='button' className='v-btn primary' onClick={seed}>Add default streams (HR, Developer, SEO, Digital Marketer, Management)</button>
        </div>
      )}

      {data.streams.map((s) => (
        <StreamCard
          key={`${s.id}|${s.name}|${s.countLabel}|${s.requireProof}|${s.taskTypes.join('|')}`}
          stream={s}
          onChanged={load}
          onError={setError}
        />
      ))}

      <div className='ws-h2'>Add a stream</div>
      <form className='ws-add' onSubmit={create}>
        <input className='ws-in' placeholder='Stream name' value={newForm.name} maxLength={60} required onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
        <input className='ws-in' placeholder='Count label, e.g. Posts' value={newForm.countLabel} maxLength={40} onChange={(e) => setNewForm({ ...newForm, countLabel: e.target.value })} />
        <input className='ws-in grow' placeholder='Task types, comma separated' value={newForm.types} onChange={(e) => setNewForm({ ...newForm, types: e.target.value })} />
        <button type='submit' className='ws-btn primary'>Add stream</button>
      </form>
    </div>
  )
}