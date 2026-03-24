import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { Badge, Tags, ConfidenceBadge, Loading, fmtDate } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['open','investigating','escalated','resolved','closed']

export default function IncidentDetail() {
  const { id } = useParams()
  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const navigate = useNavigate()
  const { isAnalyst } = useAuth()

  const load = () => {
    api.get(`/incidents/${id}`).then(r => setIncident(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const updateStatus = async (status) => {
    setUpdating(true)
    await api.put(`/incidents/${id}`, { status })
    load()
    setUpdating(false)
  }

  if (loading) return <Loading />
  if (!incident) return <div className="page-body"><div className="alert alert-error">Incident not found</div></div>

  const entitiesFlat = Object.entries(incident.entities || {}).flatMap(([k, v]) =>
    Array.isArray(v) ? v.map(val => ({ type: k, val })) : [{ type: k, val: v }]
  )

  return (
    <div>
      <div className="page-header">
        <div style={{ paddingBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
            <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => navigate('/incidents')}>Incidents</span>
            {' / '}#{incident.id}
          </div>
          <div className="flex-between">
            <div>
              <h1 style={{ marginBottom: 8 }}>{incident.title}</h1>
              <div className="flex gap-2">
                <Badge value={incident.severity} />
                <Badge value={incident.status} />
                <span className="tag">{incident.type?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          {/* Main */}
          <div>
            {/* Description */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="section-header"><h2>Description</h2></div>
              <p style={{ color: 'var(--text2)', lineHeight: 1.8, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                {incident.description || <span className="text-muted">No description provided.</span>}
              </p>
            </div>

            {/* Entities */}
            {entitiesFlat.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="section-header"><h2>Affected Entities</h2></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {entitiesFlat.map(({ type, val }, i) => (
                    <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px' }}>
                      <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginRight: 6 }}>{type}:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Knowledge */}
            <div className="card">
              <div className="section-header">
                <h2>Related Knowledge</h2>
                <Link to="/knowledge/new" className="btn btn-ghost btn-sm">+ Capture Knowledge</Link>
              </div>
              {incident.related_knowledge?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>◈</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 6 }}>No matching knowledge found</div>
                  <div style={{ fontSize: 13 }}>This incident may be escalated — consider capturing new knowledge after resolution.</div>
                </div>
              ) : (
                incident.related_knowledge?.map(k => (
                  <div key={k.id} onClick={() => navigate(`/knowledge/${k.id}`)}
                    style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                    <div className="flex-between mb-1">
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{k.title}</span>
                      <Badge value={k.status} />
                    </div>
                    <ConfidenceBadge score={k.confidence_score} />
                    <Tags tags={k.tags} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Status update */}
            {isAnalyst && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Update Status</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => updateStatus(s)} disabled={updating || incident.status === s}
                      className={`btn btn-sm ${incident.status === s ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ justifyContent: 'flex-start' }}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="card">
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Details</div>
              {[
                { label: 'Reported by', val: incident.reporter_name },
                { label: 'Assigned to', val: incident.assignee_name },
                { label: 'Logged', val: fmtDate(incident.created_at) },
                { label: 'Updated', val: fmtDate(incident.updated_at) },
                { label: 'ID', val: incident.id },
              ].map(({ label, val }) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, color: 'var(--text)' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
