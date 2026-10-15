export default function Ring({ pct = 0, size = 96, stroke = 10, label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const id = `vring${size}`
  return (
    <div className='v-ring' style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={id} x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stopColor='#b14b90' />
            <stop offset='100%' stopColor='#ea5580' />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill='none' strokeWidth={stroke} style={{ stroke: 'var(--ring-track, #eceae6)' }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap='round'
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset .8s ease' }}
        />
      </svg>
      <div className='v-ring-in'>
        <b>{pct}%</b>
        {label && <span>{label}</span>}
      </div>
    </div>
  )
}