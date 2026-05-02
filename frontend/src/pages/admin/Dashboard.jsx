import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/Sidebar'
import PageWrapper from '../../components/PageWrapper'
import API from '../../api/axios'

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalClients: 0,
    unpaidInvoices: 0,
    openLeads: 0,
    activeTasks: 0,
    totalCollected: 0,
    totalPending: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [clientRes, invoiceRes, leadRes, taskRes] = await Promise.all([
          API.get('/clients'),
          API.get('/invoices'),
          API.get('/leads'),
          API.get('/tasks')
        ])

        const invoices = invoiceRes.data
        const leads = leadRes.data
        const tasks = taskRes.data
        const clients = clientRes.data

        setStats({
          totalClients: clients.length,
          unpaidInvoices: invoices.filter(i => i.status !== 'PAID').length,
          openLeads: leads.filter(l => l.status !== 'CONVERTED' && l.status !== 'LOST').length,
          activeTasks: tasks.filter(t => t.status !== 'DONE').length,
          totalCollected: invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0),
          totalPending: invoices.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + i.amount, 0)
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    { label: 'Total Clients', value: stats.totalClients, color: '#b14b90', suffix: '' },
    { label: 'Unpaid Invoices', value: stats.unpaidInvoices, color: '#f77b24', suffix: '' },
    { label: 'Open Leads', value: stats.openLeads, color: '#ea5580', suffix: '' },
    { label: 'Active Tasks', value: stats.activeTasks, color: '#d45b64', suffix: '' }
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f7f6f4;font-family:'DM Sans',sans-serif}
        .layout{display:flex;min-height:100vh;background:#f7f6f4}
        .main{flex:1;padding:36px 40px;overflow-y:auto}
        .page-header{margin-bottom:32px}
        .page-title{font-family:'Sora',sans-serif;font-size:24px;font-weight:700;color:#1a1a1a}
        .page-sub{font-size:14px;color:#888;margin-top:4px}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
        .stat-card{background:#fff;border-radius:12px;padding:20px 22px;border:1px solid #ececea;border-left:4px solid var(--accent);transition:transform 0.15s}
        .stat-card:hover{transform:translateY(-2px)}
        .stat-label{font-size:11px;color:#888;font-weight:600;letter-spacing:0.4px;margin-bottom:10px;text-transform:uppercase}
        .stat-value{font-family:'Sora',sans-serif;font-size:32px;font-weight:700;color:#1a1a1a}
        .stat-value.loading{font-size:20px;color:#ccc}
        .money-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
        .money-card{background:#fff;border-radius:12px;padding:20px 22px;border:1px solid #ececea}
        .money-label{font-size:11px;color:#888;font-weight:600;letter-spacing:0.4px;margin-bottom:8px;text-transform:uppercase}
        .money-value{font-family:'Sora',sans-serif;font-size:24px;font-weight:700}
        .money-collected{color:#2d8653}
        .money-pending{color:#f77b24}
        .welcome-card{background:#0f0f1a;border-radius:12px;padding:28px 32px;color:#fff;display:flex;align-items:center;justify-content:space-between}
        .welcome-text h2{font-family:'Sora',sans-serif;font-size:18px;font-weight:600;margin-bottom:6px}
        .welcome-text p{font-size:13px;color:rgba(255,255,255,0.5)}
        .welcome-badge{background:rgba(177,75,144,0.2);border:1px solid rgba(177,75,144,0.4);color:#ea5580;padding:6px 16px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:0.5px}
        .quick-links{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .quick-link{background:#fff;border-radius:10px;padding:14px 16px;border:1px solid #ececea;cursor:pointer;text-decoration:none;display:block;transition:all 0.15s}
        .quick-link:hover{border-color:#b14b90;background:#fdf5fb}
        .quick-link-label{font-size:12px;font-weight:600;color:#1a1a1a;margin-bottom:2px}
        .quick-link-sub{font-size:11px;color:#aaa}
        .section-title{font-family:'Sora',sans-serif;font-size:14px;font-weight:600;color:#1a1a1a;margin-bottom:12px}
      `}</style>

      <div className='layout'>
        <Sidebar />
        <main className='main'>
          <PageWrapper>
            <div className='page-header'>
              <h1 className='page-title'>Dashboard</h1>
              <p className='page-sub'>Overview of Vedhaan Technology operations</p>
            </div>

            <div className='stats-grid'>
              {statCards.map((s) => (
                <div key={s.label} className='stat-card' style={{ '--accent': s.color }}>
                  <div className='stat-label'>{s.label}</div>
                  <div className={`stat-value ${loading ? 'loading' : ''}`}>
                    {loading ? '...' : s.value}
                  </div>
                </div>
              ))}
            </div>

            <div className='money-row'>
              <div className='money-card'>
                <div className='money-label'>Total Collected</div>
                <div className='money-value money-collected'>
                  {loading ? '...' : `₹${stats.totalCollected.toLocaleString('en-IN')}`}
                </div>
              </div>
              <div className='money-card'>
                <div className='money-label'>Pending Amount</div>
                <div className='money-value money-pending'>
                  {loading ? '...' : `₹${stats.totalPending.toLocaleString('en-IN')}`}
                </div>
              </div>
            </div>

            <div className='section-title'>Quick Access</div>
            <div className='quick-links'>
              <a href='/clients' className='quick-link'>
                <div className='quick-link-label'>Clients</div>
                <div className='quick-link-sub'>Manage client records</div>
              </a>
              <a href='/invoices' className='quick-link'>
                <div className='quick-link-label'>Invoices</div>
                <div className='quick-link-sub'>Track billing & payments</div>
              </a>
              <a href='/leads' className='quick-link'>
                <div className='quick-link-label'>Leads</div>
                <div className='quick-link-sub'>Follow up on inquiries</div>
              </a>
              <a href='/tasks' className='quick-link'>
                <div className='quick-link-label'>Tasks</div>
                <div className='quick-link-sub'>Team task allocation</div>
              </a>
            </div>

            <div className='welcome-card'>
              <div className='welcome-text'>
                <h2>Hey, {user?.name} 👋</h2>
                <p>You are logged in as {user?.role}. All systems operational.</p>
              </div>
              <div className='welcome-badge'>{user?.role}</div>
            </div>
          </PageWrapper>
        </main>
      </div>
    </>
  )
}

export default Dashboard