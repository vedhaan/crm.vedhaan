export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className='v-page-head'>
      <div>
        <h1 className='v-title'>{title}</h1>
        {subtitle && <p className='v-subtitle'>{subtitle}</p>}
      </div>
      {actions && <div className='v-actions'>{actions}</div>}
    </div>
  )
}