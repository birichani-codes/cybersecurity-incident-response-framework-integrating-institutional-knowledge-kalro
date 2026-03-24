import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Badge, Tags, ConfidenceBadge, Loading, fmtDate } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

export default function KnowledgeDetail() {
  const { id } = useParams()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [annotating, setAnnotating] = useState(false)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [vForm, setVForm] = useState({ title: '', content: '', tags: '' })
  const [vSubmitting, setVSubmitting] = useState(false)
  const navigate = useNavigate()
  const { isAnalyst } = useAuth()

  const load = () => {
    setLoading(true)
    api.get(`/knowledge/${id}`).then(r => setEntry(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const handleUse = async () => {
    await api.post(`/knowledge/${id}/use`)
    load()
  }

  const handleAnnotate = async (e) => {
    e.preventDefault(); setAnnotating(true)
    await api.post(`/knowledge/${id}/annotate`, { note })
    setNote(''); load(); setAnnotating(false)
  }

  const handleRetire = async () => {
    if (!confirm('Retire this entry? It will be archived but not deleted.')) return
    await api.put(`/knowledge/${id}`, { status: 'retired' })
    load()
  }

  const handleNewVersion = async (e) => {
    e.preventDefault(); setVSubmitting(true)
    const tags = vForm.tags.split(',').map(t => t.trim()).filter(Boolean)
    const res = await api.put(`/knowledge/${id}`, {
      new_version: true,
      title: vForm.title || entry.title,
      content: vForm.content || entry.content,
      tags: tags.length ? tags : entry.tags
    })
    setShowVersionModal(false)
    navigate(`/knowledge/${res.data.id}`)
    setVSubmitting(false)
  }

  if (loading) return <Loading />
  if (!entry) return <div className="page-body"><div className="alert alert-error">Entry not found</div></div>

  return (
    <div>
      <div className="page-header">
        <div style={{ paddingBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
            <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => navigate('/knowledge')}>Knowledge</span>
            {' / '}{entry.id}
          </div>
          <div className="flex-between">
            <div>
              <h1 style={{ marginBottom: 8 }}>{entry.title}</h1>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                <Badge value={entry.status} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text3)' }}>v{entry.version}</span>
                <Tags tags={entry.tags} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={handleUse}>Mark as Used</button>
              {isAnalyst && entry.status === 'active' && (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setVForm({ title: entry.title, content: entry.content, tags: entry.tags.join(', ') }); setShowVersionModal(true) }}>
                    New Version
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={handleRetire}>Retire</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          {/* Main */}
          <div>
            {/* Confidence */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Confidence Score</div>
                  <ConfidenceBadge score={entry.confidence_score} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginBottom: 4 }}>Times Used</div>
                  <div style={{ fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{entry.use_count}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginBottom: 4 }}>Last Used</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{fmtDate(entry.last_used_at)}</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-header"><h2>Knowledge Content</h2></div>
              <div className="knowledge-content">{entry.content}</div>
            </div>

            {/* Annotations */}
            <div className="card">
              <div className="section-header">
                <h2>Annotations ({entry.annotations?.length || 0})</h2>
              </div>
              {entry.annotations?.length === 0 && (
                <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 16 }}>No annotations yet. Be the first to add context.</p>
              )}
              {entry.annotations?.map(a => (
                <div key={a.id} className="annotation">
                  <div className="annotation-meta">{a.user_name} · {fmtDate(a.created_at)}</div>
                  <p>{a.note}</p>
                </div>
              ))}
              {isAnalyst && (
                <form onSubmit={handleAnnotate} style={{ marginTop: 16 }}>
                  <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Add context, corrections, or lessons from using this entry..." style={{ marginBottom: 8 }} />
                  <button type="submit" className="btn btn-ghost btn-sm" disabled={!note.trim() || annotating}>
                    {annotating ? 'Adding...' : '+ Add Annotation'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Details</div>
              {[
                { label: 'Contributor', val: entry.contributor_name },
                { label: 'Version', val: `v${entry.version}` },
                { label: 'Status', val: entry.status },
                { label: 'Created', val: fmtDate(entry.created_at) },
                { label: 'Linked Incident', val: entry.incident_id || '—' },
              ].map(({ label, val }) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, color: 'var(--text)' }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Version history */}
            {entry.version_history?.length > 1 && (
              <div className="card">
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Version History</div>
                {entry.version_history.map(v => (
                  <div key={v.id} onClick={() => navigate(`/knowledge/${v.id}`)}
                    style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', opacity: v.id === entry.id ? 1 : 0.6 }}>
                    <div style={{ fontSize: 13, color: v.id === entry.id ? 'var(--accent)' : 'var(--text)' }}>v{v.version} {v.id === entry.id && '(current)'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{fmtDate(v.created_at)}</div>
                    <Badge value={v.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Version Modal */}
      {showVersionModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowVersionModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2>Create New Version</h2>
              <button className="modal-close" onClick={() => setShowVersionModal(false)}>×</button>
            </div>
            <div className="alert alert-info">This will create v{entry.version + 1} and mark the current entry as superseded.</div>
            <form onSubmit={handleNewVersion}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input value={vForm.title} onChange={e => setVForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea rows={8} value={vForm.content} onChange={e => setVForm(f => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input value={vForm.tags} onChange={e => setVForm(f => ({ ...f, tags: e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowVersionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={vSubmitting}>
                  {vSubmitting ? 'Creating...' : 'Create v' + (entry.version + 1)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
