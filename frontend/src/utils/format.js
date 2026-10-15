export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

export const getMsg = (err, fallback = 'Something went wrong') => err?.response?.data?.message || fallback

export const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}