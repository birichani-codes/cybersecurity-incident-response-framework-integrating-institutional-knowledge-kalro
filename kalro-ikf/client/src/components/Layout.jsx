import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '⬡', exact: true },
  { to: '/incidents', label: 'Incidents', icon: '⚡' },
  { to: '/knowledge', label: 'Knowledge Base', icon: '◈' },
  { to: '/search', label: 'Search', icon: '◎' },
]

const ADMIN_NAV = [
  { to: '/reports', label: 'Reports', icon: '▤' },
  { to: '/users', label: 'Users', icon: '◉' },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const roleColor = { super_admin: '#00d4ff', analyst: '#10b981', viewer: '#f59e0b' }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>KALRO</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: 1 }}>IK Framework v1.0</div>
          <div style={{ marginTop: 12, height: 1, background: 'linear-gradient(90deg, var(--accent) 0%, transparent 100%)', opacity: 0.4 }} />
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5, padding: '0 8px', marginBottom: 8 }}>Navigation</div>
          {NAV.map(({ to, label, icon, exact }) => (
            <NavLink
              key={to} to={to} end={exact}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 6,
                fontWeight: 500, fontSize: 14,
                color: isActive ? 'var(--accent)' : 'var(--text2)',
                background: isActive ? 'var(--accent-glow)' : 'transparent',
                marginBottom: 2,
                textDecoration: 'none',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.15s'
              })}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, lineHeight: 1 }}>{icon}</span>
              {label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5, padding: '12px 8px 8px', marginTop: 8, borderTop: '1px solid var(--border)' }}>Admin</div>
              {ADMIN_NAV.map(({ to, label, icon }) => (
                <NavLink
                  key={to} to={to}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 6,
                    fontWeight: 500, fontSize: 14,
                    color: isActive ? 'var(--accent)' : 'var(--text2)',
                    background: isActive ? 'var(--accent-glow)' : 'transparent',
                    marginBottom: 2,
                    textDecoration: 'none',
                    borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all 0.15s'
                  })}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, lineHeight: 1 }}>{icon}</span>
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--bg4)', border: '1px solid var(--border2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 700
            }}>
              {user?.name?.charAt(0)}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: roleColor[user?.role] || 'var(--text3)' }}>{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
