import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../api/axios'
import Icon from '../components/ui/Icon'
import { getMsg } from '../utils/format'

const POINTS = ['Clients, invoices and leads in one place', 'Daily work sheet with deadlines and proof', 'Built for the Vedhaan team']

const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await API.post('/auth/login', form)
      login(res.data.user, res.data.token)
      navigate(res.data.user.role === 'ADMIN' ? '/dashboard' : '/member')
    } catch (err) {
      setError(getMsg(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='v-login'>
      <aside className='v-login-side'>
        <div className='v-brand' style={{ padding: 0 }}>
          <div className='v-logo'>V</div>
          <div>
            <div className='v-brand-name'>Vedhaan<span>Ops</span></div>
            <div className='v-brand-sub'>INTERNAL CRM</div>
          </div>
        </div>
        <div>
          <h2 className='v-login-h'>Run the whole day from one place.</h2>
          <p className='v-login-p'>Everything the Vedhaan team needs, from the first lead to the last invoice.</p>
          <ul className='v-login-points'>
            {POINTS.map((p) => (
              <li key={p}>
                <span className='v-tile'><Icon name='check' size={14} /></span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className='v-login-foot'>Internal use only · Vedhaan Technology</div>
      </aside>

      <main className='v-login-main'>
        <div className='v-login-card'>
          <h1 className='v-login-title'>Welcome back</h1>
          <p className='v-login-sub'>Sign in to continue to VedhaanOps.</p>

          {error && <div className='v-alert err'>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className='v-field'>
              <label className='v-label'>Email address</label>
              <input className='v-input' type='email' name='email' placeholder='you@vedhaan.com' value={form.email} onChange={handleChange} autoComplete='username' required />
            </div>
            <div className='v-field'>
              <label className='v-label'>Password</label>
              <div className='v-pw'>
                <input className='v-input' type={show ? 'text' : 'password'} name='password' placeholder='Your password' value={form.password} onChange={handleChange} autoComplete='current-password' required />
                <button type='button' className='v-icon-btn v-pw-toggle' onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
                  <Icon name={show ? 'eye-off' : 'eye'} size={17} />
                </button>
              </div>
            </div>
            <button type='submit' className='v-btn primary block' style={{ padding: 12, marginTop: 6 }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default Login