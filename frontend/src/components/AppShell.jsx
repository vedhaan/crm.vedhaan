import { useState } from 'react'
import Sidebar from './Sidebar'
import Avatar from './ui/Avatar'
import Icon from './ui/Icon'
import { useAuth } from '../context/AuthContext'
import { ADMIN_NAV } from './navItems'

export default function AppShell({ children, items = ADMIN_NAV, activeKey, onSelect }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className='v-app'>
      <Sidebar items={items} activeKey={activeKey} onSelect={onSelect} open={open} onClose={() => setOpen(false)} />
      {open && <div className='v-scrim' onClick={() => setOpen(false)} />}
      <div className='v-main'>
        <header className='v-topbar'>
          <button type='button' className='v-icon-btn v-menu-btn' onClick={() => setOpen(true)} aria-label='Open menu'>
            <Icon name='menu' size={20} />
          </button>
          <div className='v-top-date'>{today}</div>
          <div className='v-top-brand'>Vedhaan<span>Ops</span></div>
          <div className='v-top-sep' />
          <div className='v-top-user'>
            <Avatar name={user?.name} size={32} />
            <div className='v-top-user-text'>
              <div className='v-top-name'>{user?.name}</div>
              <div className='v-top-role'>{user?.role}</div>
            </div>
          </div>
        </header>
        <main className='v-content'>{children}</main>
      </div>
    </div>
  )
}