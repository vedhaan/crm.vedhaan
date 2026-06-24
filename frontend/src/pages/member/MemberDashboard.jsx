import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import API from '../../api/axios'

const P = {
  LOW:    { bg:'#EFF6FF', color:'#2563EB', border:'#BFDBFE', stripe:'#2563EB', icon:'fa-arrow-down',    label:'Low'    },
  MEDIUM: { bg:'#FFF7ED', color:'#D97706', border:'#FDE68A', stripe:'#D97706', icon:'fa-minus',         label:'Medium' },
  HIGH:   { bg:'#FFF1F2', color:'#E11D48', border:'#FECDD3', stripe:'#E11D48', icon:'fa-arrow-up',      label:'High'   },
}
const S = {
  TODO:        { bg:'#F1F5F9', color:'#475569', border:'#CBD5E1', icon:'fa-circle',             label:'To Do'       },
  IN_PROGRESS: { bg:'#FAF5FF', color:'#7C3AED', border:'#DDD6FE', icon:'fa-circle-half-stroke', label:'In Progress' },
  DONE:        { bg:'#F0FDF4', color:'#16A34A', border:'#BBF7D0', icon:'fa-circle-check',       label:'Done'        },
}
const STATUSES = ['TODO','IN_PROGRESS','DONE']

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

// Per-task file panel component
function TaskFilePanel({ taskId, userId }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchFiles()
  }, [taskId])

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await API.get(`/tasks/${taskId}/files`)
      setFiles(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    setError('')
    setUploading(true)
    const formData = new FormData()
    Array.from(fileList).forEach(f => formData.append('files', f))
    try {
      await API.post(`/tasks/${taskId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      await fetchFiles()
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (fileId) => {
    setDeletingId(fileId)
    try {
      await API.delete(`/files/${fileId}`)
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (e) { console.error(e) }
    finally { setDeletingId(null) }
  }

  return (
    <div className='file-panel'>
      {error && <div className='file-panel-error'>{error}</div>}

      {uploading && (
        <div className='file-uploading'>
          <div className='mini-spinner'/>
          Uploading...
        </div>
      )}

      <div
        className={`file-drop ${dragOver ? 'drag-active' : ''}`}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <i className='fa-solid fa-cloud-arrow-up' style={{fontSize:'16px',color:'#b14b90',marginBottom:'4px'}}/>
        <span>Drop files or <strong>browse</strong></span>
        <input ref={fileInputRef} type='file' multiple style={{display:'none'}} onChange={e => handleUpload(e.target.files)} />
      </div>

      {loading ? (
        <div className='file-panel-loading'>Loading files...</div>
      ) : files.length === 0 ? (
        <div className='file-panel-empty'>No files attached yet.</div>
      ) : (
        <div className='file-list'>
          {files.map(file => (
            <div key={file.id} className='file-row'>
              <span className='file-row-icon'>{getFileIcon(file.mimeType)}</span>
              <div className='file-row-info'>
                <div className='file-row-name'>{file.fileName}</div>
                <div className='file-row-meta'>{formatBytes(file.fileSize)}</div>
              </div>
              <div className='file-row-actions'>
                <a href={file.downloadUrl} target='_blank' rel='noopener noreferrer' className='file-dl-btn'>
                  <i className='fa-solid fa-download' style={{fontSize:'9px'}}/>
                </a>
                {(file.uploadedBy === userId) && (
                  <button
                    className='file-del-btn'
                    onClick={() => handleDelete(file.id)}
                    disabled={deletingId === file.id}
                  >
                    <i className='fa-solid fa-trash' style={{fontSize:'9px'}}/>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MemberDashboard() {
  const { user, logout } = useAuth()
  const [tasks, setTasks]               = useState([])
  const [notifications, setNotifs]      = useState([])
  const [profile, setProfile]           = useState(null)
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState('ALL')
  const [updating, setUpdating]         = useState(null)
  const [activeTab, setActiveTab]       = useState('dashboard')
  const [profileForm, setProfileForm]   = useState({ name:'', phone:'', address:'', avatarUrl:'' })
  const [pwForm, setPwForm]             = useState({ currentPassword:'', newPassword:'', confirmPassword:'' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [pwSaving, setPwSaving]         = useState(false)
  const [profileMsg, setProfileMsg]     = useState(null)
  const [pwMsg, setPwMsg]               = useState(null)
  const [openFilePanels, setOpenFilePanels] = useState({}) // taskId -> bool
  const fileRef = useRef()

  const fetchAll = async () => {
    try {
      const [tr, nr, pr] = await Promise.all([
        API.get('/tasks/my'),
        API.get('/notifications'),
        API.get('/profile')
      ])
      setTasks(tr.data)
      setNotifs(nr.data)
      setProfile(pr.data)
      setProfileForm({
        name: pr.data.name || '',
        phone: pr.data.phone || '',
        address: pr.data.address || '',
        avatarUrl: pr.data.avatarUrl || ''
      })
    } catch(e){ console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(()=>{ fetchAll() },[])

  const changeStatus = async (task, st) => {
    setUpdating(task.id)
    try { await API.put(`/tasks/${task.id}`,{status:st}); await fetchAll() }
    catch(e){ console.error(e) }
    finally { setUpdating(null) }
  }

  const markAllRead = async () => {
    try { await API.put('/notifications/read-all'); await fetchAll() }
    catch(e){ console.error(e) }
  }

  const markOneRead = async (id) => {
    try { await API.put(`/notifications/${id}/read`); await fetchAll() }
    catch(e){ console.error(e) }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      await API.put('/profile', profileForm)
      await fetchAll()
      setProfileMsg({ type:'success', text:'Profile updated successfully' })
    } catch(err) {
      setProfileMsg({ type:'error', text: err.response?.data?.message || 'Failed to update profile' })
    } finally { setProfileSaving(false) }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    if(pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type:'error', text:'New passwords do not match' })
      return
    }
    if(pwForm.newPassword.length < 6) {
      setPwMsg({ type:'error', text:'Password must be at least 6 characters' })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    try {
      await API.put('/profile/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword
      })
      setPwMsg({ type:'success', text:'Password changed successfully' })
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' })
    } catch(err) {
      setPwMsg({ type:'error', text: err.response?.data?.message || 'Failed to change password' })
    } finally { setPwSaving(false) }
  }

  const handleAvatarUrl = (e) => {
    setProfileForm(f => ({ ...f, avatarUrl: e.target.value }))
  }

  const toggleFilePanel = (taskId) => {
    setOpenFilePanels(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const counts = STATUSES.reduce((a,s)=>({...a,[s]:tasks.filter(t=>t.status===s).length}),{})
  const pct    = tasks.length ? Math.round((counts.DONE/tasks.length)*100) : 0
  const filtered = filter==='ALL' ? tasks : tasks.filter(t=>t.status===filter)
  const unread = notifications.filter(n=>!n.isRead).length

  const initials = n => n?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const greet = () => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening' }

  const deadlineInfo = (dl, st) => {
    if(st==='DONE') return {text:'Completed',   cls:'dl-done', icon:'fa-check'}
    if(!dl)         return {text:'No deadline', cls:'dl-none', icon:'fa-minus'}
    const d = Math.ceil((new Date(dl)-new Date())/86400000)
    if(d<0)  return {text:`${Math.abs(d)}d overdue`, cls:'dl-bad',  icon:'fa-triangle-exclamation'}
    if(d===0) return {text:'Due today',               cls:'dl-bad',  icon:'fa-triangle-exclamation'}
    if(d===1) return {text:'Due tomorrow',            cls:'dl-warn', icon:'fa-clock'}
    return          {text:`${d} days left`,           cls:'dl-ok',   icon:'fa-calendar'}
  }

  const timeAgo = (date) => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000)
    if(diff < 60) return 'Just now'
    if(diff < 3600) return `${Math.floor(diff/60)}m ago`
    if(diff < 86400) return `${Math.floor(diff/3600)}h ago`
    return `${Math.floor(diff/86400)}d ago`
  }

  return(
    <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
      @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');

      *{box-sizing:border-box;margin:0;padding:0}
      html,body,#root{height:100%}
      body{font-family:'DM Sans',sans-serif;background:#F5F4F0}

      @keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pop{from{opacity:0;transform:scale(0.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes bar{from{width:0}to{width:var(--w)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}
      @keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(177,75,144,0)}50%{box-shadow:0 0 0 8px rgba(177,75,144,0.15)}}
      @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
      @keyframes notifIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
      @keyframes panelOpen{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}

      .wrap{display:flex;min-height:100vh}

      /* RAIL */
      .rail{width:70px;background:#0D0D14;display:flex;flex-direction:column;align-items:center;padding:18px 0;flex-shrink:0;position:sticky;top:0;height:100vh}
      .rail-logo{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#b14b90,#ea5580);display:flex;align-items:center;justify-content:center;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:800;color:#fff;margin-bottom:20px;animation:glow 3s ease infinite;cursor:pointer}
      .rail-btn{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.25);font-size:15px;transition:all 0.18s;cursor:pointer;border:none;background:transparent;margin-bottom:4px;position:relative}
      .rail-btn:hover{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.7)}
      .rail-btn.active{background:rgba(177,75,144,0.2);color:#ea5580}
      .rail-btn .notif-dot{position:absolute;top:8px;right:8px;width:8px;height:8px;border-radius:50%;background:#E11D48;border:2px solid #0D0D14;animation:blink 2s ease infinite}
      .rail-tooltip{position:absolute;left:58px;background:#1a1a2e;color:#fff;font-size:11px;font-weight:600;padding:5px 10px;border-radius:7px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.15s;z-index:999;font-family:'DM Sans',sans-serif}
      .rail-btn:hover .rail-tooltip{opacity:1}
      .rail-sep{width:28px;height:1px;background:rgba(255,255,255,0.07);margin:8px 0}
      .rail-bottom{margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:6px}
      .rail-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#b14b90,#ea5580);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;border:2px solid rgba(177,75,144,0.35);overflow:hidden;cursor:pointer}
      .rail-avatar img{width:100%;height:100%;object-fit:cover}
      .rail-logout{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.2);font-size:12px;background:transparent;border:none;cursor:pointer;transition:all 0.18s;position:relative}
      .rail-logout:hover{background:rgba(229,72,77,0.15);color:#E11D48}

      /* MAIN */
      .main{flex:1;display:flex;flex-direction:column;min-width:0}

      /* TOPBAR */
      .top{height:62px;background:#fff;border-bottom:1px solid #EBEBEB;display:flex;align-items:center;padding:0 32px;gap:14px;position:sticky;top:0;z-index:50}
      .top-brand{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:800;color:#111;letter-spacing:-0.4px}
      .top-brand b{color:#b14b90}
      .top-page{font-size:12px;color:#9CA3AF;background:#F4F4F4;padding:3px 10px;border-radius:999px;font-weight:500}
      .top-sep{flex:1}
      .top-greet{font-size:13px;color:#9CA3AF}
      .top-greet strong{color:#374151;font-weight:600}
      .top-role{font-size:10px;font-weight:700;letter-spacing:1px;background:#FDF4FB;color:#b14b90;border:1px solid #F0C9E8;padding:3px 10px;border-radius:999px}
      .top-user{display:flex;align-items:center;gap:9px}
      .top-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#b14b90,#ea5580);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;overflow:hidden}
      .top-avatar img{width:100%;height:100%;object-fit:cover}
      .top-name{font-size:13px;font-weight:600;color:#374151}

      /* CONTENT */
      .content{padding:28px 32px;flex:1;animation:slideIn 0.3s ease both}

      /* HERO */
      .hero{background:#0D0D14;border-radius:18px;padding:28px 32px;margin-bottom:20px;display:grid;grid-template-columns:1fr auto;gap:28px;align-items:center;position:relative;overflow:hidden}
      .hero-blob1{position:absolute;right:-40px;top:-60px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(177,75,144,0.18) 0%,transparent 65%);pointer-events:none}
      .hero-blob2{position:absolute;left:40%;bottom:-80px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(234,85,128,0.1) 0%,transparent 70%);pointer-events:none}
      .hero-eyebrow{font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:1.5px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:7px}
      .hero-dot{width:5px;height:5px;border-radius:50%;background:#b14b90;display:inline-block;animation:blink 2s ease infinite}
      .hero-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.6px;margin-bottom:7px;line-height:1.2}
      .hero-name em{font-style:normal;background:linear-gradient(135deg,#b14b90,#ea5580);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
      .hero-sub{font-size:13px;color:rgba(255,255,255,0.35);line-height:1.65}
      .hero-sub strong{color:rgba(255,255,255,0.65)}
      .hero-right{text-align:center;flex-shrink:0}
      .hero-pct-wrap{position:relative;width:88px;height:88px;margin:0 auto 6px}
      .hero-pct-svg{transform:rotate(-90deg)}
      .hero-pct-bg{fill:none;stroke:rgba(255,255,255,0.07);stroke-width:6}
      .hero-pct-fill{fill:none;stroke:url(#pg);stroke-width:6;stroke-linecap:round;transition:stroke-dashoffset 1.3s cubic-bezier(0.4,0,0.2,1)}
      .hero-pct-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
      .hero-pct-num{font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:#fff;line-height:1}
      .hero-pct-lbl{font-size:8px;color:rgba(255,255,255,0.3);letter-spacing:0.8px;margin-top:1px}
      .hero-pct-sub{font-size:10px;color:rgba(255,255,255,0.25)}

      /* PROFILE MINI */
      .profile-mini{background:#fff;border-radius:14px;border:1px solid #EBEBEB;padding:18px 20px;margin-bottom:20px;display:flex;align-items:center;gap:16px;animation:up 0.4s ease 0.1s both;transition:box-shadow 0.18s;cursor:pointer}
      .profile-mini:hover{box-shadow:0 4px 16px rgba(0,0,0,0.07)}
      .pm-avatar{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#b14b90,#ea5580);display:flex;align-items:center;justify-content:center;font-family:'Plus Jakarta Sans',sans-serif;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;overflow:hidden;box-shadow:0 4px 12px rgba(177,75,144,0.3)}
      .pm-avatar img{width:100%;height:100%;object-fit:cover}
      .pm-info{flex:1;min-width:0}
      .pm-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:800;color:#111;margin-bottom:3px}
      .pm-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .pm-email{font-size:12px;color:#9CA3AF}
      .pm-phone{font-size:12px;color:#9CA3AF;display:flex;align-items:center;gap:4px}
      .pm-role-badge{font-size:10px;font-weight:700;letter-spacing:0.8px;background:#FDF4FB;color:#b14b90;border:1px solid #F0C9E8;padding:2px 9px;border-radius:999px}
      .pm-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
      .pm-joined{font-size:11px;color:#CBD5E1}
      .pm-edit-btn{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#b14b90;background:#FDF4FB;border:1px solid #F0C9E8;padding:5px 12px;border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s}
      .pm-edit-btn:hover{background:#f5e0f0}

      /* PROGRESS */
      .prog-wrap{margin-bottom:20px;animation:up 0.4s ease 0.15s both}
      .prog-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}
      .prog-label{font-size:11px;font-weight:600;color:#9CA3AF;letter-spacing:0.4px;display:flex;align-items:center;gap:6px}
      .prog-val{font-size:12px;font-weight:700;color:#b14b90}
      .prog-track{height:5px;background:#E5E7EB;border-radius:999px;overflow:hidden}
      .prog-fill{height:100%;background:linear-gradient(90deg,#b14b90,#ea5580,#f77b24);border-radius:999px;width:0;animation:bar 1.4s cubic-bezier(0.4,0,0.2,1) 0.4s forwards;--w:0%}

      /* STATS */
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}
      .sc{background:#fff;border-radius:13px;border:1px solid #EBEBEB;padding:16px 18px;transition:transform 0.18s,box-shadow 0.18s;animation:up 0.4s ease var(--d) both;cursor:default}
      .sc:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.07)}
      .sc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
      .sc-ico{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px}
      .sc-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px}
      .sc-val{font-family:'Plus Jakarta Sans',sans-serif;font-size:26px;font-weight:800;color:#111;line-height:1;margin-bottom:3px}
      .sc-label{font-size:11px;color:#9CA3AF;font-weight:500}

      /* TASK SECTION HEADER */
      .th{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;animation:up 0.4s ease 0.35s both}
      .th-left{display:flex;align-items:center;gap:8px}
      .th-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:800;color:#111;letter-spacing:-0.3px}
      .th-count{background:#F1F5F9;color:#64748B;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px}
      .th-filters{display:flex;gap:4px}
      .fp{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:999px;font-size:11px;font-weight:600;border:1px solid #E5E7EB;background:#fff;color:#6B7280;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s}
      .fp:hover{border-color:#b14b90;color:#b14b90}
      .fp.on{background:#0D0D14;color:#fff;border-color:#0D0D14}

      /* TASK GRID */
      .tg{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
      .tc{background:#fff;border-radius:13px;border:1px solid #EBEBEB;overflow:hidden;position:relative;transition:transform 0.18s,box-shadow 0.18s,border-color 0.18s;animation:pop 0.35s ease var(--cd) both}
      .tc:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,0.09);border-color:#D1D5DB}
      .tc.done-card{opacity:0.55}
      .tc-stripe{height:3px}
      .tc-body{padding:16px}
      .tc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px}
      .tc-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;color:#111;line-height:1.4;flex:1}
      .tc-title.struck{text-decoration:line-through;color:#9CA3AF}
      .tc-ppill{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:999px;font-size:9px;font-weight:700;border:1px solid;flex-shrink:0}
      .tc-desc{font-size:11px;color:#9CA3AF;line-height:1.55;margin-bottom:12px}
      .tc-foot{display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #F3F4F6}
      .dl{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:10px;font-weight:600}
      .dl-none{background:#F9FAFB;color:#CBD5E1}
      .dl-ok{background:#F0FDF4;color:#16A34A}
      .dl-warn{background:#FFFBEB;color:#D97706}
      .dl-bad{background:#FFF1F2;color:#E11D48}
      .dl-done{background:#F0FDF4;color:#16A34A}
      .tc-sel{padding:5px 8px;border-radius:7px;font-size:10px;font-weight:600;border:1px solid;font-family:'DM Sans',sans-serif;cursor:pointer;outline:none;transition:all 0.15s;appearance:none;padding-right:20px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='7' height='4'%3E%3Cpath d='M0 0l3.5 4L7 0z' fill='%23999'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center}
      .tc-sel:hover{opacity:0.8}
      .tc-sel:disabled{opacity:0.4;cursor:not-allowed}
      .tc-updating{position:absolute;inset:0;background:rgba(255,255,255,0.8);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;border-radius:13px}
      .fa-spin2{animation:spin 0.7s linear infinite;color:#b14b90;font-size:20px}

      /* FILES TOGGLE */
      .tc-files-bar{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;border-top:1px solid #F3F4F6;cursor:pointer;transition:background 0.15s}
      .tc-files-bar:hover{background:#FAFAFA}
      .tc-files-toggle{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#6B7280}
      .tc-files-toggle i{font-size:10px;color:#b14b90}
      .tc-files-chevron{font-size:9px;color:#CBD5E1;transition:transform 0.2s}
      .tc-files-chevron.open{transform:rotate(180deg)}

      /* FILE PANEL */
      .file-panel{padding:12px 16px 14px;background:#FAFAFA;border-top:1px solid #F0F0F0;animation:panelOpen 0.2s ease both}
      .file-panel-error{background:#FFF1F2;color:#E11D48;border:1px solid #FECDD3;font-size:11px;padding:6px 10px;border-radius:6px;margin-bottom:8px}
      .file-uploading{display:flex;align-items:center;gap:6px;font-size:11px;color:#b14b90;font-weight:600;margin-bottom:8px}
      .mini-spinner{width:12px;height:12px;border:2px solid #F0C9E8;border-top-color:#b14b90;border-radius:50%;animation:spin 0.7s linear infinite;flex-shrink:0}
      .file-drop{border:1.5px dashed #E5E7EB;border-radius:8px;padding:10px;text-align:center;cursor:pointer;transition:all 0.18s;background:#fff;display:flex;flex-direction:column;align-items:center;gap:2px;margin-bottom:10px;font-size:11px;color:#9CA3AF}
      .file-drop strong{color:#b14b90}
      .file-drop:hover,.file-drop.drag-active{border-color:#b14b90;background:#FDF5FB}
      .file-panel-loading{font-size:11px;color:#CBD5E1;text-align:center;padding:8px 0}
      .file-panel-empty{font-size:11px;color:#CBD5E1;text-align:center;padding:6px 0}
      .file-list{display:flex;flex-direction:column;gap:5px}
      .file-row{display:flex;align-items:center;gap:8px;padding:6px 8px;background:#fff;border:1px solid #F0F0F0;border-radius:7px}
      .file-row-icon{font-size:15px;flex-shrink:0}
      .file-row-info{flex:1;min-width:0}
      .file-row-name{font-size:11px;font-weight:600;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .file-row-meta{font-size:10px;color:#CBD5E1;margin-top:1px}
      .file-row-actions{display:flex;gap:4px;flex-shrink:0}
      .file-dl-btn{width:24px;height:24px;border-radius:5px;background:#EFF6FF;display:inline-flex;align-items:center;justify-content:center;color:#2563EB;text-decoration:none;transition:background 0.15s}
      .file-dl-btn:hover{background:#DBEAFE}
      .file-del-btn{width:24px;height:24px;border-radius:5px;background:#FFF1F2;border:none;display:inline-flex;align-items:center;justify-content:center;color:#E11D48;cursor:pointer;transition:background 0.15s}
      .file-del-btn:hover{background:#FECDD3}
      .file-del-btn:disabled{opacity:0.4;cursor:not-allowed}

      /* NOTIFICATIONS */
      .notif-wrap{animation:slideIn 0.3s ease both}
      .notif-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
      .notif-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:800;color:#111;display:flex;align-items:center;gap:8px}
      .notif-unread-badge{background:#E11D48;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px}
      .mark-all-btn{font-size:12px;font-weight:600;color:#b14b90;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;padding:6px 12px;border-radius:8px;transition:background 0.15s}
      .mark-all-btn:hover{background:#FDF4FB}
      .notif-list{display:flex;flex-direction:column;gap:8px}
      .notif-item{background:#fff;border-radius:12px;border:1px solid #EBEBEB;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;transition:all 0.18s;animation:notifIn 0.3s ease var(--nd) both;cursor:pointer}
      .notif-item:hover{border-color:#D1D5DB;box-shadow:0 4px 12px rgba(0,0,0,0.06)}
      .notif-item.unread{border-left:3px solid #b14b90;background:#FDF9FC}
      .notif-ico{width:36px;height:36px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px}
      .notif-body{flex:1;min-width:0}
      .notif-ntitle{font-size:13px;font-weight:600;color:#111;margin-bottom:3px}
      .notif-msg{font-size:12px;color:#6B7280;line-height:1.55}
      .notif-time{font-size:11px;color:#CBD5E1;margin-top:5px;display:flex;align-items:center;gap:4px}
      .notif-unread-dot{width:8px;height:8px;border-radius:50%;background:#b14b90;flex-shrink:0;margin-top:4px}
      .notif-empty{background:#fff;border-radius:14px;border:1px solid #EBEBEB;padding:60px 24px;text-align:center}
      .notif-empty-ico{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#b14b90,#ea5580);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:22px;color:#fff}
      .notif-empty-t{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;color:#111;margin-bottom:6px}
      .notif-empty-s{font-size:12px;color:#9CA3AF}

      /* PROFILE */
      .profile-wrap{display:grid;grid-template-columns:1fr 1fr;gap:16px;animation:slideIn 0.3s ease both}
      .profile-card{background:#fff;border-radius:14px;border:1px solid #EBEBEB;padding:24px}
      .profile-card-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:800;color:#111;margin-bottom:18px;display:flex;align-items:center;gap:8px}
      .profile-avatar-section{display:flex;flex-direction:column;align-items:center;margin-bottom:20px}
      .profile-avatar-big{width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#b14b90,#ea5580);display:flex;align-items:center;justify-content:center;font-family:'Plus Jakarta Sans',sans-serif;font-size:28px;font-weight:800;color:#fff;margin-bottom:10px;box-shadow:0 6px 20px rgba(177,75,144,0.3);overflow:hidden}
      .profile-avatar-big img{width:100%;height:100%;object-fit:cover}
      .profile-avatar-hint{font-size:11px;color:#9CA3AF;text-align:center}
      .pfield{margin-bottom:14px}
      .pfield label{display:block;font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:5px}
      .pfield input,.pfield textarea{width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:'DM Sans',sans-serif;color:#111;outline:none;transition:border 0.18s;background:#FAFAFA}
      .pfield input:focus,.pfield textarea:focus{border-color:#b14b90;background:#fff}
      .pfield textarea{resize:vertical;min-height:72px}
      .pfield input[readonly]{background:#F4F4F4;color:#9CA3AF;cursor:not-allowed}
      .save-btn{width:100%;padding:10px;background:linear-gradient(135deg,#b14b90,#ea5580);border:none;border-radius:9px;font-size:13px;font-weight:700;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity 0.18s;display:flex;align-items:center;justify-content:center;gap:6px}
      .save-btn:hover{opacity:0.88}
      .save-btn:disabled{opacity:0.6;cursor:not-allowed}
      .msg-box{padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:6px}
      .msg-success{background:#F0FDF4;color:#16A34A;border:1px solid #BBF7D0}
      .msg-error{background:#FFF1F2;color:#E11D48;border:1px solid #FECDD3}

      /* EMPTY / LOADING */
      .empty{background:#fff;border-radius:14px;border:1px solid #EBEBEB;padding:72px 24px;text-align:center}
      .empty-ico{width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#b14b90,#ea5580);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:26px;color:#fff;box-shadow:0 6px 20px rgba(177,75,144,0.3)}
      .empty-t{font-family:'Plus Jakarta Sans',sans-serif;font-size:17px;font-weight:800;color:#111;margin-bottom:7px}
      .empty-s{font-size:13px;color:#9CA3AF;line-height:1.7}
      .loading-box{background:#fff;border-radius:14px;border:1px solid #EBEBEB;padding:72px 24px;text-align:center}
      .ldots{display:flex;justify-content:center;gap:7px;margin-bottom:12px}
      .ldot{width:9px;height:9px;border-radius:50%;animation:blink 1.2s ease infinite}
      .ldot:nth-child(2){animation-delay:0.2s}
      .ldot:nth-child(3){animation-delay:0.4s}
      .lt{font-size:12px;color:#9CA3AF}
    `}</style>

    <div className='wrap'>
      {/* RAIL */}
      <div className='rail'>
        <div className='rail-logo'>V</div>
        <div className={`rail-btn ${activeTab==='dashboard'?'active':''}`} onClick={()=>setActiveTab('dashboard')}>
          <i className='fa-solid fa-house'/>
          <span className='rail-tooltip'>Dashboard</span>
        </div>
        <div className={`rail-btn ${activeTab==='tasks'?'active':''}`} onClick={()=>setActiveTab('tasks')}>
          <i className='fa-solid fa-list-check'/>
          <span className='rail-tooltip'>My Tasks</span>
        </div>
        <div className={`rail-btn ${activeTab==='notifications'?'active':''}`} onClick={()=>setActiveTab('notifications')}>
          <i className='fa-solid fa-bell'/>
          {unread > 0 && <span className='notif-dot'/>}
          <span className='rail-tooltip'>Notifications {unread>0?`(${unread})`:''}</span>
        </div>
        <div className='rail-sep'/>
        <div className={`rail-btn ${activeTab==='profile'?'active':''}`} onClick={()=>setActiveTab('profile')}>
          <i className='fa-solid fa-gear'/>
          <span className='rail-tooltip'>Profile & Settings</span>
        </div>
        <div className='rail-bottom'>
          <div className='rail-avatar' onClick={()=>setActiveTab('profile')}>
            {profile?.avatarUrl ? <img src={profile.avatarUrl} alt='avatar'/> : initials(user?.name)}
          </div>
          <button className='rail-logout' title='Sign out' onClick={()=>{logout();window.location.href='/login'}}>
            <i className='fa-solid fa-right-from-bracket'/>
            <span className='rail-tooltip'>Sign out</span>
          </button>
        </div>
      </div>

      <div className='main'>
        {/* TOPBAR */}
        <div className='top'>
          <div className='top-brand'>Vedhaan<b>Ops</b></div>
          <div className='top-page'>
            {activeTab==='dashboard'&&'Dashboard'}
            {activeTab==='tasks'&&'My Tasks'}
            {activeTab==='notifications'&&'Notifications'}
            {activeTab==='profile'&&'Profile & Settings'}
          </div>
          <div className='top-sep'/>
          <div className='top-greet'>{greet()}, <strong>{user?.name?.split(' ')[0]}</strong></div>
          <div className='top-role'>MEMBER</div>
          <div className='top-user'>
            <div className='top-avatar'>
              {profile?.avatarUrl ? <img src={profile.avatarUrl} alt=''/> : initials(user?.name)}
            </div>
            <div className='top-name'>{user?.name}</div>
          </div>
        </div>

        <div className='content'>

          {/* ── DASHBOARD TAB ── */}
          {activeTab==='dashboard' && (
            <>
              <div className='hero' style={{animation:'up 0.4s ease 0.05s both'}}>
                <div className='hero-blob1'/><div className='hero-blob2'/>
                <div>
                  <div className='hero-eyebrow'>
                    <span className='hero-dot'/>
                    {greet().toUpperCase()} · {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
                  </div>
                  <div className='hero-name'>Hey, <em>{user?.name?.split(' ')[0]}</em> 👋</div>
                  <div className='hero-sub'>
                    {counts.TODO>0
                      ? <><strong>{counts.TODO} task{counts.TODO!==1?'s':''}</strong> to do{counts.IN_PROGRESS>0?<> · <strong>{counts.IN_PROGRESS}</strong> in progress</>:null} · let's get them done.</>
                      : tasks.length>0 ? <>All tasks complete. <strong>Exceptional work!</strong></> : <>No tasks yet. Sit tight.</>}
                  </div>
                </div>
                <div className='hero-right'>
                  <div className='hero-pct-wrap'>
                    <svg className='hero-pct-svg' width='88' height='88' viewBox='0 0 88 88'>
                      <defs>
                        <linearGradient id='pg' x1='0%' y1='0%' x2='100%' y2='0%'>
                          <stop offset='0%' stopColor='#b14b90'/>
                          <stop offset='100%' stopColor='#ea5580'/>
                        </linearGradient>
                      </defs>
                      <circle className='hero-pct-bg' cx='44' cy='44' r='36'/>
                      <circle className='hero-pct-fill' cx='44' cy='44' r='36'
                        strokeDasharray={`${2*Math.PI*36}`}
                        strokeDashoffset={`${2*Math.PI*36*(1-pct/100)}`}
                      />
                    </svg>
                    <div className='hero-pct-inner'>
                      <div className='hero-pct-num'>{pct}%</div>
                      <div className='hero-pct-lbl'>DONE</div>
                    </div>
                  </div>
                  <div className='hero-pct-sub'>{counts.DONE||0} of {tasks.length}</div>
                </div>
              </div>

              {profile && (
                <div className='profile-mini' onClick={()=>setActiveTab('profile')}>
                  <div className='pm-avatar'>
                    {profile.avatarUrl ? <img src={profile.avatarUrl} alt=''/> : initials(profile.name)}
                  </div>
                  <div className='pm-info'>
                    <div className='pm-name'>{profile.name}</div>
                    <div className='pm-meta'>
                      <span className='pm-email'><i className='fa-solid fa-envelope' style={{fontSize:'10px',marginRight:'4px'}}/>{profile.email}</span>
                      {profile.phone && <span className='pm-phone'><i className='fa-solid fa-phone' style={{fontSize:'10px'}}/>{profile.phone}</span>}
                      <span className='pm-role-badge'>MEMBER</span>
                    </div>
                  </div>
                  <div className='pm-right'>
                    <div className='pm-joined'>Joined {new Date(profile.createdAt).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</div>
                    <button className='pm-edit-btn'><i className='fa-solid fa-pen' style={{fontSize:'10px'}}/>Edit Profile</button>
                  </div>
                </div>
              )}

              <div className='prog-wrap'>
                <div className='prog-row'>
                  <div className='prog-label'><i className='fa-solid fa-chart-line' style={{color:'#b14b90'}}/>OVERALL PROGRESS</div>
                  <div className='prog-val'>{pct}%</div>
                </div>
                <div className='prog-track'>
                  <div className='prog-fill' style={{'--w':`${pct}%`}}/>
                </div>
              </div>

              <div className='stats'>
                {[
                  {label:'Total',       val:tasks.length,          ico:'fa-layer-group',  ibg:'#F8FAFC',ic:'#64748B',d:'0.2s',  badge:null},
                  {label:'To Do',       val:counts.TODO||0,        ico:'fa-circle-dot',   ibg:'#EFF6FF',ic:'#2563EB',d:'0.25s', badge:null},
                  {label:'In Progress', val:counts.IN_PROGRESS||0, ico:'fa-bolt',         ibg:'#FAF5FF',ic:'#7C3AED',d:'0.3s',  badge:null},
                  {label:'Completed',   val:counts.DONE||0,        ico:'fa-circle-check', ibg:'#F0FDF4',ic:'#16A34A',d:'0.35s', badge:pct>0?`${pct}%`:null},
                ].map(s=>(
                  <div key={s.label} className='sc' style={{'--d':s.d}}>
                    <div className='sc-top'>
                      <div className='sc-ico' style={{background:s.ibg}}><i className={`fa-solid ${s.ico}`} style={{color:s.ic}}/></div>
                      {s.badge&&<div className='sc-badge' style={{background:'#F0FDF4',color:'#16A34A'}}>{s.badge}</div>}
                    </div>
                    <div className='sc-val'>{s.val}</div>
                    <div className='sc-label'>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className='th'>
                <div className='th-left'>
                  <i className='fa-solid fa-thumbtack' style={{color:'#b14b90',fontSize:'13px'}}/>
                  <div className='th-title'>Recent Tasks</div>
                  <div className='th-count'>{tasks.slice(0,4).length}</div>
                </div>
                <button className='fp on' onClick={()=>setActiveTab('tasks')}>
                  <i className='fa-solid fa-arrow-right' style={{fontSize:'9px'}}/>View All
                </button>
              </div>

              {loading ? (
                <div className='loading-box'>
                  <div className='ldots'>
                    <div className='ldot' style={{background:'#b14b90'}}/><div className='ldot' style={{background:'#ea5580'}}/><div className='ldot' style={{background:'#f77b24'}}/>
                  </div>
                  <div className='lt'>Loading...</div>
                </div>
              ) : (
                <div className='tg'>
                  {tasks.slice(0,4).map((task,i)=>{
                    const p=P[task.priority]; const st=S[task.status]; const dl=deadlineInfo(task.deadline,task.status)
                    return(
                      <div key={task.id} className={`tc ${task.status==='DONE'?'done-card':''}`} style={{'--cd':`${i*0.06}s`}}>
                        <div className='tc-stripe' style={{background:p.stripe}}/>
                        <div className='tc-body'>
                          <div className='tc-head'>
                            <div className={`tc-title ${task.status==='DONE'?'struck':''}`}>{task.title}</div>
                            <div className='tc-ppill' style={{background:p.bg,color:p.color,borderColor:p.border}}>
                              <i className={`fa-solid ${p.icon}`} style={{fontSize:'8px'}}/>{p.label}
                            </div>
                          </div>
                          {task.description&&<div className='tc-desc'>{task.description}</div>}
                          <div className='tc-foot'>
                            <div className={`dl ${dl.cls}`}><i className={`fa-solid ${dl.icon}`} style={{fontSize:'9px'}}/>{dl.text}</div>
                            <div className='tc-ppill' style={{background:st.bg,color:st.color,borderColor:st.border}}>
                              <i className={`fa-solid ${st.icon}`} style={{fontSize:'8px'}}/>{st.label}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── TASKS TAB ── */}
          {activeTab==='tasks' && (
            <div style={{animation:'slideIn 0.3s ease both'}}>
              <div className='th'>
                <div className='th-left'>
                  <i className='fa-solid fa-list-check' style={{color:'#b14b90',fontSize:'13px'}}/>
                  <div className='th-title'>My Tasks</div>
                  <div className='th-count'>{filtered.length}</div>
                </div>
                <div className='th-filters'>
                  {[['ALL','fa-grip','All'],['TODO','fa-circle','To Do'],['IN_PROGRESS','fa-circle-half-stroke','In Progress'],['DONE','fa-circle-check','Done']].map(([v,ico,lbl])=>(
                    <button key={v} className={`fp ${filter===v?'on':''}`} onClick={()=>setFilter(v)}>
                      <i className={`fa-solid ${ico}`} style={{fontSize:'9px'}}/>{lbl}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className='loading-box'>
                  <div className='ldots'>
                    <div className='ldot' style={{background:'#b14b90'}}/><div className='ldot' style={{background:'#ea5580'}}/><div className='ldot' style={{background:'#f77b24'}}/>
                  </div>
                  <div className='lt'>Loading your tasks...</div>
                </div>
              ) : tasks.length===0 ? (
                <div className='empty'>
                  <div className='empty-ico'><i className='fa-solid fa-inbox'/></div>
                  <div className='empty-t'>No tasks yet</div>
                  <div className='empty-s'>Your admin will assign tasks shortly.</div>
                </div>
              ) : filtered.length===0 ? (
                <div className='empty'>
                  <div className='empty-ico'><i className='fa-solid fa-filter'/></div>
                  <div className='empty-t'>Nothing here</div>
                  <div className='empty-s'>No tasks match this filter.</div>
                </div>
              ) : (
                <div className='tg'>
                  {filtered.map((task,i)=>{
                    const p=P[task.priority]; const st=S[task.status]; const dl=deadlineInfo(task.deadline,task.status)
                    const isUpdating=updating===task.id
                    const filesOpen=openFilePanels[task.id]
                    return(
                      <div key={task.id} className={`tc ${task.status==='DONE'?'done-card':''}`} style={{'--cd':`${i*0.05}s`}}>
                        <div className='tc-stripe' style={{background:p.stripe}}/>
                        {isUpdating&&<div className='tc-updating'><i className='fa-solid fa-spinner fa-spin2'/></div>}
                        <div className='tc-body'>
                          <div className='tc-head'>
                            <div className={`tc-title ${task.status==='DONE'?'struck':''}`}>
                              {task.status==='DONE'&&<i className='fa-solid fa-check' style={{color:'#16A34A',marginRight:'4px',fontSize:'10px'}}/>}
                              {task.title}
                            </div>
                            <div className='tc-ppill' style={{background:p.bg,color:p.color,borderColor:p.border}}>
                              <i className={`fa-solid ${p.icon}`} style={{fontSize:'8px'}}/>{p.label}
                            </div>
                          </div>
                          {task.description&&<div className='tc-desc'>{task.description}</div>}
                          <div className='tc-foot'>
                            <div className={`dl ${dl.cls}`}><i className={`fa-solid ${dl.icon}`} style={{fontSize:'9px'}}/>{dl.text}</div>
                            <select className='tc-sel' value={task.status} onChange={e=>changeStatus(task,e.target.value)} style={{background:st.bg,color:st.color,borderColor:st.border}} disabled={isUpdating}>
                              {STATUSES.map(s=><option key={s} value={s}>{S[s].label}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Files toggle bar */}
                        <div className='tc-files-bar' onClick={()=>toggleFilePanel(task.id)}>
                          <div className='tc-files-toggle'>
                            <i className='fa-solid fa-paperclip'/>
                            Files
                          </div>
                          <i className={`fa-solid fa-chevron-down tc-files-chevron ${filesOpen?'open':''}`}/>
                        </div>

                        {/* File panel — mounts only when open, so fetch happens on first expand */}
                        {filesOpen && (
                          <TaskFilePanel taskId={task.id} userId={user?.id} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {activeTab==='notifications' && (
            <div className='notif-wrap'>
              <div className='notif-header'>
                <div className='notif-title'>
                  <i className='fa-solid fa-bell' style={{color:'#b14b90',fontSize:'14px'}}/>
                  Notifications
                  {unread>0&&<span className='notif-unread-badge'>{unread} new</span>}
                </div>
                {unread>0&&<button className='mark-all-btn' onClick={markAllRead}>
                  <i className='fa-solid fa-check-double' style={{marginRight:'5px'}}/>Mark all read
                </button>}
              </div>
              {notifications.length===0 ? (
                <div className='notif-empty'>
                  <div className='notif-empty-ico'><i className='fa-solid fa-bell-slash'/></div>
                  <div className='notif-empty-t'>All caught up</div>
                  <div className='notif-empty-s'>No notifications yet. You're good to go.</div>
                </div>
              ) : (
                <div className='notif-list'>
                  {notifications.map((n,i)=>{
                    const isTask=n.title.includes('Task')||n.title.includes('Assigned')
                    const isDeadline=n.title.includes('Due')||n.title.includes('Overdue')
                    const ico=isDeadline?'fa-clock':isTask?'fa-list-check':'fa-bell'
                    const ibg=isDeadline?'#FFF7ED':isTask?'#EFF6FF':'#FDF4FB'
                    const ic=isDeadline?'#D97706':isTask?'#2563EB':'#b14b90'
                    return(
                      <div key={n.id} className={`notif-item ${!n.isRead?'unread':''}`} style={{'--nd':`${i*0.04}s`}} onClick={()=>!n.isRead&&markOneRead(n.id)}>
                        <div className='notif-ico' style={{background:ibg}}><i className={`fa-solid ${ico}`} style={{color:ic}}/></div>
                        <div className='notif-body'>
                          <div className='notif-ntitle'>{n.title}</div>
                          <div className='notif-msg'>{n.message}</div>
                          <div className='notif-time'><i className='fa-regular fa-clock' style={{fontSize:'9px'}}/>{timeAgo(n.createdAt)}</div>
                        </div>
                        {!n.isRead&&<div className='notif-unread-dot'/>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PROFILE TAB ── */}
          {activeTab==='profile' && (
            <div className='profile-wrap'>
              <div className='profile-card'>
                <div className='profile-card-title'><i className='fa-solid fa-user' style={{color:'#b14b90'}}/>Edit Profile</div>
                <div className='profile-avatar-section'>
                  <div className='profile-avatar-big'>
                    {profileForm.avatarUrl ? <img src={profileForm.avatarUrl} alt=''/> : initials(profileForm.name)}
                  </div>
                  <div className='profile-avatar-hint'>Paste an image URL below to set your avatar</div>
                </div>
                {profileMsg&&<div className={`msg-box ${profileMsg.type==='success'?'msg-success':'msg-error'}`}>
                  <i className={`fa-solid ${profileMsg.type==='success'?'fa-circle-check':'fa-circle-xmark'}`}/>{profileMsg.text}
                </div>}
                <form onSubmit={saveProfile}>
                  <div className='pfield'><label>Full Name</label><input value={profileForm.name} onChange={e=>setProfileForm(f=>({...f,name:e.target.value}))} placeholder='Your full name' required/></div>
                  <div className='pfield'><label>Email</label><input value={profile?.email||''} readOnly/></div>
                  <div className='pfield'><label>Phone Number</label><input value={profileForm.phone} onChange={e=>setProfileForm(f=>({...f,phone:e.target.value}))} placeholder='e.g. 9876543210'/></div>
                  <div className='pfield'><label>Address</label><textarea value={profileForm.address} onChange={e=>setProfileForm(f=>({...f,address:e.target.value}))} placeholder='Your address'/></div>
                  <div className='pfield'><label>Avatar URL</label><input value={profileForm.avatarUrl} onChange={handleAvatarUrl} placeholder='https://example.com/photo.jpg'/></div>
                  <button type='submit' className='save-btn' disabled={profileSaving}>
                    <i className='fa-solid fa-floppy-disk'/>{profileSaving?'Saving...':'Save Profile'}
                  </button>
                </form>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                <div className='profile-card'>
                  <div className='profile-card-title'><i className='fa-solid fa-lock' style={{color:'#b14b90'}}/>Change Password</div>
                  {pwMsg&&<div className={`msg-box ${pwMsg.type==='success'?'msg-success':'msg-error'}`}>
                    <i className={`fa-solid ${pwMsg.type==='success'?'fa-circle-check':'fa-circle-xmark'}`}/>{pwMsg.text}
                  </div>}
                  <form onSubmit={savePassword}>
                    <div className='pfield'><label>Current Password</label><input type='password' value={pwForm.currentPassword} onChange={e=>setPwForm(f=>({...f,currentPassword:e.target.value}))} placeholder='Current password' required/></div>
                    <div className='pfield'><label>New Password</label><input type='password' value={pwForm.newPassword} onChange={e=>setPwForm(f=>({...f,newPassword:e.target.value}))} placeholder='New password' required/></div>
                    <div className='pfield'><label>Confirm New Password</label><input type='password' value={pwForm.confirmPassword} onChange={e=>setPwForm(f=>({...f,confirmPassword:e.target.value}))} placeholder='Confirm new password' required/></div>
                    <button type='submit' className='save-btn' disabled={pwSaving}>
                      <i className='fa-solid fa-key'/>{pwSaving?'Changing...':'Change Password'}
                    </button>
                  </form>
                </div>

                <div className='profile-card'>
                  <div className='profile-card-title'><i className='fa-solid fa-circle-info' style={{color:'#b14b90'}}/>Account Info</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                    {[
                      {ico:'fa-user',label:'Name',val:profile?.name},
                      {ico:'fa-envelope',label:'Email',val:profile?.email},
                      {ico:'fa-phone',label:'Phone',val:profile?.phone||'Not set'},
                      {ico:'fa-location-dot',label:'Address',val:profile?.address||'Not set'},
                      {ico:'fa-calendar',label:'Joined',val:profile?new Date(profile.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):''},
                      {ico:'fa-shield',label:'Role',val:'Member'},
                    ].map(r=>(
                      <div key={r.label} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:'1px solid #F3F4F6'}}>
                        <div style={{width:'28px',height:'28px',borderRadius:'7px',background:'#FDF4FB',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <i className={`fa-solid ${r.ico}`} style={{fontSize:'11px',color:'#b14b90'}}/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'10px',color:'#9CA3AF',fontWeight:600,letterSpacing:'0.4px',marginBottom:'1px'}}>{r.label.toUpperCase()}</div>
                          <div style={{fontSize:'13px',color:'#374151',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.val}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
    </>
  )
}