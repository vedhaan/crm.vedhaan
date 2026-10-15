import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function StatCard({ label, value, hint, icon, tone = 'brand', to, onClick, active, loading }) {
  const body = (
    <>
      <div className='v-stat-top'>
        <span className='v-stat-label'>{label}</span>
        {icon && <span className={`v-stat-ico ${tone}`}><Icon name={icon} size={16} /></span>}
      </div>
      <div className='v-stat-value'>
        {loading ? <span className='v-skel' style={{ width: 64, height: 26 }} /> : value}
      </div>
      {hint && <div className='v-stat-hint'>{hint}</div>}
    </>
  )
  if (to) return <Link to={to} className='v-stat link'>{body}</Link>
  if (onClick) {
    return (
      <button type='button' className={`v-stat pick${active ? ' on' : ''}`} onClick={onClick}>
        {body}
      </button>
    )
  }
  return <div className='v-stat'>{body}</div>
}