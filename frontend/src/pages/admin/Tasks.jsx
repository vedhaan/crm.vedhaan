import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState, { LoadingState } from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import TaskFiles from '../../components/TaskFiles'
import API from '../../api/axios'
import { fmtDate, getMsg } from '../../utils/format'

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']
const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE']
const PRIORITY_TONE = { LOW: 'blue', MEDIUM: 'amber', HIGH: 'red' }
const STATUS_LABEL = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' }
const EMPTY = { title: '', description: '', assignedTo: '', priority: 'MEDIUM', deadline: '', status: 'TODO' }

const isOverdue = (t) => !!t.deadline && t.status !== 'DONE' && new Date(t.deadline) < new Date()

const Tasks = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [modalTab, setModalTab] = useState('details')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')

  const fetchAll = useCallback(async () => {
    try {
      const taskRes = await API.get('/tasks')
      setTasks(taskRes.data)
      setPageError('')
      if (isAdmin) {
        const userRes = await API.get('/users')
        setUsers(userRes.data)
      }
    } catch (err) {
      setPageError(getMsg(err, 'Failed to load tasks'))
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openAdd = () => {
    setEditTask(null)
    setForm(EMPTY)
    setError('')
    setModalTab('details')
    setShowModal(true)
  }

  const openEdit = (task) => {
    setEditTask(task)
    setForm({
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo,
      priority: task.priority,
      deadline: task.deadline ? task.deadline.split('T')[0] : '',
      status: task.status
    })
    setError('')
    setModalTab('details')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditTask(null)
    setError('')
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editTask) await API.put(`/tasks/${editTask.id}`, form)
      else await API.post('/tasks', form)
      await fetchAll()
      closeModal()
    } catch (err) {
      setError(getMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (task, status) => {
    try {
      await API.put(`/tasks/${task.id}`, { status })
      await fetchAll()
    } catch (err) {
      setPageError(getMsg(err, 'Could not update status'))
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await API.delete(`/tasks/${deleteTarget.id}`)
      await fetchAll()
    } catch (err) {
      setPageError(getMsg(err, 'Delete failed'))
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s).length
    return acc
  }, {})
  const overdueCount = tasks.filter(isOverdue).length

  const q = search.trim().toLowerCase()
  const filtered = tasks.filter((t) => {
    if (filter !== 'ALL' && t.status !== filter) return false
    if (!q) return true
    return [t.title, t.description, t.user?.name].some((v) => (v || '').toLowerCase().includes(q))
  })

  return (
    <AppShell>
      <PageHeader
        title='Tasks'
        subtitle={`${tasks.length} task${tasks.length !== 1 ? 's' : ''} total`}
        actions={isAdmin && (
          <button type='button' className='v-btn primary' onClick={openAdd}>
            <Icon name='plus' size={16} />New task
          </button>
        )}
      />

      {pageError && <div className='v-alert err'>{pageError}</div>}

      <div className='v-grid-4'>
        <StatCard label='To do' icon='clock' tone='grey' value={counts.TODO || 0} loading={loading} />
        <StatCard label='In progress' icon='tasks' tone='violet' value={counts.IN_PROGRESS || 0} loading={loading} />
        <StatCard label='Done' icon='check' tone='green' value={counts.DONE || 0} loading={loading} />
        <StatCard label='Overdue' icon='clock' tone='red' value={overdueCount} loading={loading} />
      </div>

      <div className='v-toolbar'>
        <div className='v-search'>
          <Icon name='search' size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search task or assignee' />
        </div>
        <div className='v-chips'>
          {['ALL', ...STATUSES].map((s) => (
            <button key={s} type='button' className={`v-chip${filter === s ? ' on' : ''}`} onClick={() => setFilter(s)}>
              {s === 'ALL' ? 'All' : STATUS_LABEL[s]}
              <span className='v-chip-n'>{s === 'ALL' ? tasks.length : counts[s] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className='v-table-wrap'>
        {loading ? (
          <LoadingState text='Loading tasks...' />
        ) : filtered.length === 0 ? (
          <EmptyState icon='tasks' title='No tasks found' text='Try a different filter or create a task.' />
        ) : (
          <div className='v-table-scroll'>
            <table className='v-table'>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assigned to</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => (
                  <tr key={task.id}>
                    <td className='v-cell-main'>
                      <div className='v-strong'>{task.title}</div>
                      {task.description && <div className='v-sub v-ellipsis'>{task.description}</div>}
                    </td>
                    <td data-label='Assigned'>
                      <div className='v-cell-user'>
                        <Avatar name={task.user?.name} size={26} />
                        {task.user?.name || '-'}
                      </div>
                    </td>
                    <td data-label='Priority'><Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge></td>
                    <td data-label='Status'>
                      <select
                        className={`v-select sm st-${task.status.toLowerCase()}`}
                        value={task.status}
                        onChange={(e) => changeStatus(task, e.target.value)}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td data-label='Deadline'>
                      {task.deadline ? (
                        <span className={isOverdue(task) ? 'v-late' : ''}>
                          {isOverdue(task) ? 'Overdue ' : ''}{fmtDate(task.deadline)}
                        </span>
                      ) : '-'}
                    </td>
                    {isAdmin && (
                      <td className='v-cell-actions'>
                        <div className='v-row-actions'>
                          <button type='button' className='v-btn sm' onClick={() => openEdit(task)}>
                            <Icon name='edit' size={14} />Edit
                          </button>
                          <button type='button' className='v-btn sm soft-danger' onClick={() => setDeleteTarget(task)}>
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
          title={editTask ? 'Edit task' : 'New task'}
          onClose={closeModal}
          tabs={
            <div className='v-tabs'>
              <button type='button' className={`v-tab${modalTab === 'details' ? ' on' : ''}`} onClick={() => setModalTab('details')}>Details</button>
              <button type='button' className={`v-tab${modalTab === 'files' ? ' on' : ''}`} onClick={() => setModalTab('files')}>Files</button>
            </div>
          }
          footer={
            modalTab === 'details' ? (
              <>
                <button type='button' className='v-btn' onClick={closeModal}>Cancel</button>
                <button type='submit' form='task-form' className='v-btn primary' disabled={saving}>
                  {saving ? 'Saving...' : editTask ? 'Update task' : 'Create task'}
                </button>
              </>
            ) : (
              <button type='button' className='v-btn' onClick={closeModal}>Close</button>
            )
          }
        >
          {modalTab === 'details' && (
            <>
              {error && <div className='v-alert err'>{error}</div>}
              <form id='task-form' onSubmit={handleSubmit} style={{ paddingTop: 12 }}>
                <div className='v-field'>
                  <label className='v-label'>Task title *</label>
                  <input className='v-input' name='title' value={form.title} onChange={handleChange} placeholder='e.g. Design homepage for client' required />
                </div>
                <div className='v-field'>
                  <label className='v-label'>Description</label>
                  <textarea className='v-textarea' name='description' value={form.description} onChange={handleChange} placeholder='Any details about this task...' />
                </div>
                {isAdmin && (
                  <div className='v-field'>
                    <label className='v-label'>Assign to *</label>
                    <select className='v-select' name='assignedTo' value={form.assignedTo} onChange={handleChange} required>
                      <option value=''>Select team member</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
                )}
                <div className='v-row2'>
                  <div className='v-field'>
                    <label className='v-label'>Priority</label>
                    <select className='v-select' name='priority' value={form.priority} onChange={handleChange}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className='v-field'>
                    <label className='v-label'>Deadline</label>
                    <input className='v-input' name='deadline' type='date' value={form.deadline} onChange={handleChange} />
                  </div>
                </div>
                {editTask && (
                  <div className='v-field'>
                    <label className='v-label'>Status</label>
                    <select className='v-select' name='status' value={form.status} onChange={handleChange}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </div>
                )}
              </form>
            </>
          )}

          {modalTab === 'files' && (
            <div style={{ paddingTop: 14 }}>
              {editTask ? (
                <TaskFiles taskId={editTask.id} user={user} />
              ) : (
                <div className='v-empty'><div className='v-empty-s'>Save the task first, then attach files.</div></div>
              )}
            </div>
          )}
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title='Delete task?'
          message={`"${deleteTarget.title}" will be permanently deleted.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppShell>
  )
}

export default Tasks