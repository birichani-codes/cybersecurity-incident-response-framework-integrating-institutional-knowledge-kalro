import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Badge, Loading, timeAgo, fmtDate } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [knowledge, setKnowledge] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    Promise.all([
      api.get('/incidents/stats'),
      api.get('/incidents?limit=5'),
      api.get('/knowledge?limit=5')
    ]).then(([s, i, k]) => {
      setStats(s.data)
      setIncidents(i.data.slice(0, 6))
      setKnowledge(k.data.slice(0, 5))
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  const severityColors = { critical: 'var(--red)', high: 'var(--orange)', medium: 'var(--yellow)', low: 'var(--green)' }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.name} — here's the current security posture</p>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card accent">
            <div className="stat-label">Total Incidents</div>
            <div className="stat-value">{stats?.total || 0}</div>
            <div className="stat-sub">{stats?.by_status?.open || 0} open</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Active / Escalated</div>
            <div className="stat-value">{(stats?.by_status?.open || 0) + (stats?.by_status?.escalated || 0) + (stats?.by_status?.investigating || 0)}</div>
            <div className="stat-sub">{stats?.by_status?.escalated || 0} escalated</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Resolved</div>
            <div className="stat-value">{stats?.by_status?.resolved || 0}</div>
            <div className="stat-sub">incidents closed</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-label">Knowledge Entries</div>
            <div className="stat-value">{knowledge.length}</div>
            <div className="stat-sub">active entries</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Critical</div>
            <div className="stat-value">{stats?.by_severity?.critical || 0}</div>
            <div className="stat-sub">critical severity</div>
          </div>
        </div>

        {/* Severity breakdown */}
        {stats?.by_severity && (
          <div className="card mb-4" style={{ marginBottom: 20 }}>
            <div className="section-header"><h2>Severity Breakdown</h2></div>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(stats.by_severity).map(([sev, count]) => (
                <div key={sev} style={{
                  flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '12px 16px', borderTop: `2px solid ${severityColors[sev] || 'var(--border)'}`
                }}>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{sev}</div>
                  <div style={{ fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 700, color: severityColors[sev] }}>{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recent Incidents */}
          <div className="card">
            <div className="section-header">
              <h2>Recent Incidents</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/incidents')}>View all</button>
            </div>
            {incidents.length === 0 ? <div className="text-muted text-sm">No incidents yet.</div> :
              incidents.map(inc => (
                <div key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}
                  style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.paddingLeft = '6px'}
                  onMouseLeave={e => e.currentTarget.style.paddingLeft = '0'}
                >
                  <div className="flex-between mb-1" style={{ transition: 'padding 0.15s' }}>
                    <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>{inc.title}</span>
                    <Badge value={inc.severity} />
                  </div>
                  <div className="flex gap-2" style={{ fontSize: 12, color: 'var(--text3)' }}>
                    <Badge value={inc.status} />
                    <span>·</span>
                    <span>{timeAgo(inc.created_at)}</span>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Top Knowledge */}
          <div className="card">
            <div className="section-header">
              <h2>Top Knowledge Entries</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/knowledge')}>View all</button>
            </div>
            {knowledge.length === 0 ? <div className="text-muted text-sm">No knowledge entries yet.</div> :
              knowledge.map(k => (
                <div key={k.id} onClick={() => navigate(`/knowledge/${k.id}`)}
                  style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>{k.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 3, background: 'var(--bg4)', borderRadius: 2 }}>
                      <div style={{ width: `${Math.round(k.confidence_score * 100)}%`, height: '100%', borderRadius: 2, background: k.confidence_score > 0.8 ? 'var(--green)' : k.confidence_score > 0.5 ? 'var(--yellow)' : 'var(--red)' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', minWidth: 30 }}>
                      {Math.round(k.confidence_score * 100)}%
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>used {k.use_count}×</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
