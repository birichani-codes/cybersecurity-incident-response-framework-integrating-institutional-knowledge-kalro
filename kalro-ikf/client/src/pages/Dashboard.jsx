import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Badge, Loading, timeAgo, SlaIndicator } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

const SEV = {
  critical: 'var(--kalro-red-light)',
  high: 'var(--orange)',
  medium: 'var(--yellow)',
  low: 'var(--green)'
}

function CoverageBar({ rate }) {
  const color =
    rate >= 80
      ? 'var(--kalro-green)'
      : rate >= 50
      ? 'var(--yellow)'
      : 'var(--kalro-red)'

  const label =
    rate >= 80 ? 'Good' : rate >= 50 ? 'At risk' : 'Critical'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: 'var(--bg4)', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            width: `${rate || 0}%`,
            height: '100%',
            background: color,
            borderRadius: 4,
            transition: 'width 0.6s ease'
          }}
        />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color, minWidth: 36 }}>
        {rate || 0}%
      </span>
      <span
        style={{
          fontSize: 12,
          color,
          background: color + '22',
          padding: '2px 8px',
          borderRadius: 4,
          border: '1px solid ' + color + '44'
        }}
      >
        {label}
      </span>
    </div>
  )
}

function ConfPip({ score = 0 }) {
  const pct = Math.round((score || 0) * 100)
  const color =
    pct >= 80
      ? 'var(--kalro-green)'
      : pct >= 50
      ? 'var(--yellow)'
      : 'var(--kalro-red-light)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 4, background: 'var(--bg4)', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color }}>{pct}%</span>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    api
      .get('/reports/dashboard')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  // ✅ SAFE FALLBACK (THIS FIXES YOUR CRASHES)
  const {
    summary = {},
    coverage_rate = 0,
    uncovered_gaps = [],
    weak_entries = [],
    escalated_incidents = [],
    major_incidents = [],
    sla_breached = [],
    recent_incidents = [],
    top_knowledge = [],
    metrics = {},
    by_severity = {},
    by_status = {},
    gaps = []
  } = data || {}

  const hov = e => (e.currentTarget.style.paddingLeft = '6px')
  const hout = e => (e.currentTarget.style.paddingLeft = '0')

  const row = {
    padding: '11px 0',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'padding 0.15s'
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>
          Welcome back, {user?.name} —{' '}
          {new Date().toLocaleDateString('en-KE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </div>

      <div className="page-body">

        {/* Major incidents */}
        {major_incidents.length > 0 && (
          <div className="alert-major" style={{ borderRadius: 'var(--radius)', padding: 14, marginBottom: 20 }}>
            ⚠ {major_incidents.length} MAJOR INCIDENT(S) ACTIVE
          </div>
        )}

        {/* SLA alerts */}
        {sla_breached.length > 0 && (
          <div className="alert alert-error">
            ⏱ {sla_breached.length} SLA breach(es)
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card green" onClick={() => navigate('/incidents')}>
            <div>Total Incidents</div>
            <div>{summary.total_incidents || 0}</div>
          </div>

          <div className="stat-card red" onClick={() => navigate('/incidents?is_major=true')}>
            <div>Major Incidents</div>
            <div>{summary.major_incidents || 0}</div>
          </div>

          <div className="stat-card orange">
            <div>SLA Breached</div>
            <div>{sla_breached.length}</div>
          </div>

          <div className="stat-card accent">
            <div>Knowledge</div>
            <div>{summary.active_knowledge || 0}</div>
          </div>

          <div className="stat-card yellow">
            <div>PIR Completion</div>
            <div>{summary.pir_completion_rate || 0}%</div>
          </div>

          <div className="stat-card green">
            <div>Avg Confidence</div>
            <div>{Math.round((summary.avg_confidence || 0) * 100)}%</div>
          </div>
        </div>

        {/* Coverage */}
        <div className="card">
          <CoverageBar rate={coverage_rate} />
        </div>

        {/* Knowledge gaps */}
        <div className="card">
          <h2>Knowledge Gaps</h2>

          {uncovered_gaps.length === 0 ? (
            <div>✓ All covered</div>
          ) : (
            uncovered_gaps.map(g => (
              <div key={g.type} style={row} onClick={() => navigate('/knowledge')}>
                <div>{g.type}</div>
                <div>{g.incident_count}</div>
              </div>
            ))
          )}
        </div>

        {/* Weak entries */}
        <div className="card">
          <h2>Needs Review</h2>

          {weak_entries.length === 0 ? (
            <div>✓ Healthy</div>
          ) : (
            weak_entries.map(k => (
              <div key={k.id} style={row} onClick={() => navigate('/knowledge/' + k.id)}>
                <div>{k.title}</div>
                <ConfPip score={k.confidence_score} />
              </div>
            ))
          )}
        </div>

        {/* Recent */}
        <div className="card">
          <h2>Recent Incidents</h2>

          {recent_incidents.map(inc => (
            <div key={inc.id} style={row} onClick={() => navigate('/incidents/' + inc.id)}>
              {inc.title}
            </div>
          ))}
        </div>

        {/* Top knowledge */}
        <div className="card">
          <h2>Top Knowledge</h2>

          {top_knowledge.map(k => (
            <div key={k.id} style={row} onClick={() => navigate('/knowledge/' + k.id)}>
              {k.title}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}