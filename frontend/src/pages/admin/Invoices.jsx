import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/Sidebar'
import PageWrapper from '../../components/PageWrapper'
import API from '../../api/axios'

const Invoices = () => {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({ clientId: '', amount: '', dueDate: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const fetchAll = async () => {
    try {
      const [invRes, clientRes] = await Promise.all([
        API.get('/invoices'),
        API.get('/clients')
      ])
      setInvoices(invRes.data)
      setClients(clientRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const openAdd = () => {
    setForm({ clientId: '', amount: '', dueDate: '' })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
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
      await API.post('/invoices', form)
      await fetchAll()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const markPaid = async (id) => {
    setActionLoading(id + '-paid')
    try {
      await API.put(`/invoices/${id}/paid`)
      await fetchAll()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  const markOverdue = async (id) => {
    setActionLoading(id + '-overdue')
    try {
      await API.put(`/invoices/${id}/overdue`)
      await fetchAll()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id) => {
    try {
      await API.delete(`/invoices/${id}`)
      await fetchAll()
      setDeleteId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const statusStyle = (status) => {
    if (status === 'PAID') return { background: '#f0faf4', color: '#2d8653', border: '1px solid #b7e4c7' }
    if (status === 'OVERDUE') return { background: '#fff0f0', color: '#d45b64', border: '1px solid #ffd0d0' }
    return { background: '#fff8f0', color: '#f77b24', border: '1px solid #ffddb3' }
  }

  const totalUnpaid = invoices.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + i.amount, 0)
  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0)

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
        .summary-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
        .sum-card{background:#fff;border-radius:12px;padding:18px 22px;border:1px solid #ececea;border-left:4px solid var(--accent)}
        .sum-label{font-size:11px;color:#888;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;margin-bottom:8px}
        .sum-value{font-family:'Sora',sans-serif;font-size:22px;font-weight:700;color:#1a1a1a}
        .table-wrap{background:#fff;border-radius:12px;border:1px solid #ececea;overflow:hidden}
        table{width:100%;border-collapse:collapse}
        th{padding:11px 20px;text-align:left;font-size:11px;font-weight:600;color:#aaa;letter-spacing:0.5px;text-transform:uppercase;background:#fafafa;border-bottom:1px solid #f0f0f0}
        td{padding:14px 20px;font-size:13px;color:#333;border-bottom:1px solid #f7f7f7;vertical-align:middle}
        tr:last-child td{border-bottom:none}
        tr:hover td{background:#fafafa}
        .status-badge{display:inline-flex;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600}
        .action-btns{display:flex;gap:6px;flex-wrap:wrap}
        .btn-sm{padding:5px 11px;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity 0.15s}
        .btn-sm:disabled{opacity:0.5;cursor:not-allowed}
        .btn-paid{background:#f0faf4;color:#2d8653}
        .btn-paid:hover:not(:disabled){background:#d4f0e0}
        .btn-overdue{background:#fff8f0;color:#f77b24}
        .btn-overdue:hover:not(:disabled){background:#ffecd0}
        .btn-del{background:#fff0f0;color:#d45b64}
        .btn-del:hover:not(:disabled){background:#fde0e0}
        .empty{padding:60px 20px;text-align:center;color:#bbb;font-size:14px}
        .loading{padding:60px 20px;text-align:center;color:#bbb;font-size:14px}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
        .modal{background:#fff;border-radius:16px;padding:36px;width:100%;max-width:460px;box-shadow:0 20px 60px rgba(0,0,0,0.15)}
        .modal-title{font-family:'Sora',sans-serif;font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:24px}
        .field{margin-bottom:16px}
        .field label{display:block;font-size:11px;font-weight:600;color:#888;letter-spacing:0.4px;margin-bottom:6px;text-transform:uppercase}
        .field input,.field select{width:100%;padding:10px 14px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;color:#1a1a1a;outline:none;transition:border 0.2s;background:#fafafa}
        .field input:focus,.field select:focus{border-color:#b14b90;background:#fff}
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
                <h1 className='page-title'>Invoices</h1>
                <p className='page-sub'>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total</p>
              </div>
              {user?.role === 'ADMIN' && (
                <button className='btn-primary' onClick={openAdd}>+ New Invoice</button>
              )}
            </div>

            <div className='summary-row'>
              <div className='sum-card' style={{ '--accent': '#2d8653' }}>
                <div className='sum-label'>Total Collected</div>
                <div className='sum-value'>₹{totalPaid.toLocaleString('en-IN')}</div>
              </div>
              <div className='sum-card' style={{ '--accent': '#f77b24' }}>
                <div className='sum-label'>Pending Amount</div>
                <div className='sum-value'>₹{totalUnpaid.toLocaleString('en-IN')}</div>
              </div>
              <div className='sum-card' style={{ '--accent': '#b14b90' }}>
                <div className='sum-label'>Total Invoices</div>
                <div className='sum-value'>{invoices.length}</div>
              </div>
            </div>

            <div className='table-wrap'>
              {loading ? (
                <div className='loading'>Loading invoices...</div>
              ) : invoices.length === 0 ? (
                <div className='empty'>No invoices yet. Create your first invoice.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Issued</th>
                      {user?.role === 'ADMIN' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 500, color: '#1a1a1a' }}>
                          {inv.client?.name || '—'}
                          {inv.client?.company && (
                            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{inv.client.company}</div>
                          )}
                        </td>
                        <td style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#1a1a1a' }}>
                          ₹{inv.amount.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className='status-badge' style={statusStyle(inv.status)}>
                            {inv.status}
                          </span>
                        </td>
                        <td>{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                        <td>{new Date(inv.issuedAt).toLocaleDateString('en-IN')}</td>
                        {user?.role === 'ADMIN' && (
                          <td>
                            <div className='action-btns'>
                              {inv.status !== 'PAID' && (
                                <button
                                  className='btn-sm btn-paid'
                                  onClick={() => markPaid(inv.id)}
                                  disabled={actionLoading === inv.id + '-paid'}
                                >
                                  {actionLoading === inv.id + '-paid' ? '...' : 'Mark Paid'}
                                </button>
                              )}
                              {inv.status === 'UNPAID' && (
                                <button
                                  className='btn-sm btn-overdue'
                                  onClick={() => markOverdue(inv.id)}
                                  disabled={actionLoading === inv.id + '-overdue'}
                                >
                                  {actionLoading === inv.id + '-overdue' ? '...' : 'Overdue'}
                                </button>
                              )}
                              <button
                                className='btn-sm btn-del'
                                onClick={() => setDeleteId(inv.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
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
            <h2 className='modal-title'>New Invoice</h2>
            {error && <div className='modal-error'>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className='field'>
                <label>Client *</label>
                <select name='clientId' value={form.clientId} onChange={handleChange} required>
                  <option value=''>Select a client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.company ? `— ${c.company}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className='field'>
                <label>Amount (₹) *</label>
                <input
                  name='amount'
                  type='number'
                  value={form.amount}
                  onChange={handleChange}
                  placeholder='e.g. 15000'
                  required
                />
              </div>
              <div className='field'>
                <label>Due Date *</label>
                <input
                  name='dueDate'
                  type='date'
                  value={form.dueDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className='modal-actions'>
                <button type='button' className='btn-cancel' onClick={closeModal}>Cancel</button>
                <button type='submit' className='btn-save' disabled={saving}>
                  {saving ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className='confirm-overlay'>
          <div className='confirm-box'>
            <h3 className='confirm-title'>Delete Invoice?</h3>
            <p className='confirm-sub'>This invoice will be permanently deleted. This cannot be undone.</p>
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

export default Invoices