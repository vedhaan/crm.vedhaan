import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState, { LoadingState } from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'
import Icon from '../../components/ui/Icon'
import API from '../../api/axios'
import { fmtDate, getMsg } from '../../utils/format'

const EMPTY = { name: '', email: '', phone: '', company: '' }

const Clients = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')

  const fetchClients = useCallback(async () => {
    try {
      const res = await API.get('/clients')
      setClients(res.data)
      setPageError('')
    } catch (err) {
      setPageError(getMsg(err, 'Failed to load clients'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  const openAdd = () => {
    setEditClient(null)
    setForm(EMPTY)
    setError('')
    setShowModal(true)
  }

  const openEdit = (c) => {
    setEditClient(c)
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', company: c.company || '' })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditClient(null)
    setError('')
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editClient) await API.put(`/clients/${editClient.id}`, form)
      else await API.post('/clients', form)
      await fetchClients()
      closeModal()
    } catch (err) {
      setError(getMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await API.delete(`/clients/${deleteTarget.id}`)
      await fetchClients()
    } catch (err) {
      setPageError(getMsg(err, 'Could not delete this client. It may have invoices or leads attached.'))
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? clients.filter((c) => [c.name, c.company, c.phone, c.email].some((v) => (v || '').toLowerCase().includes(q)))
    : clients

  return (
    <AppShell>
      <PageHeader
        title='Clients'
        subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''} registered`}
        actions={isAdmin && (
          <button type='button' className='v-btn primary' onClick={openAdd}>
            <Icon name='plus' size={16} />Add client
          </button>
        )}
      />

      {pageError && <div className='v-alert err'>{pageError}</div>}

      <div className='v-toolbar'>
        <div className='v-search'>
          <Icon name='search' size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search name, company, phone or email' />
        </div>
        <div className='v-toolbar-right'>{filtered.length} shown</div>
      </div>

      <div className='v-table-wrap'>
        {loading ? (
          <LoadingState text='Loading clients...' />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon='users'
            title={q ? 'No matching clients' : 'No clients yet'}
            text={q ? 'Try a different search.' : 'Add your first client to get started.'}
            action={!q && isAdmin && <button type='button' className='v-btn primary' onClick={openAdd}>Add client</button>}
          />
        ) : (
          <div className='v-table-scroll'>
            <table className='v-table'>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Added</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className='v-cell-main'>
                      <div className='v-cell-user'>
                        <Avatar name={c.name} />
                        <div>
                          <div className='v-strong'>{c.name}</div>
                          <div className='v-sub'>{c.company || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label='Phone'>{c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : '-'}</td>
                    <td data-label='Email'>{c.email || '-'}</td>
                    <td data-label='Added'>{fmtDate(c.createdAt)}</td>
                    {isAdmin && (
                      <td className='v-cell-actions'>
                        <div className='v-row-actions'>
                          <button type='button' className='v-btn sm' onClick={() => openEdit(c)}>
                            <Icon name='edit' size={14} />Edit
                          </button>
                          <button type='button' className='v-btn sm soft-danger' onClick={() => setDeleteTarget(c)}>
                            <Icon name='trash' size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal
          title={editClient ? 'Edit client' : 'Add new client'}
          onClose={closeModal}
          footer={
            <>
              <button type='button' className='v-btn' onClick={closeModal}>Cancel</button>
              <button type='submit' form='client-form' className='v-btn primary' disabled={saving}>
                {saving ? 'Saving...' : editClient ? 'Update client' : 'Add client'}
              </button>
            </>
          }
        >
          {error && <div className='v-alert err'>{error}</div>}
          <form id='client-form' onSubmit={handleSubmit}>
            <div className='v-field'>
              <label className='v-label'>Full name *</label>
              <input className='v-input' name='name' value={form.name} onChange={handleChange} placeholder='e.g. Raj Patel' required />
            </div>
            <div className='v-field'>
              <label className='v-label'>Company</label>
              <input className='v-input' name='company' value={form.company} onChange={handleChange} placeholder='e.g. Patel Enterprises' />
            </div>
            <div className='v-row2'>
              <div className='v-field'>
                <label className='v-label'>Phone</label>
                <input className='v-input' name='phone' value={form.phone} onChange={handleChange} placeholder='9876543210' />
              </div>
              <div className='v-field'>
                <label className='v-label'>Email</label>
                <input className='v-input' name='email' type='email' value={form.email} onChange={handleChange} placeholder='raj@patel.com' />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title='Delete client?'
          message={`${deleteTarget.name} will be permanently deleted along with associated data. This cannot be undone.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppShell>
  )
}

export default Clients