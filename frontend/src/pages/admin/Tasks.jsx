import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/Sidebar'
import PageWrapper from '../../components/PageWrapper'
import API from '../../api/axios'

const PRIORITY_COLORS = {
  LOW: { background: '#f0f4ff', color: '#3b5bdb', border: '1px solid #bac8ff' },
  MEDIUM: { background: '#fff8f0', color: '#f77b24', border: '1px solid #ffddb3' },
  HIGH: { background: '#fff0f0', color: '#d45b64', border: '1px solid #ffd0d0' }
}

const STATUS_COLORS = {
  TODO: { background: '#f7f7f7', color: '#888', border: '1px solid #e0e0e0' },
  IN_PROGRESS: { background: '#f8f0ff', color: '#7c3aed', border: '1px solid #d8b4fe' },
  DONE: { background: '#f0faf4', color: '#2d8653', border: '1px solid #b7e4c7' }
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']
const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE']

const formatBytes = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const getFileIcon = (mimeType) => {
  if (!mimeType) return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📕'
  if (mimeType.includes('word')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️'
  if (mimeType.startsWith('video/')) return '🎬'
  return '📄'
}

const Tasks = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [modalTab, setModalTab] = useState('details') // 'details' | 'files'
  const [form, setForm] = useState({
    title: '', description: '', assignedTo: '', priority: 'MEDIUM', deadline: '', status: 'TODO'
  })

  // File upload state
  const [taskFiles, setTaskFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  const fetchAll = async () => {
    try {
      const taskRes = await API.get('/tasks')
      setTasks(taskRes.data)
      if (user?.role === 'ADMIN') {
        const userRes = await API.get('/users')
        setUsers(userRes.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const fetchTaskFiles = async (taskId) => {
    setFilesLoading(true)
    try {
      const res = await API.get(`/tasks/${taskId}/files`)
      setTaskFiles(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setFilesLoading(false)
    }
  }

  const openAdd = () => {
    setEditTask(null)
    setForm({ title: '', description: '', assignedTo: '', priority: 'MEDIUM', deadline: '', status: 'TODO' })
    setError('')
    setModalTab('details')
    setTaskFiles([])
    setUploadError('')
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
    setTaskFiles([])
    setUploadError('')
    setShowModal(true)
    fetchTaskFiles(task.id)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditTask(null)
    setError('')
    setTaskFiles([])
    setUploadError('')
    setDragOver(false)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editTask) {
        await API.put(`/tasks/${editTask.id}`, form)
      } else {
        await API.post('/tasks', form)
      }
      await fetchAll()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (task, newStatus) => {
    try {
      await API.put(`/tasks/${task.id}`, { status: newStatus })
      await fetchAll()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await API.delete(`/tasks/${id}`)
      await fetchAll()
      setDeleteId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return
    if (!editTask) return

    setUploadError('')
    setUploadingFiles(true)

    const formData = new FormData()
    Array.from(files).forEach(file => formData.append('files', file))

    try {
      await API.post(`/tasks/${editTask.id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      await fetchTaskFiles(editTask.id)
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleFileInputChange = (e) => {
    handleFileUpload(e.target.files)
  }

  const handleFileDelete = async (fileId) => {
    setDeletingFileId(fileId)
    try {
      await API.delete(`/files/${fileId}`)
      setTaskFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingFileId(null)
    }
  }

  const filtered = filterStatus === 'ALL' ? tasks : tasks.filter(t => t.status === filterStatus)

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s).length
    return acc
  }, {})

  const isOverdue = (task) => {
    if (!task.deadline || task.status === 'DONE') return false
    return new Date(task.deadline) < new Date()
  }

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
        .sum-card{background:#fff;border-radius:10px;padding:16px 18px;border:1px solid #ececea}
        .sum-label{font-size:10px;color:#aaa;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px}
        .sum-value{font-family:'Sora',sans-serif;font-size:22px;font-weight:700;color:#1a1a1a}
        .filter-row{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
        .filter-btn{padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid #e0e0e0;background:#fff;color:#888;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s}
        .filter-btn.active{background:#0f0f1a;color:#fff;border-color:#0f0f1a}
        .table-wrap{background:#fff;border-radius:12px;border:1px solid #ececea;overflow:hidden}
        table{width:100%;border-collapse:collapse}
        th{padding:11px 20px;text-align:left;font-size:11px;font-weight:600;color:#aaa;letter-spacing:0.5px;text-transform:uppercase;background:#fafafa;border-bottom:1px solid #f0f0f0}
        td{padding:13px 20px;font-size:13px;color:#333;border-bottom:1px solid #f7f7f7;vertical-align:middle}
        tr:last-child td{border-bottom:none}
        tr:hover td{background:#fafafa}
        .task-title{font-weight:500;color:#1a1a1a;font-size:14px}
        .task-desc{font-size:11px;color:#aaa;margin-top:2px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .badge{display:inline-flex;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600}
        .deadline-ok{font-size:12px;color:#888}
        .deadline-overdue{font-size:12px;color:#d45b64;font-weight:600}
        .assignee-cell{display:flex;align-items:center;gap:8px}
        .assignee-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#b14b90,#ea5580);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
        .status-select{padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;border:1px solid #e0e0e0;background:#fafafa;font-family:'DM Sans',sans-serif;cursor:pointer;outline:none}
        .action-btns{display:flex;gap:6px}
        .btn-edit{padding:6px 14px;background:#f5f5f5;border:none;border-radius:6px;font-size:12px;font-weight:500;color:#555;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s}
        .btn-edit:hover{background:#ececec}
        .btn-del{padding:6px 14px;background:#fff0f0;border:none;border-radius:6px;font-size:12px;font-weight:500;color:#d45b64;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s}
        .btn-del:hover{background:#fde0e0}
        .empty{padding:60px 20px;text-align:center;color:#bbb;font-size:14px}
        .loading{padding:60px 20px;text-align:center;color:#bbb;font-size:14px}

        /* Modal */
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
        .modal{background:#fff;border-radius:16px;width:100%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,0.15);max-height:90vh;display:flex;flex-direction:column;overflow:hidden}
        .modal-header{padding:28px 32px 0}
        .modal-title{font-family:'Sora',sans-serif;font-size:18px;font-weight:700;color:#1a1a1a}

        /* Tabs */
        .modal-tabs{display:flex;gap:0;margin-top:20px;border-bottom:1px solid #f0f0f0}
        .modal-tab{padding:10px 20px;font-size:13px;font-weight:600;color:#aaa;cursor:pointer;border:none;background:none;font-family:'DM Sans',sans-serif;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s}
        .modal-tab.active{color:#b14b90;border-bottom-color:#b14b90}
        .modal-tab-badge{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#f0f0f0;color:#888;font-size:10px;font-weight:700;margin-left:6px}
        .modal-tab.active .modal-tab-badge{background:#f8e8f4;color:#b14b90}

        /* Modal body */
        .modal-body{padding:24px 32px;overflow-y:auto;flex:1}
        .field{margin-bottom:16px}
        .field label{display:block;font-size:11px;font-weight:600;color:#888;letter-spacing:0.4px;margin-bottom:6px;text-transform:uppercase}
        .field input,.field select,.field textarea{width:100%;padding:10px 14px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;color:#1a1a1a;outline:none;transition:border 0.2s;background:#fafafa}
        .field input:focus,.field select:focus,.field textarea:focus{border-color:#b14b90;background:#fff}
        .field textarea{resize:vertical;min-height:80px}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .modal-actions{padding:16px 32px 24px;display:flex;gap:10px;border-top:1px solid #f7f7f7}
        .btn-cancel{flex:1;padding:11px;background:#f5f5f5;border:none;border-radius:8px;font-size:14px;font-weight:500;color:#555;cursor:pointer;font-family:'DM Sans',sans-serif}
        .btn-save{flex:2;padding:11px;background:linear-gradient(135deg,#b14b90,#ea5580);border:none;border-radius:8px;font-size:14px;font-weight:600;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity 0.2s}
        .btn-save:hover{opacity:0.88}
        .btn-save:disabled{opacity:0.6;cursor:not-allowed}
        .modal-error{background:#fff0f0;border:1px solid #ffd0d0;color:#c0392b;font-size:13px;padding:10px 14px;border-radius:8px;margin-bottom:16px}

        /* File upload */
        .drop-zone{border:2px dashed #e0e0e0;border-radius:12px;padding:32px 20px;text-align:center;cursor:pointer;transition:all 0.2s;background:#fafafa;margin-bottom:16px}
        .drop-zone:hover{border-color:#b14b90;background:#fdf5fb}
        .drop-zone.drag-active{border-color:#b14b90;background:#fdf5fb;transform:scale(1.01)}
        .drop-icon{font-size:28px;margin-bottom:8px}
        .drop-text{font-size:13px;color:#888;line-height:1.5}
        .drop-text strong{color:#b14b90;cursor:pointer}
        .drop-hint{font-size:11px;color:#bbb;margin-top:4px}
        .uploading-bar{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#fdf5fb;border-radius:8px;margin-bottom:16px;font-size:13px;color:#b14b90;font-weight:500}
        .spinner{width:16px;height:16px;border:2px solid #f0d0e8;border-top-color:#b14b90;border-radius:50%;animation:spin 0.7s linear infinite;flex-shrink:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        .upload-error{background:#fff0f0;border:1px solid #ffd0d0;color:#c0392b;font-size:13px;padding:10px 14px;border-radius:8px;margin-bottom:12px}
        .files-loading{padding:32px;text-align:center;color:#bbb;font-size:13px}
        .file-list{display:flex;flex-direction:column;gap:8px}
        .file-item{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#fafafa;border:1px solid #f0f0f0;border-radius:8px;transition:background 0.15s}
        .file-item:hover{background:#f5f5f5}
        .file-icon{font-size:20px;flex-shrink:0}
        .file-info{flex:1;min-width:0}
        .file-name{font-size:13px;font-weight:500;color:#1a1a1a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .file-meta{font-size:11px;color:#aaa;margin-top:2px}
        .file-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
        .btn-download{padding:5px 12px;background:#f0f4ff;border:none;border-radius:6px;font-size:11px;font-weight:600;color:#3b5bdb;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;display:inline-flex;align-items:center}
        .btn-file-del{padding:5px 10px;background:#fff0f0;border:none;border-radius:6px;font-size:11px;font-weight:600;color:#d45b64;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s}
        .btn-file-del:hover{background:#fde0e0}
        .btn-file-del:disabled{opacity:0.5;cursor:not-allowed}
        .no-files{padding:32px;text-align:center;color:#bbb;font-size:13px}
        .files-new-task-note{padding:40px 20px;text-align:center;color:#bbb;font-size:13px;line-height:1.6}

        /* Confirm */
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
                <h1 className='page-title'>Tasks</h1>
                <p className='page-sub'>{tasks.length} task{tasks.length !== 1 ? 's' : ''} total</p>
              </div>
              {user?.role === 'ADMIN' && (
                <button className='btn-primary' onClick={openAdd}>+ New Task</button>
              )}
            </div>

            <div className='summary-row'>
              <div className='sum-card' style={{ borderLeft: '4px solid #888' }}>
                <div className='sum-label'>To Do</div>
                <div className='sum-value'>{counts.TODO || 0}</div>
              </div>
              <div className='sum-card' style={{ borderLeft: '4px solid #7c3aed' }}>
                <div className='sum-label'>In Progress</div>
                <div className='sum-value'>{counts.IN_PROGRESS || 0}</div>
              </div>
              <div className='sum-card' style={{ borderLeft: '4px solid #2d8653' }}>
                <div className='sum-label'>Done</div>
                <div className='sum-value'>{counts.DONE || 0}</div>
              </div>
            </div>

            <div className='filter-row'>
              <button className={`filter-btn ${filterStatus === 'ALL' ? 'active' : ''}`} onClick={() => setFilterStatus('ALL')}>
                All ({tasks.length})
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
                <div className='loading'>Loading tasks...</div>
              ) : filtered.length === 0 ? (
                <div className='empty'>No tasks found.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Assigned To</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Deadline</th>
                      {user?.role === 'ADMIN' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((task) => (
                      <tr key={task.id}>
                        <td>
                          <div className='task-title'>{task.title}</div>
                          {task.description && (
                            <div className='task-desc'>{task.description}</div>
                          )}
                        </td>
                        <td>
                          <div className='assignee-cell'>
                            <div className='assignee-avatar'>
                              {task.user?.name?.charAt(0).toUpperCase()}
                            </div>
                            {task.user?.name || '—'}
                          </div>
                        </td>
                        <td>
                          <span className='badge' style={PRIORITY_COLORS[task.priority]}>
                            {task.priority}
                          </span>
                        </td>
                        <td>
                          <select
                            className='status-select'
                            value={task.status}
                            onChange={(e) => handleStatusChange(task, e.target.value)}
                            style={STATUS_COLORS[task.status]}
                          >
                            {STATUSES.map(s => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {task.deadline ? (
                            <span className={isOverdue(task) ? 'deadline-overdue' : 'deadline-ok'}>
                              {isOverdue(task) ? 'Overdue · ' : ''}
                              {new Date(task.deadline).toLocaleDateString('en-IN')}
                            </span>
                          ) : '—'}
                        </td>
                        {user?.role === 'ADMIN' && (
                          <td>
                            <div className='action-btns'>
                              <button className='btn-edit' onClick={() => openEdit(task)}>Edit</button>
                              <button className='btn-del' onClick={() => setDeleteId(task.id)}>Delete</button>
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
            <div className='modal-header'>
              <h2 className='modal-title'>{editTask ? 'Edit Task' : 'New Task'}</h2>
              <div className='modal-tabs'>
                <button
                  className={`modal-tab ${modalTab === 'details' ? 'active' : ''}`}
                  onClick={() => setModalTab('details')}
                >
                  Details
                </button>
                <button
                  className={`modal-tab ${modalTab === 'files' ? 'active' : ''}`}
                  onClick={() => setModalTab('files')}
                >
                  Files
                  <span className='modal-tab-badge'>{taskFiles.length}</span>
                </button>
              </div>
            </div>

            {/* Details Tab */}
            {modalTab === 'details' && (
              <>
                <div className='modal-body'>
                  {error && <div className='modal-error'>{error}</div>}
                  <form id='task-form' onSubmit={handleSubmit}>
                    <div className='field'>
                      <label>Task Title *</label>
                      <input name='title' value={form.title} onChange={handleChange} placeholder='e.g. Design homepage for client' required />
                    </div>
                    <div className='field'>
                      <label>Description</label>
                      <textarea name='description' value={form.description} onChange={handleChange} placeholder='Any details about this task...' />
                    </div>
                    {user?.role === 'ADMIN' && (
                      <div className='field'>
                        <label>Assign To *</label>
                        <select name='assignedTo' value={form.assignedTo} onChange={handleChange} required>
                          <option value=''>Select team member</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} — {u.role}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className='field-row'>
                      <div className='field'>
                        <label>Priority</label>
                        <select name='priority' value={form.priority} onChange={handleChange}>
                          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className='field'>
                        <label>Deadline</label>
                        <input name='deadline' type='date' value={form.deadline} onChange={handleChange} />
                      </div>
                    </div>
                    {editTask && (
                      <div className='field'>
                        <label>Status</label>
                        <select name='status' value={form.status} onChange={handleChange}>
                          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                      </div>
                    )}
                  </form>
                </div>
                <div className='modal-actions'>
                  <button type='button' className='btn-cancel' onClick={closeModal}>Cancel</button>
                  <button type='submit' form='task-form' className='btn-save' disabled={saving}>
                    {saving ? 'Saving...' : editTask ? 'Update Task' : 'Create Task'}
                  </button>
                </div>
              </>
            )}

            {/* Files Tab */}
            {modalTab === 'files' && (
              <>
                <div className='modal-body'>
                  {!editTask ? (
                    <div className='files-new-task-note'>
                      Save the task first before attaching files.
                    </div>
                  ) : (
                    <>
                      {uploadError && <div className='upload-error'>{uploadError}</div>}

                      {uploadingFiles && (
                        <div className='uploading-bar'>
                          <div className='spinner'></div>
                          Uploading files...
                        </div>
                      )}

                      <div
                        className={`drop-zone ${dragOver ? 'drag-active' : ''}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className='drop-icon'>📎</div>
                        <div className='drop-text'>
                          Drop files here or <strong>click to browse</strong>
                        </div>
                        <div className='drop-hint'>Max 50MB per file · Any file type</div>
                        <input
                          ref={fileInputRef}
                          type='file'
                          multiple
                          style={{ display: 'none' }}
                          onChange={handleFileInputChange}
                        />
                      </div>

                      {filesLoading ? (
                        <div className='files-loading'>Loading files...</div>
                      ) : taskFiles.length === 0 ? (
                        <div className='no-files'>No files attached yet.</div>
                      ) : (
                        <div className='file-list'>
                          {taskFiles.map(file => (
                            <div key={file.id} className='file-item'>
                              <span className='file-icon'>{getFileIcon(file.mimeType)}</span>
                              <div className='file-info'>
                                <div className='file-name'>{file.fileName}</div>
                                <div className='file-meta'>
                                  {formatBytes(file.fileSize)} · {file.uploader?.name} · {new Date(file.uploadedAt).toLocaleDateString('en-IN')}
                                </div>
                              </div>
                              <div className='file-actions'>
                                <a
                                  href={file.downloadUrl}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='btn-download'
                                >
                                  ↓ Download
                                </a>
                                {(user?.role === 'ADMIN' || file.uploadedBy === user?.id) && (
                                  <button
                                    className='btn-file-del'
                                    onClick={() => handleFileDelete(file.id)}
                                    disabled={deletingFileId === file.id}
                                  >
                                    {deletingFileId === file.id ? '...' : 'Delete'}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className='modal-actions'>
                  <button type='button' className='btn-cancel' onClick={closeModal}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {deleteId && (
        <div className='confirm-overlay'>
          <div className='confirm-box'>
            <h3 className='confirm-title'>Delete Task?</h3>
            <p className='confirm-sub'>This task will be permanently deleted.</p>
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

export default Tasks