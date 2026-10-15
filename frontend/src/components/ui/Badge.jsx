export default function Badge({ tone = 'grey', dot = false, children }) {
  return (
    <span className={`v-badge ${tone}`}>
      {dot && <i className='v-badge-dot' />}
      {children}
    </span>
  )
}