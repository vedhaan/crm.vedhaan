import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState, { LoadingState } from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import API from '../../api/axios'
import { fmtDate, getMsg, money } from '../../utils/format'

const STATUS_TONE = { PAID: 'green', OVERDUE: 'red', UNPAID: 'amber' }
const FILTERS = ['ALL', 'UNPAID', 'OVERDUE', 'PAID']
const EMPTY = { clientId: '', amount: '', dueDate: '' }

const isLate = (inv) => inv.status !== 'PAID' && (inv.status === 'OVERDUE' || new Date(inv.dueDate) < new Date())

const Invoices = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const [invRes, clientRes] = await Promise.all([API.get('/invoices'), API.get('/clients')])
      setInvoices(invRes.data)
      setClients(clientRes.data)
      setPageError('')
    } catch (err) {
      setPageError(getMsg(err, 'Failed to load invoices'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openAdd = () => {
    setForm(EMPTY)
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setError('')
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await API.post('/invoices', form)
      await fetchAll()
      closeModal()
    } catch (err) {
      setError(getMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const act = async (id, path, tag) => {
    setActionLoading(`${id}-${tag}`)
    try {
      await API.put(`/invoices/${id}/${path}`)
      await fetchAll()
    } catch (err) {
      setPageError(getMsg(err, 'Action failed'))
    } finally {
      setActionLoading(null)
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await API.delete(`/invoices/${deleteTarget.id}`)
      await fetchAll()
    } catch (err) {
      setPageError(getMsg(err, 'Delete failed'))
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const sum = (list) => list.reduce((s, i) => s + i.amount, 0)
  const paid = invoices.filter((i) => i.status === 'PAID')
  const unpaid = invoices.filter((i) => i.status !== 'PAID')
  const late = invoices.filter(isLate)

  const counts = {
    ALL: invoices.length,
    UNPAID: invoices.filter((i) => i.status === 'UNPAID').length,
    OVERDUE: late.length,
    PAID: paid.length
  }

  const q = search.trim().toLowerCase()
  const filtered = invoices.filter((i) => {
    if (filter === 'OVERDUE' && !isLate(i)) return false
    if (filter === 'UNPAID' && i.status !== 'UNPAID') return false
    if (filter === 'PAID' && i.status !== 'PAID') return false
    if (!q) return true
    return [i.client?.name, i.client?.company].some((v) => (v || '').toLowerCase().includes(q))
  })

  return (
    <AppShell>
      <PageHeader
        title='Invoices'
        subtitle={`${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} total`}
        actions={isAdmin && (
          <button type='button' className='v-btn primary' onClick={openAdd}>
            <Icon name='plus' size={16} />New invoice
          </button>
        )}
      />

      {pageError && <div className='v-alert err'>{pageError}</div>}

      <div className='v-grid-4'>
        <StatCard label='Collected' icon='check' tone='green' value={money(sum(paid))} hint={`${paid.length} paid`} loading={loading} />
        <StatCard label='Pending' icon='clock' tone='amber' value={money(sum(unpaid))} hint={`${unpaid.length} unpaid`} loading={loading} />
        <StatCard label='Overdue' icon='receipt' tone='red' value={money(sum(late))} hint={`${late.length} invoice${late.length !== 1 ? 's' : ''}`} loading={loading} />
        <StatCard label='Total invoices' icon='receipt' tone='brand' value={invoices.length} loading={loading} />
      </div>

      <div className='v-toolbar'>
        <div className='v-search'>
          <Icon name='search' size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search by client or company' />
        </div>
        <div className='v-chips'>
          {FILTERS.map((f) => (
            <button key={f} type='button' className={`v-chip${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              <span className='v-chip-n'>{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className='v-table-wrap'>
        {loading ? (
          <LoadingState text='Loading invoices...' />
        ) : filtered.length === 0 ? (
          <EmptyState icon='receipt' title='No invoices found' text='Try a different filter or create a new invoice.' />
        ) : (
          <div className='v-table-scroll'>
            <table className='v-table'>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Issued</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const lateNow = isLate(inv)
                  return (
                    <tr key={inv.id}>
                      <td className='v-cell-main'>
                        <div className='v-strong'>{inv.client?.name || '-'}</div>
                        {inv.client?.company && <div className='v-sub'>{inv.client.company}</div>}
                      </td>
                      <td data-label='Amount' className='v-num'>{money(inv.amount)}</td>
                      <td data-label='Status'>
                        <Badge tone={lateNow && inv.status === 'UNPAID' ? 'red' : STATUS_TONE[inv.status]}>
                          {lateNow && inv.status === 'UNPAID' ? 'LATE' : inv.status}
                        </Badge>
                      </td>
                      <td data-label='Due'>
                        <span className={lateNow ? 'v-late' : ''}>{fmtDate(inv.dueDate)}</span>
                      </td>
                      <td data-label='Issued'>{fmtDate(inv.issuedAt)}</td>
                      {isAdmin && (
                        <td className='v-cell-actions'>
                          <div className='v-row-actions'>
                            {inv.status !== 'PAID' && (
                              <button type='button' className='v-btn sm soft-green' disabled={actionLoading === `${inv.id}-paid`} onClick={() => act(inv.id, 'paid', 'paid')}>
                                {actionLoading === `${inv.id}-paid` ? '...' : 'Mark paid'}
                              </button>
                            )}
                            {inv.status === 'UNPAID' && (
                              <button type='button' className='v-btn sm soft-amber' disabled={actionLoading === `${inv.id}-overdue`} onClick={() => act(inv.id, 'overdue', 'overdue')}>
                                {actionLoading === `${inv.id}-overdue` ? '...' : 'Overdue'}
                              </button>
                            )}
                            <button type='button' className='v-btn sm soft-danger' onClick={() => setDeleteTarget(inv)}>
                              <Icon name='trash' size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal
          title='New invoice'
          onClose={closeModal}
          footer={
            <>
              <button type='button' className='v-btn' onClick={closeModal}>Cancel</button>
              <button type='submit' form='invoice-form' className='v-btn primary' disabled={saving}>
                {saving ? 'Creating...' : 'Create invoice'}
              </button>
            </>
          }
        >
          {error && <div className='v-alert err'>{error}</div>}
          <form id='invoice-form' onSubmit={handleSubmit}>
            <div className='v-field'>
              <label className='v-label'>Client *</label>
              <select className='v-select' name='clientId' value={form.clientId} onChange={handleChange} required>
                <option value=''>Select a client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` - ${c.company}` : ''}</option>
                ))}
              </select>
            </div>
            <div className='v-row2'>
              <div className='v-field'>
                <label className='v-label'>Amount (INR) *</label>
                <input className='v-input' name='amount' type='number' min='1' value={form.amount} onChange={handleChange} placeholder='15000' required />
              </div>
              <div className='v-field'>
                <label className='v-label'>Due date *</label>
                <input className='v-input' name='dueDate' type='date' value={form.dueDate} onChange={handleChange} required />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title='Delete invoice?'
          message='This invoice will be permanently deleted. This cannot be undone.'
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppShell>
  )
}

export default Invoices