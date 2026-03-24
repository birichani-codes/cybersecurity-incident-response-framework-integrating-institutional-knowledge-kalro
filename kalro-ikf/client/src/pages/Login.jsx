import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally { setLoading(false) }
  }

  const fillDemo = (e, em) => { e.preventDefault(); setEmail(em); setPassword('password') }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden'
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      {/* Glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(0,212,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 4, marginBottom: 6 }}>KALRO</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text3)', letterSpacing: 2, textTransform: 'uppercase' }}>
            Institutional Knowledge Framework
          </div>
          <div style={{ marginTop: 12, height: 1, background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.4 }} />
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 36
        }}>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 15, marginBottom: 24, color: 'var(--text)' }}>
            Sign in to continue
          </h2>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@kalro.org" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8 }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div style={{ marginTop: 20, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Demo Accounts</div>
          {[
            { label: 'Super Admin', email: 'alice@kalro.org', color: 'var(--accent)' },
            { label: 'Analyst', email: 'brian@kalro.org', color: 'var(--green)' },
            { label: 'Viewer', email: 'carol@kalro.org', color: 'var(--yellow)' },
          ].map(({ label, email: em, color }) => (
            <button key={em} onClick={e => fillDemo(e, em)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 12px', marginBottom: 6, cursor: 'pointer',
              color: 'var(--text2)', fontSize: 13, transition: 'border-color 0.15s'
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = color}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontFamily: 'var(--font-mono)', color, fontSize: 12 }}>{label}</span>
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>{em}</span>
            </button>
          ))}
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>All accounts use password: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>password</code></div>
        </div>
      </div>
    </div>
  )
}
