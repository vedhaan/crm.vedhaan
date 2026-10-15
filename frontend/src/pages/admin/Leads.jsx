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
import { fmtDate, getMsg } from '../../utils/format'

const STAGES = {
  NEW: { label: 'New', tone: 'blue' },
  CONTACTED: { label: 'Contacted', tone: 'violet' },
  FOLLOW_UP: { label: 'Follow up', tone: 'amber' },
  CONVERTED: { label: 'Converted', tone: 'green' },
  LOST: { label: 'Lost', tone: 'grey' }
}
const STATUSES = Object.keys(STAGES)
const SOURCES = ['Phone Call', 'WhatsApp', 'Walk-in', 'Instagram', 'Reference', 'Website', 'Other']
const SERVICES = ['Website Development', 'Shopify Development', 'SEO', 'Digital Marketing', 'AI & Automation', 'Graphic Design', 'Other']
const EMPTY = { name: '', phone: '', source: '', service: '', notes: '', followUpAt: '', status: 'NEW' }

const followCell = (lead) => {
  if (!lead.followUpAt) return '-'
  const d = new Date(lead.followUpAt)
  const t = new Date()
  const open = lead.status !== 'CONVERTED' && lead.status !== 'LOST'
  if (d.toDateString() === t.toDateString()) return <Badge tone='amber'>Today</Badge>
  if (open && d < t) return <Badge tone='red'>Overdue {fmtDate(d)}</Badge>
  return fmtDate(d)
}

const Leads = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')

  const fetchLeads = useCallback(async () => {
    try {
      const res = await API.get('/leads')
      setLeads(res.data)
      setPageError('')
    } catch (err) {
      setPageError(getMsg(err, 'Failed to load leads'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const openAdd = () => {
    setEditLead(null)
    setForm(EMPTY)
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editLead) await API.put(`/leads/${editLead.id}`, form)
      else await API.post('/leads', form)
      await fetchLeads()
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
      await API.delete(`/leads/${deleteTarget.id}`)
      await fetchLeads()
    } catch (err) {
      setPageError(getMsg(err, 'Delete failed'))
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length
    return acc
  }, {})

  const q = search.trim().toLowerCase()
  const filtered = leads.filter((l) => {
    if (filter !== 'ALL' && l.status !== filter) return false
    if (!q) return true
    return [l.name, l.phone, l.service, l.source, l.notes].some((v) => (v || '').toLowerCase().includes(q))
  })

  return (
    <AppShell>
      <PageHeader
        title='Leads'
        subtitle={`${leads.length} lead${leads.length !== 1 ? 's' : ''} total`}
        actions={isAdmin && (
          <button type='button' className='v-btn primary' onClick={openAdd}>
            <Icon name='plus' size={16} />Add lead
          </button>
        )}
      />

      {pageError && <div className='v-alert err'>{pageError}</div>}

      <div className='v-grid-5'>
        {STATUSES.map((s) => (
          <StatCard
            key={s}
            label={STAGES[s].label}
            value={counts[s] || 0}
            loading={loading}
            active={filter === s}
            onClick={() => setFilter(filter === s ? 'ALL' : s)}
          />
        ))}
      </div>

      <div className='v-toolbar'>
        <div className='v-search'>
          <Icon name='search' size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search name, phone, service or notes' />
        </div>
        <div className='v-chips'>
          <button type='button' className={`v-chip${filter === 'ALL' ? ' on' : ''}`} onClick={() => setFilter('ALL')}>
            All<span className='v-chip-n'>{leads.length}</span>
          </button>
        </div>
        <div className='v-toolbar-right'>{filtered.length} shown</div>
      </div>

      <div className='v-table-wrap'>
        {loading ? (
          <LoadingState text='Loading leads...' />
        ) : filtered.length === 0 ? (
          <EmptyState icon='target' title='No leads found' text='Try a different filter or add a new lead.' />
        ) : (
          <div className='v-table-scroll'>
            <table className='v-table'>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Phone</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Follow up</th>
                  <th>Notes</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id}>
                    <td className='v-cell-main'>
                      <div className='v-strong'>{lead.name}</div>
                      <div className='v-sub'>{lead.source || '-'}</div>
                    </td>
                    <td data-label='Phone'>{lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : '-'}</td>
                    <td data-label='Service'>{lead.service || '-'}</td>
                    <td data-label='Status'><Badge tone={STAGES[lead.status].tone}>{STAGES[lead.status].label}</Badge></td>
                    <td data-label='Follow up'>{followCell(lead)}</td>
                    <td data-label='Notes'><span className='v-ellipsis' style={{ display: 'inline-block' }}>{lead.notes || '-'}</span></td>
                    {isAdmin && (
                      <td className='v-cell-actions'>
                        <div className='v-row-actions'>
                          <button type='button' className='v-btn sm' onClick={() => openEdit(lead)}>
                            <Icon name='edit' size={14} />Edit
                          </button>
                          <button type='button' className='v-btn sm soft-danger' onClick={() => setDeleteTarget(lead)}>
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
          title={editLead ? 'Update lead' : 'Add new lead'}
          size='lg'
          onClose={closeModal}
          footer={
            <>
              <button type='button' className='v-btn' onClick={closeModal}>Cancel</button>
              <button type='submit' form='lead-form' className='v-btn primary' disabled={saving}>
                {saving ? 'Saving...' : editLead ? 'Update lead' : 'Add lead'}
              </button>
            </>
          }
        >
          {error && <div className='v-alert err'>{error}</div>}
          <form id='lead-form' onSubmit={handleSubmit}>
            <div className='v-row2'>
              <div className='v-field'>
                <label className='v-label'>Full name *</label>
                <input className='v-input' name='name' value={form.name} onChange={handleChange} placeholder='e.g. Raj Patel' required />
              </div>
              <div className='v-field'>
                <label className='v-label'>Phone</label>
                <input className='v-input' name='phone' value={form.phone} onChange={handleChange} placeholder='9876543210' />
              </div>
            </div>
            <div className='v-row2'>
              <div className='v-field'>
                <label className='v-label'>Source</label>
                <select className='v-select' name='source' value={form.source} onChange={handleChange}>
                  <option value=''>Select source</option>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className='v-field'>
                <label className='v-label'>Service interested</label>
                <select className='v-select' name='service' value={form.service} onChange={handleChange}>
                  <option value=''>Select service</option>
                  {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className='v-row2'>
              <div className='v-field'>
                <label className='v-label'>Status</label>
                <select className='v-select' name='status' value={form.status} onChange={handleChange}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STAGES[s].label}</option>)}
                </select>
              </div>
              <div className='v-field'>
                <label className='v-label'>Follow up date</label>
                <input className='v-input' name='followUpAt' type='date' value={form.followUpAt} onChange={handleChange} />
              </div>
            </div>
            <div className='v-field'>
              <label className='v-label'>Notes</label>
              <textarea className='v-textarea' name='notes' value={form.notes} onChange={handleChange} placeholder='Any details about this lead...' />
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title='Delete lead?'
          message={`${deleteTarget.name} will be permanently deleted.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppShell>
  )
}

export default Leads