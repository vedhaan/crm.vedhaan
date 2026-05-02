import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../api/axios'

const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await API.post('/auth/login', form)
      login(res.data.user, res.data.token)
      navigate(res.data.user.role === 'ADMIN' ? '/dashboard' : '/member')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f7f6f4;font-family:'DM Sans',sans-serif}
        .login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f6f4;padding:20px}
        .login-card{background:#fff;border-radius:16px;padding:48px 40px;width:100%;max-width:420px;border:1px solid #ececea}
        .login-badge{display:inline-flex;align-items:center;gap:8px;background:#0f0f1a;color:#fff;padding:6px 14px;border-radius:999px;font-size:12px;font-family:'Sora',sans-serif;font-weight:600;letter-spacing:0.5px;margin-bottom:28px}
        .login-badge-dot{width:6px;height:6px;border-radius:50%;background:#b14b90}
        .login-title{font-family:'Sora',sans-serif;font-size:26px;font-weight:700;color:#1a1a1a;margin-bottom:6px}
        .login-sub{font-size:14px;color:#888;margin-bottom:36px}
        .login-label{display:block;font-size:12px;font-weight:500;color:#555;margin-bottom:6px;letter-spacing:0.3px}
        .login-input{width:100%;padding:11px 14px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;color:#1a1a1a;background:#fafafa;outline:none;transition:border 0.2s}
        .login-input:focus{border-color:#b14b90;background:#fff}
        .login-field{margin-bottom:18px}
        .login-btn{width:100%;padding:13px;background:linear-gradient(135deg,#b14b90,#ea5580);color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;margin-top:8px;letter-spacing:0.2px;transition:opacity 0.2s}
        .login-btn:hover{opacity:0.92}
        .login-btn:disabled{opacity:0.6;cursor:not-allowed}
        .login-error{background:#fff0f0;border:1px solid #ffd0d0;color:#c0392b;font-size:13px;padding:10px 14px;border-radius:8px;margin-bottom:16px}
        .login-footer{margin-top:28px;padding-top:20px;border-top:1px solid #f0f0f0;text-align:center;font-size:12px;color:#aaa}
      `}</style>
      <div className='login-wrap'>
        <div className='login-card'>
          <div className='login-badge'>
            <span className='login-badge-dot'></span>
            VEDHAAN TECHNOLOGY
          </div>
          <h1 className='login-title'>Welcome back</h1>
          <p className='login-sub'>Sign in to Vedhaan Ops — Internal CRM</p>

          {error && <div className='login-error'>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className='login-field'>
              <label className='login-label'>EMAIL ADDRESS</label>
              <input
                className='login-input'
                type='email'
                name='email'
                placeholder='you@vedhaan.com'
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className='login-field'>
              <label className='login-label'>PASSWORD</label>
              <input
                className='login-input'
                type='password'
                name='password'
                placeholder='••••••••'
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            <button className='login-btn' type='submit' disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className='login-footer'>Internal use only · Vedhaan Technology</div>
        </div>
      </div>
    </>
  )
}

export default Login