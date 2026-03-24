import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Badge, Tags, ConfidenceBadge } from '../components/Shared'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('all')
  const inputRef = useRef()
  const navigate = useNavigate()

  const doSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim() || query.length < 2) return
    setLoading(true)
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query)}&type=${type}`)
      setResults(res.data)
    } catch {}
    finally { setLoading(false) }
  }

  const handleKey = (e) => { if (e.key === 'Enter') doSearch() }

  return (
    <div>
      <div className="page-header">
        <h1>Search</h1>
        <p>Search across incidents and the institutional knowledge base</p>
      </div>

      <div className="page-body">
        {/* Search bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>◎</span>
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
                placeholder="Search incidents, knowledge entries, tags..."
                style={{ paddingLeft: 40, fontSize: 16, padding: '14px 14px 14px 42px' }} />
            </div>
            <button className="btn btn-primary" onClick={doSearch} disabled={loading} style={{ minWidth: 100, justifyContent: 'center' }}>
              {loading ? '...' : 'Search'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'knowledge', 'incident'].map(t => (
              <button key={t} className={`btn btn-sm ${type === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setType(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {results === null && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>◎</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, marginBottom: 8 }}>Search the knowledge base</div>
            <div style={{ fontSize: 13 }}>Try: "phishing", "ransomware recovery", "DDoS", "credentials"</div>
          </div>
        )}

        {results?.total === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>◎</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text2)', marginBottom: 8 }}>No results for "{results.query}"</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Consider capturing knowledge from a related incident.</div>
          </div>
        )}

        {results?.total > 0 && (
          <>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginBottom: 16 }}>
              {results.total} result{results.total !== 1 ? 's' : ''} for "<span style={{ color: 'var(--accent)' }}>{results.query}</span>"
            </div>
            {results.results.map(r => (
              <div key={r.id} className="search-result"
                onClick={() => navigate(r.result_type === 'knowledge' ? `/knowledge/${r.id}` : `/incidents/${r.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div className="result-type">{r.result_type === 'knowledge' ? '◈ Knowledge Entry' : '⚡ Incident'}</div>
                    <h3>{r.title}</h3>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    {r.result_type === 'knowledge'
                      ? <ConfidenceBadge score={r.relevance_score} />
                      : <Badge value={r.severity} />
                    }
                  </div>
                </div>
                <p>{r.result_type === 'knowledge' ? r.content : r.description}</p>
                {r.tags?.length > 0 && <div style={{ marginTop: 8 }}><Tags tags={r.tags} /></div>}
                {r.result_type === 'knowledge' && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
                    by {r.contributor_name} · used {r.use_count}×
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
