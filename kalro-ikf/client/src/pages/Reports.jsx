import { useState, useEffect } from 'react'
import api from '../api/axios'
import { Loading, fmtDate } from '../components/Shared'

export default function Reports() {
  const [summary, setSummary] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    Promise.all([api.get('/reports/summary'), api.get('/audit')]).then(([s, l]) => {
      setSummary(s.data); setLogs(l.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  const ACTION_COLORS = {
    LOGIN: 'var(--accent)', CREATE_INCIDENT: 'var(--orange)', CREATE_KNOWLEDGE: 'var(--green)',
    UPDATE_INCIDENT: 'var(--yellow)', ANNOTATE_KNOWLEDGE: 'var(--purple)', SEARCH: 'var(--text3)',
    CREATE_USER: 'var(--accent)', DELETE_USER: 'var(--red)', RETIRE: 'var(--red)'
  }

  return (
    <div>
      <div className="page-header">
        <h1>Reports & Audit</h1>
        <p>System analytics and full audit trail — admin only</p>
      </div>

      <div className="page-body">
        <div className="tabs">
          <button className={`tab-btn ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
          <button className={`tab-btn ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}>Audit Log ({logs.length})</button>
        </div>

        {tab === 'overview' && summary && (
          <>
            <div className="stats-grid">
              {[
                { label: 'Total Incidents', val: summary.total_incidents, color: 'accent' },
                { label: 'Open / Active', val: summary.open_incidents, color: 'red' },
                { label: 'Resolved', val: summary.resolved_incidents, color: 'green' },
                { label: 'Knowledge Entries', val: summary.total_knowledge, color: 'yellow' },
                { label: 'Active Entries', val: summary.active_knowledge, color: 'purple' },
                { label: 'Avg Confidence', val: `${Math.round(summary.avg_confidence * 100)}%`, color: 'accent' },
                { label: 'Total Users', val: summary.total_users, color: 'green' },
                { label: 'Audit Events', val: summary.total_audit_events, color: 'yellow' },
              ].map(({ label, val, color }) => (
                <div key={label} className={`stat-card ${color}`}>
                  <div className="stat-label">{label}</div>
                  <div className="stat-value">{val}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'audit' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ cursor: 'default' }}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: ACTION_COLORS[log.action] || 'var(--text3)' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text)' }}>{log.user_name}</td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>{log.user_role}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>{log.target_type || '—'}{log.target_id ? ` / ${log.target_id}` : ''}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                        {log.metadata && Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {fmtDate(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
