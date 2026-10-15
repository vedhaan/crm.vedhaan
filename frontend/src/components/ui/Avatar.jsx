const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

export default function Avatar({ name, src, size = 34 }) {
  return (
    <div className='v-avatar' style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {src ? <img src={src} alt='' /> : initialsOf(name)}
    </div>
  )
}