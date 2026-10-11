import { useCallback, useEffect, useState } from 'react'
import API from '../../api/axios'
import { fmtDateShort, getApiError } from './worksheetUtils'

export default function HolidayManager() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [list, setList] = useState([])
  const [form, setForm] = useState({ date: '', name: '' })
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await API.get('/worksheet/holidays', { params: { year } })
      setList(r.data)
    } catch (e) {
      setMsg(getApiError(e, 'Failed to load holidays'))
    }
  }, [year])

  useEffect(() => { load() }, [load])

  const add = async (ev) => {
    ev.preventDefault()
    try {
      await API.post('/worksheet/holidays', form)
      setForm({ date: '', name: '' })
      setMsg(null)
      load()
    } catch (e) {
      setMsg(getApiError(e, 'Could not add the holiday'))
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Remove this holiday?')) return
    try {
      await API.delete(`/worksheet/holidays/${id}`)
      load()
    } catch (e) {
      setMsg(getApiError(e, 'Could not remove the holiday'))
    }
  }

  return (
    <div className='ws-holidays'>
      <div className='ws-toolbar'>
        <div className='ws-datenav'>
          <button className='ws-btn' onClick={() => setYear(year - 1)}>Prev</button>
          <span className='ws-monthlabel'>{year}</span>
          <button className='ws-btn' onClick={() => setYear(year + 1)}>Next</button>
        </div>
      </div>
      <p className='ws-hint'>Sundays are automatic. Add festival and public holidays here, otherwise those days turn red for everyone.</p>

      {msg && <div className='ws-banner err'>{msg}</div>}

      <form className='ws-add' onSubmit={add}>
        <input className='ws-in' type='date' value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        <input className='ws-in grow' placeholder='Holiday name, e.g. Diwali' value={form.name} maxLength={150} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <button type='submit' className='ws-btn primary'>Add holiday</button>
      </form>

      <div className='ws-hlist'>
        {list.length === 0 && <div className='ws-empty'>No holidays added for {year}.</div>}
        {list.map((h) => (
          <div key={h.id} className='ws-hrow'>
            <span className='ws-hdate'>{fmtDateShort(h.date)}</span>
            <span className='ws-hname'>{h.name}</span>
            <button className='ws-del' onClick={() => remove(h.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}