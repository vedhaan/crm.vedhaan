import Icon from './Icon'

export function LoadingState({ text = 'Loading...' }) {
  return (
    <div className='v-empty'>
      <span className='v-spinner' />
      <div className='v-empty-s'>{text}</div>
    </div>
  )
}

export default function EmptyState({ icon = 'search', title, text, action }) {
  return (
    <div className='v-empty'>
      <div className='v-empty-ico'><Icon name={icon} size={22} /></div>
      <div className='v-empty-t'>{title}</div>
      {text && <div className='v-empty-s'>{text}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}