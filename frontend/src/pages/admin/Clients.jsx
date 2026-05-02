import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/Sidebar'
import API from '../../api/axios'
import PageWrapper from '../../components/PageWrapper'

const Clients = () => {
    const { user } = useAuth()
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editClient, setEditClient] = useState(null)
    const [deleteId, setDeleteId] = useState(null)
    const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const fetchClients = async () => {
        try {
            const res = await API.get('/clients')
            setClients(res.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchClients() }, [])

    const openAdd = () => {
        setEditClient(null)
        setForm({ name: '', email: '', phone: '', company: '' })
        setError('')
        setShowModal(true)
    }

    const openEdit = (client) => {
        setEditClient(client)
        setForm({ name: client.name, email: client.email || '', phone: client.phone || '', company: client.company || '' })
        setError('')
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditClient(null)
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
            if (editClient) {
                await API.put(`/clients/${editClient.id}`, form)
            } else {
                await API.post('/clients', form)
            }
            await fetchClients()
            closeModal()
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        try {
            await API.delete(`/clients/${id}`)
            await fetchClients()
            setDeleteId(null)
        } catch (err) {
            console.error(err)
        }
    }

    const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f7f6f4;font-family:'DM Sans',sans-serif}
        .layout{display:flex;min-height:100vh;background:#f7f6f4}
        .main{flex:1;padding:36px 40px;overflow-y:auto}
        .page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}
        .page-title{font-family:'Sora',sans-serif;font-size:24px;font-weight:700;color:#1a1a1a}
        .page-sub{font-size:14px;color:#888;margin-top:4px}
        .btn-primary{padding:10px 20px;background:linear-gradient(135deg,#b14b90,#ea5580);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:opacity 0.2s}
        .btn-primary:hover{opacity:0.88}
        .table-wrap{background:#fff;border-radius:12px;border:1px solid #ececea;overflow:hidden}
        .table-top{padding:16px 20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
        .table-count{font-size:13px;color:#888}
        table{width:100%;border-collapse:collapse}
        th{padding:11px 20px;text-align:left;font-size:11px;font-weight:600;color:#aaa;letter-spacing:0.5px;text-transform:uppercase;background:#fafafa;border-bottom:1px solid #f0f0f0}
        td{padding:14px 20px;font-size:13px;color:#333;border-bottom:1px solid #f7f7f7;vertical-align:middle}
        tr:last-child td{border-bottom:none}
        tr:hover td{background:#fafafa}
        .client-cell{display:flex;align-items:center;gap:12px}
        .avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#b14b90,#ea5580);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
        .client-name{font-weight:500;color:#1a1a1a;font-size:14px}
        .client-company{font-size:12px;color:#aaa;margin-top:1px}
        .badge{display:inline-flex;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600}
        .action-btns{display:flex;gap:8px}
        .btn-edit{padding:6px 14px;background:#f5f5f5;border:none;border-radius:6px;font-size:12px;font-weight:500;color:#555;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s}
        .btn-edit:hover{background:#ececec}
        .btn-del{padding:6px 14px;background:#fff0f0;border:none;border-radius:6px;font-size:12px;font-weight:500;color:#d45b64;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s}
        .btn-del:hover{background:#fde0e0}
        .empty{padding:60px 20px;text-align:center;color:#bbb;font-size:14px}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
        .modal{background:#fff;border-radius:16px;padding:36px;width:100%;max-width:460px;box-shadow:0 20px 60px rgba(0,0,0,0.15)}
        .modal-title{font-family:'Sora',sans-serif;font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:24px}
        .field{margin-bottom:16px}
        .field label{display:block;font-size:11px;font-weight:600;color:#888;letter-spacing:0.4px;margin-bottom:6px;text-transform:uppercase}
        .field input{width:100%;padding:10px 14px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;color:#1a1a1a;outline:none;transition:border 0.2s;background:#fafafa}
        .field input:focus{border-color:#b14b90;background:#fff}
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
        .loading{padding:60px 20px;text-align:center;color:#bbb;font-size:14px}
      `}</style>

            <div className='layout'>
                <Sidebar />
                <main className='main'>
                    <PageWrapper>
                        <div className='page-header'>
                            <div>
                                <h1 className='page-title'>Clients</h1>
                                <p className='page-sub'>{clients.length} client{clients.length !== 1 ? 's' : ''} registered</p>
                            </div>
                            {user?.role === 'ADMIN' && (
                                <button className='btn-primary' onClick={openAdd}>+ Add Client</button>
                            )}
                        </div>

                        <div className='table-wrap'>
                            {loading ? (
                                <div className='loading'>Loading clients...</div>
                            ) : clients.length === 0 ? (
                                <div className='empty'>No clients yet. Add your first client.</div>
                            ) : (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Client</th>
                                            <th>Phone</th>
                                            <th>Email</th>
                                            <th>Added</th>
                                            {user?.role === 'ADMIN' && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clients.map((c) => (
                                            <tr key={c.id}>
                                                <td>
                                                    <div className='client-cell'>
                                                        <div className='avatar'>{initials(c.name)}</div>
                                                        <div>
                                                            <div className='client-name'>{c.name}</div>
                                                            <div className='client-company'>{c.company || '—'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{c.phone || '—'}</td>
                                                <td>{c.email || '—'}</td>
                                                <td>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                                                {user?.role === 'ADMIN' && (
                                                    <td>
                                                        <div className='action-btns'>
                                                            <button className='btn-edit' onClick={() => openEdit(c)}>Edit</button>
                                                            <button className='btn-del' onClick={() => setDeleteId(c.id)}>Delete</button>
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
                        <h2 className='modal-title'>{editClient ? 'Edit Client' : 'Add New Client'}</h2>
                        {error && <div className='modal-error'>{error}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className='field'>
                                <label>Full Name *</label>
                                <input name='name' value={form.name} onChange={handleChange} placeholder='e.g. Raj Patel' required />
                            </div>
                            <div className='field'>
                                <label>Company</label>
                                <input name='company' value={form.company} onChange={handleChange} placeholder='e.g. Patel Enterprises' />
                            </div>
                            <div className='field'>
                                <label>Phone</label>
                                <input name='phone' value={form.phone} onChange={handleChange} placeholder='e.g. 9876543210' />
                            </div>
                            <div className='field'>
                                <label>Email</label>
                                <input name='email' type='email' value={form.email} onChange={handleChange} placeholder='e.g. raj@patel.com' />
                            </div>
                            <div className='modal-actions'>
                                <button type='button' className='btn-cancel' onClick={closeModal}>Cancel</button>
                                <button type='submit' className='btn-save' disabled={saving}>
                                    {saving ? 'Saving...' : editClient ? 'Update Client' : 'Add Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className='confirm-overlay'>
                    <div className='confirm-box'>
                        <h3 className='confirm-title'>Delete Client?</h3>
                        <p className='confirm-sub'>This will permanently delete the client and all associated data. This cannot be undone.</p>
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

export default Clients