import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Badge, ConfidenceBadge, Tags, Loading, EmptyState, fmtDate } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

export default function Knowledge() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', tags: '', incident_id: '' })
  const [incidents, setIncidents] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const navigate = useNavigate()
  const { isAnalyst } = useAuth()

  const load = () => {
    setLoading(true)
    const params = statusFilter ? `?status=${statusFilter}` : ''
    api.get(`/knowledge${params}`).then(r => setEntries(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter])
  useEffect(() => { api.get('/incidents').then(r => setIncidents(r.data)) }, [])

  const handleCreate = async (e) => {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      await api.post('/knowledge', { ...form, tags })
      setShowModal(false)
      setForm({ title: '', content: '', tags: '', incident_id: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create entry')
    } finally { setSubmitting(false) }
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex-between" style={{ paddingBottom: 20 }}>
          <div>
            <h1>Knowledge Base</h1>
            <p>Institutional knowledge captured from incidents</p>
          </div>
          {isAnalyst && <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Entry</button>}
        </div>
      </div>

      <div className="page-body">
        {/* Filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {['', 'active', 'superseded', 'retired'].map(s => (
            <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(s)}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {loading ? <Loading /> : entries.length === 0 ? (
          <EmptyState icon="◈" title="No knowledge entries" sub="Start capturing institutional knowledge from resolved incidents." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {entries.map(k => (
              <div key={k.id} className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                onClick={() => navigate(`/knowledge/${k.id}`)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div className="flex-between mb-2">
                  <div style={{ flex: 1, paddingRight: 12 }}>
                    <h3 style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{k.title}</h3>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>by {k.contributor_name} · v{k.version} · used {k.use_count}×</div>
                  </div>
                  <Badge value={k.status} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <ConfidenceBadge score={k.confidence_score} />
                </div>
                <Tags tags={k.tags} />
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {k.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2>Add Knowledge Entry</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Ransomware Containment Playbook" required />
              </div>
              <div className="form-group">
                <label className="form-label">Content *</label>
                <textarea rows={8} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Document the steps, lessons learned, mitigation techniques..." required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="phishing, email, credentials" />
                </div>
                <div className="form-group">
                  <label className="form-label">Link to Incident (optional)</label>
                  <select value={form.incident_id} onChange={e => setForm(f => ({ ...f, incident_id: e.target.value }))}>
                    <option value="">— None —</option>
                    {incidents.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
