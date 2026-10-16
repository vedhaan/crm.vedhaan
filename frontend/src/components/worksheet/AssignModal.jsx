import { useMemo, useState } from 'react'
import API from '../../api/axios'
import Modal from '../ui/Modal'
import { getApiError } from './worksheetUtils'

export default function AssignModal({ staff, streams, defaultDate, defaultUserId, onClose, onDone, flash }) {
  const [ids, setIds] = useState(defaultUserId ? [defaultUserId] : [])
  const [form, setForm] = useState({
    title: '', client: '', targetCount: '', taskType: '', estHours: '', remarks: '', date: defaultDate
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const groups = useMemo(() => {
    const map = new Map()
    staff.forEach((s) => {
      const key = s.user.stream ? s.user.stream.name : 'No stream'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(s.user)
    })
    return [...map.entries()]
  }, [staff])

  const allTypes = useMemo(() => [...new Set(streams.flatMap((s) => s.taskTypes))], [streams])

  const toggle = (id) => setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleGroup = (users) => {
    const groupIds = users.map((u) => u.id)
    const allOn = groupIds.every((id) => ids.includes(id))
    setIds((p) => (allOn ? p.filter((id) => !groupIds.includes(id)) : [...new Set([...p, ...groupIds])]))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (ids.length === 0) return setError('Select at least one staff member')
    setSaving(true)
    setError('')
    try {
      const r = await API.post('/worksheet/assign', {
        userIds: ids,
        date: form.date,
        title: form.title,
        client: form.client,
        taskType: form.taskType,
        targetCount: form.targetCount === '' ? null : Number(form.targetCount),
        estHours: form.estHours === '' ? null : Number(form.estHours),
        remarks: form.remarks
      })
      flash('ok', `Assigned to ${r.data.created} staff member${r.data.created !== 1 ? 's' : ''}`)
      onDone()
    } catch (err) {
      setError(getApiError(err, 'Could not assign the work'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title='Assign work'
      subtitle='Staff get a notification and the row appears on their sheet as ASSIGNED.'
      size='lg'
      onClose={onClose}
      footer={
        <>
          <button type='button' className='v-btn' onClick={onClose}>Cancel</button>
          <button type='submit' form='assign-form' className='v-btn primary' disabled={saving}>
            {saving ? 'Assigning...' : `Assign to ${ids.length || 0}`}
          </button>
        </>
      }
    >
      {error && <div className='v-alert err'>{error}</div>}
      <form id='assign-form' onSubmit={submit}>
        <div className='v-field'>
          <label className='v-label'>Who</label>
          {groups.length === 0 && <div className='v-muted'>No staff found.</div>}
          {groups.map(([name, users]) => (
            <div key={name} style={{ marginBottom: 10 }}>
              <button type='button' className='v-link' onClick={() => toggleGroup(users)}>
                {name} (select all)
              </button>
              <div className='v-chips' style={{ marginTop: 6 }}>
                {users.map((u) => (
                  <button
                    key={u.id}
                    type='button'
                    className={`v-chip${ids.includes(u.id) ? ' on' : ''}`}
                    onClick={() => toggle(u.id)}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className='v-field'>
          <label className='v-label'>Task *</label>
          <input className='v-input' value={form.title} maxLength={300} required onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder='e.g. Edit the product video for client X' />
        </div>

        <div className='v-row2'>
          <div className='v-field'>
            <label className='v-label'>Date</label>
            <input className='v-input' type='date' value={form.date} required onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className='v-field'>
            <label className='v-label'>Type</label>
            <input className='v-input' list='assign-types' value={form.taskType} maxLength={60} onChange={(e) => setForm({ ...form, taskType: e.target.value })} placeholder='e.g. Video editing' />
            <datalist id='assign-types'>
              {allTypes.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
        </div>

        <div className='v-row2'>
          <div className='v-field'>
            <label className='v-label'>Client / Project</label>
            <input className='v-input' value={form.client} maxLength={150} onChange={(e) => setForm({ ...form, client: e.target.value })} />
          </div>
          <div className='v-row2'>
            <div className='v-field'>
              <label className='v-label'>Target</label>
              <input className='v-input' type='number' min='1' value={form.targetCount} onChange={(e) => setForm({ ...form, targetCount: e.target.value })} placeholder='1' />
            </div>
            <div className='v-field'>
              <label className='v-label'>Est. hours</label>
              <input className='v-input' type='number' min='0' step='0.25' value={form.estHours} onChange={(e) => setForm({ ...form, estHours: e.target.value })} />
            </div>
          </div>
        </div>

        <div className='v-field'>
          <label className='v-label'>Note for staff</label>
          <textarea className='v-textarea' value={form.remarks} maxLength={1000} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder='Instructions, deadline details, links...' />
        </div>
      </form>
    </Modal>
  )
}