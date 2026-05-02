import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/Sidebar'
import PageWrapper from '../../components/PageWrapper'
import API from '../../api/axios'

const STATUS_COLORS = {
  NEW: { background: '#f0f4ff', color: '#3b5bdb', border: '1px solid #bac8ff' },
  CONTACTED: { background: '#f8f0ff', color: '#7c3aed', border: '1px solid #d8b4fe' },
  FOLLOW_UP: { background: '#fff8f0', color: '#f77b24', border: '1px solid #ffddb3' },
  CONVERTED: { background: '#f0faf4', color: '#2d8653', border: '1px solid #b7e4c7' },
  LOST: { background: '#f7f7f7', color: '#aaa', border: '1px solid #e0e0e0' }
}

const SOURCES = ['Phone Call', 'WhatsApp', 'Walk-in', 'Instagram', 'Reference', 'Website', 'Other']
const SERVICES = ['Website Development', 'Shopify Development', 'SEO', 'Digital Marketing', 'AI & Automation', 'Graphic Design', 'Other']
const STATUSES = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'LOST']

const Leads = () => {
  const { user } = useAuth()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [form, setForm] = useState({
    name: '', phone: '', source: '', service: '', notes: '', followUpAt: '', status: 'NEW'
  })

  const fetchLeads = async () => {
    try {
      const res = await API.get('/leads')
      setLeads(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLeads() }, [])

  const openAdd = () => {
    setEditLead(null)
    setForm({ name: '', phone: '', source: '', service: '', notes: '', followUpAt: '', status: 'NEW' })
    setError('')
    setShowModal(true)
  }

  const openEdit = (lead) => {
    setEditLead(lead)
    setForm({
      name: lead.name,
      phone: lead.phone || '',
      source: lead.source || '',
      service: lead.service || '',
      notes: lead.notes || '',
      followUpAt: lead.followUpAt ? lead.followUpAt.split('T')[0] : '',
      status: lead.status
    })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditLead(null)
    setError('')
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editLead) {
        await API.put(`/leads/${editLead.id}`, form)
      } else {
        await API.post('/leads', form)
      }
      await fetchLeads()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await API.delete(`/leads/${id}`)
      await fetchLeads()
      setDeleteId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = filterStatus === 'ALL' ? leads : leads.filter(l => l.status === filterStatus)

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length
    return acc
  }, {})

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f7f6f4;font-family:'DM Sans',sans-serif}
        .layout{display:flex;min-height:100vh;background:#f7f6f4}
        .main{flex:1;padding:36px 40px;overflow-y:auto}
        .page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
        .page-title{font-family:'Sora',sans-serif;font-size:24px;font-weight:700;color:#1a1a1a}
        .page-sub{font-size:14px;color:#888;margin-top:4px}
        .btn-primary{padding:10px 20px;background:linear-gradient(135deg,#b14b90,#ea5580);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:opacity 0.2s}
        .btn-primary:hover{opacity:0.88}
        .summary-row{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px}
        .sum-card{background:#fff;border-radius:10px;padding:14px 16px;border:1px solid #ececea;cursor:pointer;transition:all 0.15s}
        .sum-card:hover{border-color:#b14b90}
        .sum-card.active{border-color:#b14b90;background:#fdf5fb}
        .sum-label{font-size:10px;color:#aaa;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px}
        .sum-value{font-family:'Sora',sans-serif;font-size:20px;font-weight:700;color:#1a1a1a}
        .filter-row{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
        .filter-btn{padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid #e0e0e0;background:#fff;color:#888;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s}
        .filter-btn.active{background:#0f0f1a;color:#fff;border-color:#0f0f1a}
        .table-wrap{background:#fff;border-radius:12px;border:1px solid #ececea;overflow:hidden}
        table{width:100%;border-collapse:collapse}
        th{padding:11px 20px;text-align:left;font-size:11px;font-weight:600;color:#aaa;letter-spacing:0.5px;text-transform:uppercase;background:#fafafa;border-bottom:1px solid #f0f0f0}
        td{padding:13px 20px;font-size:13px;color:#333;border-bottom:1px solid #f7f7f7;vertical-align:middle}
        tr:last-child td{border-bottom:none}
        tr:hover td{background:#fafafa}
        .lead-name{font-weight:500;color:#1a1a1a;font-size:14px}
        .lead-source{font-size:11px;color:#aaa;margin-top:2px}
        .status-badge{display:inline-flex;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600}
        .followup-date{font-size:12px;color:#888}
        .followup-today{font-size:12px;color:#f77b24;font-weight:600}
        .action-btns{display:flex;gap:6px}
        .btn-edit{padding:6px 14px;background:#f5f5f5;border:none;border-radius:6px;font-size:12px;font-weight:500;color:#555;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s}
        .btn-edit:hover{background:#ececec}
        .btn-del{padding:6px 14px;background:#fff0f0;border:none;border-radius:6px;font-size:12px;font-weight:500;color:#d45b64;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s}
        .btn-del:hover{background:#fde0e0}
        .empty{padding:60px 20px;text-align:center;color:#bbb;font-size:14px}
        .loading{padding:60px 20px;text-align:center;color:#bbb;font-size:14px}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
        .modal{background:#fff;border-radius:16px;padding:36px;width:100%;max-width:500px;box-shadow:0 20px 60px rgba(0,0,0,0.15);max-height:90vh;overflow-y:auto}
        .modal-title{font-family:'Sora',sans-serif;font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:24px}
        .field{margin-bottom:16px}
        .field label{display:block;font-size:11px;font-weight:600;color:#888;letter-spacing:0.4px;margin-bottom:6px;text-transform:uppercase}
        .field input,.field select,.field textarea{width:100%;padding:10px 14px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;color:#1a1a1a;outline:none;transition:border 0.2s;background:#fafafa}
        .field input:focus,.field select:focus,.field textarea:focus{border-color:#b14b90;background:#fff}
        .field textarea{resize:vertical;min-height:80px}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .modal-actions{display:flex;gap:10px;margin-top:24px}
        .btn-cancel{flex:1;padding:11px;background:#f5f5f5;border:none;border-radius:8px;font-size:14px;font-weight:500;color:#555;cursor:pointer;font-family:'DM Sans',sans-serif}
        .btn-save{flex:2;padding:11px;background:linear-gradient(135deg,#b14b90,#ea5580);border:none;border-radius:8px;font-size:14px;font-weight:600;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity 0.2s}
        .btn-save:hover{opacity:0.88}
        .btn-save:disabled{opacity:0.6;cursor:not-allowed}
        .modal-error{background:#fff0f0;border:1px solid #ffd0d0;color:#c0392b;font-size:13px;padding:10px 14px;border-radius:8px;margin-bottom:16px}
        .confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px}
        .confirm-box{background:#fff;border-radius:12px;padding:28px;width:100%;max-width:360px}
        .confirm-title{font-family:'Sora',sans-serif;font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:8px}
        .confirm-sub{font-size:13px;color:#888;margin-bottom:24px}
        .confirm-actions{display:flex;gap:10px}
        .btn-confirm-cancel{flex:1;padding:10px;background:#f5f5f5;border:none;border-radius:8px;font-size:13px;font-weight:500;color:#555;cursor:pointer;font-family:'DM Sans',sans-serif}
        .btn-confirm-del{flex:1;padding:10px;background:#d45b64;border:none;border-radius:8px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif}
      `}</style>

      <div className='layout'>
        <Sidebar />
        <main className='main'>
          <PageWrapper>
            <div className='page-header'>
              <div>
                <h1 className='page-title'>Leads</h1>
                <p className='page-sub'>{leads.length} lead{leads.length !== 1 ? 's' : ''} total</p>
              </div>
              {user?.role === 'ADMIN' && (
                <button className='btn-primary' onClick={openAdd}>+ Add Lead</button>
              )}
            </div>

            <div className='summary-row'>
              {STATUSES.map(s => (
                <div
                  key={s}
                  className={`sum-card ${filterStatus === s ? 'active' : ''}`}
                  onClick={() => setFilterStatus(filterStatus === s ? 'ALL' : s)}
                >
                  <div className='sum-label'>{s.replace('_', ' ')}</div>
                  <div className='sum-value' style={{ color: STATUS_COLORS[s].color }}>{counts[s] || 0}</div>
                </div>
              ))}
            </div>

            <div className='filter-row'>
              <button className={`filter-btn ${filterStatus === 'ALL' ? 'active' : ''}`} onClick={() => setFilterStatus('ALL')}>
                All ({leads.length})
              </button>
              {STATUSES.map(s => (
                <button
                  key={s}
                  className={`filter-btn ${filterStatus === s ? 'active' : ''}`}
                  onClick={() => setFilterStatus(s)}
                >
                  {s.replace('_', ' ')} ({counts[s] || 0})
                </button>
              ))}
            </div>

            <div className='table-wrap'>
              {loading ? (
                <div className='loading'>Loading leads...</div>
              ) : filtered.length === 0 ? (
                <div className='empty'>No leads found.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Lead</th>
                      <th>Phone</th>
                      <th>Service</th>
                      <th>Status</th>
                      <th>Follow Up</th>
                      <th>Notes</th>
                      {user?.role === 'ADMIN' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead) => {
                      const isToday = lead.followUpAt &&
                        new Date(lead.followUpAt).toDateString() === new Date().toDateString()
                      return (
                        <tr key={lead.id}>
                          <td>
                            <div className='lead-name'>{lead.name}</div>
                            <div className='lead-source'>{lead.source || '—'}</div>
                          </td>
                          <td>{lead.phone || '—'}</td>
                          <td>{lead.service || '—'}</td>
                          <td>
                            <span className='status-badge' style={STATUS_COLORS[lead.status]}>
                              {lead.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            {lead.followUpAt ? (
                              <span className={isToday ? 'followup-today' : 'followup-date'}>
                                {isToday ? 'Today' : new Date(lead.followUpAt).toLocaleDateString('en-IN')}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.notes || '—'}
                          </td>
                          {user?.role === 'ADMIN' && (
                            <td>
                              <div className='action-btns'>
                                <button className='btn-edit' onClick={() => openEdit(lead)}>Edit</button>
                                <button className='btn-del' onClick={() => setDeleteId(lead.id)}>Delete</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </PageWrapper>
        </main>
      </div>

      {showModal && (
        <div className='overlay' onClick={closeModal}>
          <div className='modal' onClick={e => e.stopPropagation()}>
            <h2 className='modal-title'>{editLead ? 'Update Lead' : 'Add New Lead'}</h2>
            {error && <div className='modal-error'>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className='field-row'>
                <div className='field'>
                  <label>Full Name *</label>
                  <input name='name' value={form.name} onChange={handleChange} placeholder='e.g. Raj Patel' required />
                </div>
                <div className='field'>
                  <label>Phone</label>
                  <input name='phone' value={form.phone} onChange={handleChange} placeholder='e.g. 9876543210' />
                </div>
              </div>
              <div className='field-row'>
                <div className='field'>
                  <label>Source</label>
                  <select name='source' value={form.source} onChange={handleChange}>
                    <option value=''>Select source</option>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className='field'>
                  <label>Service Interested</label>
                  <select name='service' value={form.service} onChange={handleChange}>
                    <option value=''>Select service</option>
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className='field-row'>
                <div className='field'>
                  <label>Status</label>
                  <select name='status' value={form.status} onChange={handleChange}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className='field'>
                  <label>Follow Up Date</label>
                  <input name='followUpAt' type='date' value={form.followUpAt} onChange={handleChange} />
                </div>
              </div>
              <div className='field'>
                <label>Notes</label>
                <textarea name='notes' value={form.notes} onChange={handleChange} placeholder='Any details about this lead...' />
              </div>
              <div className='modal-actions'>
                <button type='button' className='btn-cancel' onClick={closeModal}>Cancel</button>
                <button type='submit' className='btn-save' disabled={saving}>
                  {saving ? 'Saving...' : editLead ? 'Update Lead' : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className='confirm-overlay'>
          <div className='confirm-box'>
            <h3 className='confirm-title'>Delete Lead?</h3>
            <p className='confirm-sub'>This lead will be permanently deleted.</p>
            <div className='confirm-actions'>
              <button className='btn-confirm-cancel' onClick={() => setDeleteId(null)}>Cancel</button>
              <button className='btn-confirm-del' onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Leads