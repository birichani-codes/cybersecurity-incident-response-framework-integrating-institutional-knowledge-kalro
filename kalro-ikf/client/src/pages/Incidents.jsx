import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Badge, Loading, EmptyState, timeAgo } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

const TYPES = ['phishing','ransomware','ddos','unauthorized_access','malware','data_exfiltration','other']
const SEVERITIES = ['critical','high','medium','low']

export default function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({ status: '', severity: '', type: '' })
  const [form, setForm] = useState({ title: '', type: 'phishing', severity: 'medium', description: '', entities: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { isAnalyst } = useAuth()

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.severity) params.set('severity', filters.severity)
    if (filters.type) params.set('type', filters.type)
    api.get(`/incidents?${params}`).then(r => setIncidents(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filters])

  const handleCreate = async (e) => {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      let entities = {}
      if (form.entities) {
        const ips = form.entities.split(',').map(s => s.trim()).filter(Boolean)
        entities = { ips }
      }
      await api.post('/incidents', { ...form, entities })
      setShowModal(false)
      setForm({ title: '', type: 'phishing', severity: 'medium', description: '', entities: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create incident')
    } finally { setSubmitting(false) }
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex-between" style={{ paddingBottom: 20 }}>
          <div>
            <h1>Incidents</h1>
            <p>Track, investigate, and resolve security incidents</p>
          </div>
          {isAnalyst && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Log Incident</button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { key: 'status', opts: ['', 'open', 'investigating', 'escalated', 'resolved', 'closed'], label: 'All Statuses' },
            { key: 'severity', opts: ['', ...SEVERITIES], label: 'All Severities' },
            { key: 'type', opts: ['', ...TYPES], label: 'All Types' },
          ].map(({ key, opts, label }) => (
            <select key={key} value={filters[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
              style={{ width: 'auto', minWidth: 150 }}>
              <option value="">{label}</option>
              {opts.filter(Boolean).map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
            </select>
          ))}
          {Object.values(filters).some(Boolean) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', severity: '', type: '' })}>
              Clear
            </button>
          )}
        </div>

        {loading ? <Loading /> : incidents.length === 0 ? (
          <EmptyState icon="⚡" title="No incidents found" sub="Try changing your filters or log a new incident" />
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Reported By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map(inc => (
                    <tr key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}>
                      <td style={{ color: 'var(--text)', fontWeight: 500, maxWidth: 260 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.title}</div>
                      </td>
                      <td><span className="tag">{inc.type?.replace(/_/g, ' ')}</span></td>
                      <td><Badge value={inc.severity} /></td>
                      <td><Badge value={inc.status} /></td>
                      <td>{inc.reporter_name}</td>
                      <td style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{timeAgo(inc.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Log New Incident</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief description of the incident" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Severity *</label>
                  <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed description of what happened..." />
              </div>
              <div className="form-group">
                <label className="form-label">Affected IPs / Hosts (comma-separated)</label>
                <input value={form.entities} onChange={e => setForm(f => ({ ...f, entities: e.target.value }))} placeholder="192.168.1.1, ws-admin-01" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Logging...' : 'Log Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
