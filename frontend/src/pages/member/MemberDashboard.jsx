import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Icon from '../../components/ui/Icon'
import Ring from '../../components/ui/Ring'
import EmptyState, { LoadingState } from '../../components/ui/EmptyState'
import TaskFiles from '../../components/TaskFiles'
import WorksheetPanel from '../../components/worksheet/WorksheetPanel'
import API from '../../api/axios'
import { fmtDate, getMsg, greeting } from '../../utils/format'

const NAV = [
  { key: 'worksheet', label: 'Daily Sheet', icon: 'table', group: 'Work' },
  { key: 'overview', label: 'Overview', icon: 'dashboard', group: 'Work' },
  { key: 'tasks', label: 'My Tasks', icon: 'tasks', group: 'Work' },
  { key: 'notifications', label: 'Notifications', icon: 'bell', group: 'You' },
  { key: 'profile', label: 'Profile', icon: 'user', group: 'You' }
]

const HEADERS = {
  worksheet: ['Daily Sheet', 'Plan by 11:45 AM and update by 6:00 PM. After 6:00 PM the sheet locks.'],
  overview: ['Overview', 'Your tasks at a glance.'],
  tasks: ['My Tasks', 'Update status and attach files.'],
  notifications: ['Notifications', 'Updates from your admin.'],
  profile: ['Profile and settings', 'Keep your details up to date.']
}

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE']
const STATUS_META = {
  TODO: { label: 'To Do', tone: 'grey' },
  IN_PROGRESS: { label: 'In Progress', tone: 'violet' },
  DONE: { label: 'Done', tone: 'green' }
}

const deadlineInfo = (dl, st) => {
  if (st === 'DONE') return { text: 'Completed', tone: 'green' }
  if (!dl) return { text: 'No deadline', tone: 'grey' }
  const d = Math.ceil((new Date(dl) - new Date()) / 86400000)
  if (d < 0) return { text: `${Math.abs(d)}d overdue`, tone: 'red' }
  if (d === 0) return { text: 'Due today', tone: 'red' }
  if (d === 1) return { text: 'Due tomorrow', tone: 'amber' }
  return { text: `${d} days left`, tone: 'green' }
}

const timeAgo = (date) => {
  const diff = Math.floor((new Date() - new Date(date)) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function MemberDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('worksheet')
  const [tasks, setTasks] = useState([])
  const [notifications, setNotifications] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [updating, setUpdating] = useState(null)
  const [openFiles, setOpenFiles] = useState({})
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '', avatarUrl: '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)
  const [pwMsg, setPwMsg] = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const [tr, nr, pr] = await Promise.all([
        API.get('/tasks/my').catch(() => ({ data: [] })),
        API.get('/notifications').catch(() => ({ data: [] })),
        API.get('/profile').catch(() => ({ data: {} }))
      ])
      setTasks(Array.isArray(tr.data) ? tr.data : [])
      setNotifications(Array.isArray(nr.data) ? nr.data : [])
      setProfile(pr.data)
      setProfileForm({
        name: pr.data.name || '',
        phone: pr.data.phone || '',
        address: pr.data.address || '',
        avatarUrl: pr.data.avatarUrl || ''
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const changeStatus = async (task, status) => {
    setUpdating(task.id)
    try {
      await API.put(`/tasks/${task.id}`, { status })
      await fetchAll()
    } catch (e) {
      window.alert(getMsg(e, 'Could not update the task'))
    } finally {
      setUpdating(null)
    }
  }

  const markAllRead = async () => {
    try { await API.put('/notifications/read-all'); await fetchAll() } catch (e) { console.error(e) }
  }

  const markOneRead = async (id) => {
    try { await API.put(`/notifications/${id}/read`); await fetchAll() } catch (e) { console.error(e) }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      await API.put('/profile', profileForm)
      await fetchAll()
      setProfileMsg({ type: 'ok', text: 'Profile updated successfully' })
    } catch (err) {
      setProfileMsg({ type: 'err', text: getMsg(err, 'Failed to update profile') })
    } finally {
      setProfileSaving(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) return setPwMsg({ type: 'err', text: 'New passwords do not match' })
    if (pwForm.newPassword.length < 6) return setPwMsg({ type: 'err', text: 'Password must be at least 6 characters' })
    setPwSaving(true)
    setPwMsg(null)
    try {
      await API.put('/profile/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword
      })
      setPwMsg({ type: 'ok', text: 'Password changed successfully' })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPwMsg({ type: 'err', text: getMsg(err, 'Failed to change password') })
    } finally {
      setPwSaving(false)
    }
  }

  const counts = STATUSES.reduce((a, s) => ({ ...a, [s]: tasks.filter((t) => t.status === s).length }), {})
  const pct = tasks.length ? Math.round((counts.DONE / tasks.length) * 100) : 0
  const filtered = filter === 'ALL' ? tasks : tasks.filter((t) => t.status === filter)
  const unread = notifications.filter((n) => !n.isRead).length
  const first = user?.name ? user.name.split(' ')[0] : ''
  const items = NAV.map((n) => (n.key === 'notifications' ? { ...n, badge: unread || null } : n))
  const [title, subtitle] = HEADERS[tab]

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <AppShell items={items} activeKey={tab} onSelect={setTab}>
      <PageHeader title={title} subtitle={subtitle} />

      {tab === 'worksheet' && <WorksheetPanel isAdmin={false} />}

      {tab === 'overview' && (
        <>
          <div className='v-hero'>
            <div>
              <div className='v-hero-eyebrow'>{greeting().toUpperCase()} · {dateStr.toUpperCase()}</div>
              <div className='v-hero-title'>Hey, <span>{first}</span></div>
              <div className='v-hero-sub'>
                {counts.TODO > 0
                  ? `${counts.TODO} task${counts.TODO !== 1 ? 's' : ''} to do, ${counts.IN_PROGRESS || 0} in progress.`
                  : tasks.length > 0 ? 'All tasks complete. Great work.' : 'No tasks assigned yet.'}
              </div>
              <div style={{ marginTop: 16 }}>
                <button type='button' className='v-btn primary' onClick={() => setTab('worksheet')}>
                  <Icon name='table' size={16} />Open daily sheet
                </button>
              </div>
            </div>
            <Ring pct={pct} size={96} label='Done' />
          </div>

          <div className='v-grid-4'>
            <StatCard label='Total' icon='tasks' tone='grey' value={tasks.length} loading={loading} />
            <StatCard label='To do' icon='clock' tone='blue' value={counts.TODO || 0} loading={loading} />
            <StatCard label='In progress' icon='tasks' tone='violet' value={counts.IN_PROGRESS || 0} loading={loading} />
            <StatCard label='Completed' icon='check' tone='green' value={counts.DONE || 0} loading={loading} />
          </div>

          <div className='v-card'>
            <div className='v-card-head'>
              <h3 className='v-card-title'>Recent tasks</h3>
              <button type='button' className='v-link' onClick={() => setTab('tasks')}>View all</button>
            </div>
            <div className='v-card-body'>
              {loading ? (
                <LoadingState />
              ) : tasks.length === 0 ? (
                <EmptyState icon='tasks' title='No tasks yet' text='Your admin will assign tasks shortly.' />
              ) : (
                <div className='v-list'>
                  {tasks.slice(0, 5).map((t) => {
                    const dl = deadlineInfo(t.deadline, t.status)
                    return (
                      <div key={t.id} className='v-list-row'>
                        <div className='v-list-main'>
                          <div className='v-list-t'>{t.title}</div>
                          <div className='v-list-s'>{STATUS_META[t.status].label}</div>
                        </div>
                        <Badge tone={dl.tone}>{dl.text}</Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'tasks' && (
        <>
          <div className='v-toolbar'>
            <div className='v-chips'>
              {['ALL', ...STATUSES].map((s) => (
                <button key={s} type='button' className={`v-chip${filter === s ? ' on' : ''}`} onClick={() => setFilter(s)}>
                  {s === 'ALL' ? 'All' : STATUS_META[s].label}
                  <span className='v-chip-n'>{s === 'ALL' ? tasks.length : counts[s] || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className='v-card'><LoadingState text='Loading your tasks...' /></div>
          ) : tasks.length === 0 ? (
            <div className='v-card'><EmptyState icon='tasks' title='No tasks yet' text='Your admin will assign tasks shortly.' /></div>
          ) : filtered.length === 0 ? (
            <div className='v-card'><EmptyState icon='search' title='Nothing here' text='No tasks match this filter.' /></div>
          ) : (
            <div className='v-tgrid'>
              {filtered.map((t) => {
                const dl = deadlineInfo(t.deadline, t.status)
                const isOpen = !!openFiles[t.id]
                return (
                  <div key={t.id} className={`v-tcard ${t.priority.toLowerCase()}${t.status === 'DONE' ? ' done' : ''}`}>
                    <div className='v-tcard-body'>
                      <div className='v-tcard-top'>
                        <div className={`v-tcard-title${t.status === 'DONE' ? ' struck' : ''}`}>{t.title}</div>
                        <Badge tone={t.priority === 'HIGH' ? 'red' : t.priority === 'MEDIUM' ? 'amber' : 'blue'}>{t.priority}</Badge>
                      </div>
                      {t.description && <div className='v-tcard-desc'>{t.description}</div>}
                      <div className='v-tcard-foot'>
                        <Badge tone={dl.tone}>{dl.text}</Badge>
                        <select
                          className={`v-select sm st-${t.status.toLowerCase()}`}
                          value={t.status}
                          disabled={updating === t.id}
                          onChange={(e) => changeStatus(t, e.target.value)}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                        </select>
                      </div>
                    </div>
                    <button type='button' className='v-tcard-files-bar' onClick={() => setOpenFiles((p) => ({ ...p, [t.id]: !p[t.id] }))}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name='paperclip' size={14} />Files</span>
                      <Icon name='chevron' size={14} />
                    </button>
                    {isOpen && <div className='v-tcard-files'><TaskFiles taskId={t.id} user={user} /></div>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'notifications' && (
        <>
          {unread > 0 && (
            <div className='v-toolbar'>
              <Badge tone='red'>{unread} new</Badge>
              <div className='v-toolbar-right'>
                <button type='button' className='v-btn sm' onClick={markAllRead}><Icon name='check' size={14} />Mark all read</button>
              </div>
            </div>
          )}
          {notifications.length === 0 ? (
            <div className='v-card'><EmptyState icon='bell' title='All caught up' text='No notifications yet.' /></div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`v-notif${n.isRead ? '' : ' unread'}`} onClick={() => !n.isRead && markOneRead(n.id)}>
                <div className='v-tile brand'><Icon name='bell' size={16} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className='v-notif-t'>{n.title}</div>
                  <div className='v-notif-m'>{n.message}</div>
                  <div className='v-notif-time'>{timeAgo(n.createdAt)}</div>
                </div>
                {!n.isRead && <div className='v-notif-dot' />}
              </div>
            ))
          )}
        </>
      )}

      {tab === 'profile' && (
        <div className='v-profile-grid'>
          <div className='v-card'>
            <div className='v-card-head'><h3 className='v-card-title'>Edit profile</h3></div>
            <div className='v-card-body'>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <Avatar name={profileForm.name} src={profileForm.avatarUrl} size={72} />
              </div>
              {profileMsg && <div className={`v-alert ${profileMsg.type}`}>{profileMsg.text}</div>}
              <form onSubmit={saveProfile}>
                <div className='v-field'>
                  <label className='v-label'>Full name</label>
                  <input className='v-input' value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className='v-field'>
                  <label className='v-label'>Email</label>
                  <input className='v-input' value={profile?.email || ''} readOnly />
                </div>
                <div className='v-field'>
                  <label className='v-label'>Phone</label>
                  <input className='v-input' value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} placeholder='9876543210' />
                </div>
                <div className='v-field'>
                  <label className='v-label'>Address</label>
                  <textarea className='v-textarea' value={profileForm.address} onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
                <div className='v-field'>
                  <label className='v-label'>Avatar URL</label>
                  <input className='v-input' value={profileForm.avatarUrl} onChange={(e) => setProfileForm((f) => ({ ...f, avatarUrl: e.target.value }))} placeholder='https://example.com/photo.jpg' />
                </div>
                <button type='submit' className='v-btn primary block' disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save profile'}
                </button>
              </form>
            </div>
          </div>

          <div className='v-stack'>
            <div className='v-card'>
              <div className='v-card-head'><h3 className='v-card-title'>Change password</h3></div>
              <div className='v-card-body'>
                {pwMsg && <div className={`v-alert ${pwMsg.type}`}>{pwMsg.text}</div>}
                <form onSubmit={savePassword}>
                  <div className='v-field'>
                    <label className='v-label'>Current password</label>
                    <input className='v-input' type='password' value={pwForm.currentPassword} onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} required />
                  </div>
                  <div className='v-field'>
                    <label className='v-label'>New password</label>
                    <input className='v-input' type='password' value={pwForm.newPassword} onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} required />
                  </div>
                  <div className='v-field'>
                    <label className='v-label'>Confirm new password</label>
                    <input className='v-input' type='password' value={pwForm.confirmPassword} onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))} required />
                  </div>
                  <button type='submit' className='v-btn primary block' disabled={pwSaving}>
                    {pwSaving ? 'Changing...' : 'Change password'}
                  </button>
                </form>
              </div>
            </div>

            <div className='v-card'>
              <div className='v-card-head'><h3 className='v-card-title'>Account info</h3></div>
              <div className='v-card-body'>
                {[
                  ['Name', profile?.name],
                  ['Email', profile?.email],
                  ['Phone', profile?.phone || 'Not set'],
                  ['Address', profile?.address || 'Not set'],
                  ['Joined', profile?.createdAt ? fmtDate(profile.createdAt) : '-'],
                  ['Role', 'Member']
                ].map(([l, v]) => (
                  <div key={l} className='v-info-row'>
                    <div>
                      <div className='v-info-l'>{l}</div>
                      <div className='v-info-v'>{v || '-'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}