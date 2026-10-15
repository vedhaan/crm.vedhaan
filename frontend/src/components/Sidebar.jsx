import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from './ui/Icon'
import Avatar from './ui/Avatar'
import { ADMIN_NAV } from './navItems'

const Sidebar = ({ items = ADMIN_NAV, activeKey, onSelect, open = false, onClose = () => {} }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const groups = []
  items.forEach((it) => {
    const name = it.group || ''
    let grp = groups.find((g) => g.name === name)
    if (!grp) {
      grp = { name, items: [] }
      groups.push(grp)
    }
    grp.items.push(it)
  })

  const renderItem = (it) => {
    const inner = (
      <>
        <Icon name={it.icon} size={18} />
        <span className='v-nav-label'>{it.label}</span>
        {it.badge ? <span className='v-nav-badge'>{it.badge}</span> : null}
      </>
    )
    if (it.path) {
      return (
        <NavLink
          key={it.key}
          to={it.path}
          className={({ isActive }) => `v-nav-item${isActive ? ' active' : ''}`}
          onClick={onClose}
        >
          {inner}
        </NavLink>
      )
    }
    return (
      <button
        key={it.key}
        type='button'
        className={`v-nav-item${activeKey === it.key ? ' active' : ''}`}
        onClick={() => {
          if (onSelect) onSelect(it.key)
          onClose()
        }}
      >
        {inner}
      </button>
    )
  }

  return (
    <aside className={`v-sidebar${open ? ' open' : ''}`}>
      <div className='v-brand'>
        <div className='v-logo'>V</div>
        <div>
          <div className='v-brand-name'>Vedhaan<span>Ops</span></div>
          <div className='v-brand-sub'>INTERNAL CRM</div>
        </div>
      </div>

      <nav className='v-nav'>
        {groups.map((g) => (
          <div key={g.name}>
            {g.name && <div className='v-nav-group'>{g.name}</div>}
            {g.items.map(renderItem)}
          </div>
        ))}
      </nav>

      <div className='v-side-foot'>
        <div className='v-side-user'>
          <Avatar name={user?.name} size={34} />
          <div>
            <div className='v-side-name'>{user?.name}</div>
            <div className='v-side-role'>{user?.role}</div>
          </div>
        </div>
        <button type='button' className='v-logout' onClick={handleLogout}>
          <Icon name='logout' size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar