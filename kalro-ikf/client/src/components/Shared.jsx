export const Badge = ({ value, type }) => {
  const cls = `badge badge-${type || value?.toLowerCase().replace(/\s+/g, '-')}`
  return <span className={cls}>{value}</span>
}

export const ConfidenceBadge = ({ score }) => {
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)'
  return (
    <div className="confidence-bar">
      <div className="confidence-bar-track">
        <div className="confidence-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color, minWidth: 30 }}>{pct}%</span>
    </div>
  )
}

export const Tags = ({ tags = [] }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
    {tags.map(t => <span key={t} className="tag">{t}</span>)}
  </div>
)

export const Loading = () => (
  <div className="loading"><div className="spinner" /><span>Loading...</span></div>
)

export const EmptyState = ({ icon = '◈', title, sub }) => (
  <div className="empty-state">
    <div className="empty-icon">{icon}</div>
    <h3>{title}</h3>
    {sub && <p style={{ fontSize: 14 }}>{sub}</p>}
  </div>
)

export const timeAgo = (dateStr) => {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr)
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export const fmtDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}
