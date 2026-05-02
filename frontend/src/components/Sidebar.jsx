import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Clients', path: '/clients' },
  { label: 'Invoices', path: '/invoices' },
  { label: 'Leads', path: '/leads' },
  { label: 'Tasks', path: '/tasks' },
]

const Sidebar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <style>{`
        .sidebar{width:220px;background:#0f0f1a;display:flex;flex-direction:column;min-height:100vh;flex-shrink:0}
        .sb-brand{padding:24px 20px 20px;border-bottom:1px solid rgba(255,255,255,0.07)}
        .sb-logo{font-family:'Sora',sans-serif;font-weight:700;font-size:15px;color:#fff;letter-spacing:-0.3px}
        .sb-logo span{color:#b14b90}
        .sb-sub{font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px;letter-spacing:0.3px}
        .sb-nav{flex:1;padding:16px 10px}
        .sb-section{font-size:10px;color:rgba(255,255,255,0.25);letter-spacing:1px;font-weight:600;padding:0 10px;margin-bottom:6px;margin-top:16px}
        .sb-link{display:flex;align-items:center;padding:9px 12px;border-radius:8px;font-size:13px;font-weight:500;color:rgba(255,255,255,0.55);text-decoration:none;transition:all 0.15s;margin-bottom:2px}
        .sb-link:hover{background:rgba(255,255,255,0.06);color:#fff}
        .sb-link.active{background:rgba(177,75,144,0.18);color:#ea5580}
        .sb-footer{padding:16px 10px;border-top:1px solid rgba(255,255,255,0.07)}
        .sb-user{padding:10px 12px;margin-bottom:4px}
        .sb-user-name{font-size:13px;font-weight:500;color:#fff}
        .sb-user-role{font-size:11px;color:rgba(255,255,255,0.35);margin-top:1px}
        .sb-logout{width:100%;padding:9px 12px;background:rgba(255,255,255,0.05);border:none;border-radius:8px;color:rgba(255,255,255,0.5);font-size:13px;font-family:'DM Sans',sans-serif;cursor:pointer;text-align:left;transition:all 0.15s}
        .sb-logout:hover{background:rgba(234,85,128,0.15);color:#ea5580}
      `}</style>
      <aside className='sidebar'>
        <div className='sb-brand'>
          <div className='sb-logo'>Vedhaan<span>Ops</span></div>
          <div className='sb-sub'>INTERNAL CRM</div>
        </div>
        <nav className='sb-nav'>
          <div className='sb-section'>MENU</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className='sb-footer'>
          <div className='sb-user'>
            <div className='sb-user-name'>{user?.name}</div>
            <div className='sb-user-role'>{user?.role}</div>
          </div>
          <button className='sb-logout' onClick={handleLogout}>Sign out</button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar