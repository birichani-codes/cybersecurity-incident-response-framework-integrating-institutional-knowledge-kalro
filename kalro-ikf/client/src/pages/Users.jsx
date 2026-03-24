import { useState, useEffect } from 'react'
import api from '../api/axios'
import { Loading, fmtDate } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

const ROLES = ['super_admin', 'analyst', 'viewer']

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'analyst', department: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { user: me } = useAuth()

  const load = () => {
    setLoading(true)
    api.get('/auth/users').then(r => setUsers(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditUser(null)
    setForm({ name: '', email: '', password: '', role: 'analyst', department: '' })
    setError(''); setShowModal(true)
  }

  const openEdit = (u) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, department: u.department || '' })
    setError(''); setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      if (editUser) {
        await api.put(`/auth/users/${editUser.id}`, { name: form.name, role: form.role, department: form.department })
        setSuccess('User updated successfully')
      } else {
        await api.post('/auth/users', form)
        setSuccess('User created successfully')
      }
      setShowModal(false); load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (u) => {
    if (u.id === me.id) return alert('You cannot delete your own account.')
    if (!confirm(`Delete user ${u.name}? This cannot be undone.`)) return
    await api.delete(`/auth/users/${u.id}`)
    load()
  }

  const roleColor = { super_admin: 'var(--accent)', analyst: 'var(--green)', viewer: 'var(--yellow)' }
  const roleBg = { super_admin: 'rgba(0,212,255,0.08)', analyst: 'rgba(16,185,129,0.08)', viewer: 'rgba(245,158,11,0.08)' }

  if (loading) return <Loading />

  return (
    <div>
      <div className="page-header">
        <div className="flex-between" style={{ paddingBottom: 20 }}>
          <div>
            <h1>User Management</h1>
            <p>Manage accounts, roles, and access — admin only</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ Add User</button>
        </div>
      </div>

      <div className="page-body">
        {success && <div className="alert alert-success">{success}</div>}

        {/* Role legend */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {ROLES.map(r => (
            <div key={r} style={{
              background: roleBg[r], border: `1px solid ${roleColor[r]}30`,
              borderRadius: 8, padding: '8px 16px', fontSize: 13
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: roleColor[r], fontSize: 12 }}>
                {r.replace('_', ' ')}
              </span>
              <span style={{ color: 'var(--text3)', marginLeft: 8, fontSize: 12 }}>
                {r === 'super_admin' ? 'Full access' : r === 'analyst' ? 'Incidents + Knowledge' : 'Read only'}
              </span>
            </div>
          ))}
        </div>

        {/* Users grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {users.map(u => (
            <div key={u.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Role stripe */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: roleColor[u.role] }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: roleBg[u.role], border: `1px solid ${roleColor[u.role]}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
                    color: roleColor[u.role]
                  }}>
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {u.name}
                      {u.id === me.id && (
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent-glow)', padding: '1px 6px', borderRadius: 3 }}>YOU</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{u.email}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: roleColor[u.role], background: roleBg[u.role],
                  padding: '3px 10px', borderRadius: 999,
                  border: `1px solid ${roleColor[u.role]}30`
                }}>
                  {u.role.replace('_', ' ')}
                </span>
                {u.department && (
                  <span className="tag">{u.department}</span>
                )}
              </div>

              <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
                Joined {fmtDate(u.created_at)}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEdit(u)}>
                  Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ flex: 1, justifyContent: 'center', opacity: u.id === me.id ? 0.4 : 1 }}
                  onClick={() => handleDelete(u)}
                  disabled={u.id === me.id}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editUser ? 'Edit User' : 'Add New User'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Jane Muthoni"
                  required
                />
              </div>

              {!editUser && (
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jane@kalro.org"
                    required
                  />
                </div>
              )}

              {!editUser && (
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    placeholder="e.g. ICT, Research"
                  />
                </div>
              </div>

              {/* Role description */}
              <div style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '10px 14px', marginBottom: 4, fontSize: 13, color: 'var(--text3)'
              }}>
                {form.role === 'super_admin' && '⚡ Full system access — can manage users, view audit logs, and all data.'}
                {form.role === 'analyst' && '◈ Can log incidents, capture knowledge, annotate, and search.'}
                {form.role === 'viewer' && '◎ Read-only access to dashboard and knowledge base.'}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
