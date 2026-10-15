import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Icon from '../../components/ui/Icon'
import Ring from '../../components/ui/Ring'
import EmptyState from '../../components/ui/EmptyState'
import API from '../../api/axios'
import { chipsFor } from '../../components/worksheet/worksheetUtils'
import { greeting, money } from '../../utils/format'

const LEAD_STAGES = [
  ['NEW', 'New', '#2563eb'],
  ['CONTACTED', 'Contacted', '#7c3aed'],
  ['FOLLOW_UP', 'Follow up', '#d97706'],
  ['CONVERTED', 'Converted', '#16a34a'],
  ['LOST', 'Lost', '#9ca3af']
]

const pick = (r) => (r.status === 'fulfilled' ? r.value.data : null)
const toneOf = (cls) => (cls === 'open' ? 'open' : cls)

const Dashboard = () => {
  const { user } = useAuth()
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.allSettled([
      API.get('/clients'),
      API.get('/invoices'),
      API.get('/leads'),
      API.get('/tasks'),
      API.get('/worksheet/day/all')
    ]).then(([c, i, l, t, w]) => {
      if (alive) setData({ clients: pick(c), invoices: pick(i), leads: pick(l), tasks: pick(t), sheet: pick(w) })
    })
    return () => { alive = false }
  }, [])

  const loading = data === null
  const d = data || {}
  const clients = d.clients || []
  const invoices = d.invoices || []
  const leads = d.leads || []
  const tasksOk = Array.isArray(d.tasks)
  const tasks = tasksOk ? d.tasks : []

  const now = new Date()
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  const sum = (list) => list.reduce((s, i) => s + (i.amount || 0), 0)
  const paid = invoices.filter((i) => i.status === 'PAID')
  const unpaid = invoices.filter((i) => i.status !== 'PAID')
  const overdueInv = unpaid.filter((i) => i.status === 'OVERDUE' || new Date(i.dueDate) < now)
  const collected = sum(paid)
  const pending = sum(unpaid)
  const collectedPct = collected + pending ? Math.round((collected / (collected + pending)) * 100) : 0

  const openLeads = leads.filter((l) => l.status !== 'CONVERTED' && l.status !== 'LOST')
  const dueLeads = openLeads.filter((l) => l.followUpAt && new Date(l.followUpAt) <= endOfToday)
  const activeTasks = tasks.filter((t) => t.status !== 'DONE')
  const overdueTasks = activeTasks.filter((t) => t.deadline && new Date(t.deadline) < now)

  const stages = LEAD_STAGES.map(([key, label, color]) => ({
    key, label, color, n: leads.filter((l) => l.status === key).length
  }))
  const maxStage = Math.max(1, ...stages.map((s) => s.n))

  const attention = [
    ...overdueInv.map((i) => ({ key: `i${i.id}`, tone: 'red', icon: 'receipt', title: `${money(i.amount)} overdue`, sub: i.client?.name || 'Invoice', to: '/invoices' })),
    ...dueLeads.map((l) => ({ key: `l${l.id}`, tone: 'amber', icon: 'target', title: `Follow up: ${l.name}`, sub: l.service || l.source || 'Lead', to: '/leads' })),
    ...overdueTasks.map((t) => ({ key: `t${t.id}`, tone: 'red', icon: 'tasks', title: `Overdue: ${t.title}`, sub: t.user?.name || 'Task', to: '/tasks' }))
  ]

  const team = ((d.sheet && d.sheet.staff) || []).filter((s) => s.user.role === 'MEMBER')
  const first = user?.name ? user.name.split(' ')[0] : ''

  return (
    <AppShell>
      <PageHeader
        title={`${greeting()}, ${first}`}
        subtitle='Here is what needs your attention today.'
        actions={
          <Link to='/worksheet' className='v-btn primary'>
            <Icon name='table' size={16} />Open daily sheet
          </Link>
        }
      />

      <div className='v-grid-4'>
        <StatCard label='Clients' icon='users' tone='brand' to='/clients' loading={loading} value={clients.length} hint='Registered' />
        <StatCard label='Open leads' icon='target' tone='blue' to='/leads' loading={loading} value={openLeads.length} hint={`${dueLeads.length} follow-up${dueLeads.length !== 1 ? 's' : ''} due`} />
        <StatCard label='Pending amount' icon='receipt' tone='amber' to='/invoices' loading={loading} value={money(pending)} hint={`${unpaid.length} unpaid, ${overdueInv.length} overdue`} />
        <StatCard
          label='Active tasks'
          icon='tasks'
          tone='violet'
          to='/tasks'
          loading={loading}
          value={tasksOk ? activeTasks.length : '-'}
          hint={tasksOk ? `${overdueTasks.length} overdue` : 'Unavailable right now'}
        />
      </div>

      <div className='v-split'>
        <div className='v-card'>
          <div className='v-card-head'>
            <h3 className='v-card-title'>Revenue</h3>
            <Link className='v-link' to='/invoices'>View invoices</Link>
          </div>
          <div className='v-card-body'>
            <div className='v-rev'>
              <Ring pct={collectedPct} size={124} stroke={12} label='Collected' />
              <div className='v-rev-legend'>
                <div><span className='v-dot green' />Collected<b>{money(collected)}</b></div>
                <div><span className='v-dot amber' />Pending<b>{money(pending)}</b></div>
                <div><span className='v-dot red' />Overdue<b>{money(sum(overdueInv))}</b></div>
              </div>
            </div>
          </div>
        </div>

        <div className='v-card'>
          <div className='v-card-head'>
            <h3 className='v-card-title'>Lead pipeline</h3>
            <Link className='v-link' to='/leads'>View leads</Link>
          </div>
          <div className='v-card-body'>
            {stages.map((s) => (
              <div key={s.key} className='v-bar-row'>
                <span className='v-muted'>{s.label}</span>
                <div className='v-bar-track'>
                  <div className='v-bar-fill' style={{ width: `${(s.n / maxStage) * 100}%`, background: s.color }} />
                </div>
                <span className='v-bar-n'>{s.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='v-split'>
        <div className='v-card'>
          <div className='v-card-head'>
            <h3 className='v-card-title'>Needs attention</h3>
            {attention.length > 0 && <Badge tone='red'>{attention.length}</Badge>}
          </div>
          <div className='v-card-body'>
            {loading ? (
              <span className='v-skel' style={{ width: '100%', height: 60 }} />
            ) : attention.length === 0 ? (
              <EmptyState icon='check' title='All clear' text='No overdue invoices, due follow-ups or late tasks.' />
            ) : (
              <div className='v-list'>
                {attention.slice(0, 6).map((a) => (
                  <Link key={a.key} to={a.to} className='v-list-row'>
                    <div className={`v-tile ${a.tone}`}><Icon name={a.icon} size={16} /></div>
                    <div className='v-list-main'>
                      <div className='v-list-t'>{a.title}</div>
                      <div className='v-list-s'>{a.sub}</div>
                    </div>
                    <Icon name='arrow' size={14} />
                  </Link>
                ))}
                {attention.length > 6 && <div className='v-sub' style={{ paddingTop: 10 }}>and {attention.length - 6} more</div>}
              </div>
            )}
          </div>
        </div>

        <div className='v-card'>
          <div className='v-card-head'>
            <h3 className='v-card-title'>Team today</h3>
            <Link className='v-link' to='/worksheet'>Open sheet</Link>
          </div>
          <div className='v-card-body'>
            {loading ? (
              <span className='v-skel' style={{ width: '100%', height: 60 }} />
            ) : team.length === 0 ? (
              <EmptyState icon='table' title='Sheet unavailable' text='Could not load today\u2019s sheet.' />
            ) : (
              <div className='v-list'>
                {team.map((s) => {
                  const done = s.entries.filter((e) => e.status === 'DONE').length
                  return (
                    <div key={s.user.id} className='v-list-row'>
                      <Avatar name={s.user.name} size={34} />
                      <div className='v-list-main'>
                        <div className='v-list-t'>{s.user.name}</div>
                        <div className='v-list-s'>{done}/{s.entries.length} rows done</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {chipsFor(s.state).map((c, i) => <Badge key={i} tone={toneOf(c.cls)}>{c.label}</Badge>)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default Dashboard