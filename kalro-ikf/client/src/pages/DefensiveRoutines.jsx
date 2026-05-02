/**
 * DefensiveRoutines Page
 * Browse and manage organizational defensive routines
 */

import { useState, useEffect } from 'react'
import api from '../api/axios'
import { Loading, Badge } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

export default function DefensiveRoutines() {
  const { user, isAdmin } = useAuth();
  const [routines, setRoutines] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [pirs, setPirs] = useState([]);
  const [selectedPir, setSelectedPir] = useState(null);
  const [editorStatus, setEditorStatus] = useState('');
  const [editorError, setEditorError] = useState('');
  const [savingEditor, setSavingEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('routines');
  const [editorForm, setEditorForm] = useState({
    title:'',
    content:'',
    category:'response-checklist',
    primary_goal:'',
    payoff_weight:0.6,
    nist_function:'PR',
    associated_scripts:'',
    institutional_enablers:'',
    socio_technical_focus:'technical',
    success_rate:0.5,
    times_applied:0,
    applicable_incident_types:'',
    prerequisites:'',
    estimated_cost:'',
    estimated_time_to_resolve:'',
    routine_signature:''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [routinesRes, metricsRes, coverageRes] = await Promise.all([
        api.get('/knowledge/defensive-routines/list'),
        api.get('/knowledge/defensive-routines/metrics'),
        api.get('/knowledge/defensive-routines/coverage')
      ]);

      setRoutines(routinesRes.data);
      setMetrics(metricsRes.data);
      setCoverage(coverageRes.data);

      if (isAdmin) {
        const pirsRes = await api.get('/pir');
        setPirs(pirsRes.data);
      }
    } catch(err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div style={{padding:20}}>
      {/* Header */}
      <div style={{marginBottom:32}}>
        <h1 style={{fontFamily:'var(--font-mono)',fontSize:28,marginBottom:8,color:'var(--text)'}}>
          Defensive Routines Library
        </h1>
        <p style={{color:'var(--text3)',fontSize:14}}>
          Institutional knowledge repository for responding to security incidents
        </p>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:16,marginBottom:32}}>
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:20}}>
            <div style={{fontSize:12,color:'var(--text3)',fontFamily:'var(--font-mono)',marginBottom:8}}>TOTAL ROUTINES</div>
            <div style={{fontSize:32,fontWeight:700,color:'var(--kalro-green)'}}>{metrics.total_routines}</div>
          </div>

          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:20}}>
            <div style={{fontSize:12,color:'var(--text3)',fontFamily:'var(--font-mono)',marginBottom:8}}>AVG SUCCESS RATE</div>
            <div style={{fontSize:32,fontWeight:700,color:'var(--kalro-green)'}}>{metrics.avg_success_rate}%</div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:8}}>
              {metrics.highly_effective} highly effective | {metrics.moderately_effective} moderate | {metrics.needs_improvement} need review
            </div>
          </div>

          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:20}}>
            <div style={{fontSize:12,color:'var(--text3)',fontFamily:'var(--font-mono)',marginBottom:8}}>COVERAGE</div>
            <div style={{fontSize:32,fontWeight:700,color:'var(--accent)'}}>{coverage?.incident_types_covered || 0}</div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:8}}>
              incident types covered
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:16,borderBottom:'1px solid var(--border)',marginBottom:24}}>
        {[
          { id: 'routines', label: '📚 All Routines' },
          { id: 'best-performing', label: '⭐ Best Performing' },
          { id: 'coverage', label: '🎯 Coverage' },
          ...(isAdmin ? [{ id: 'editor', label: '✍️ Routine Editor' }] : [])
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--kalro-green)' : 'none',
              color: tab === t.id ? 'var(--kalro-green)' : 'var(--text3)',
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'routines' && routines && (
        <div style={{display:'grid',gap:16}}>
          {routines.map(routine => (
            <div
              key={routine.id}
              style={{
                background:'var(--bg2)',
                border:'1px solid var(--border)',
                borderRadius:'var(--radius-lg)',
                padding:20,
                transition:'all 0.2s',
                cursor:'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--kalro-green)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div>
                  <h4 style={{fontSize:16,fontWeight:600,color:'var(--text)',margin:0,marginBottom:4}}>
                    {routine.title}
                  </h4>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <Badge label={routine.knowledge_type} bg="var(--accent)" />
                    <Badge label={routine.category || 'general'} bg="var(--kalro-green)" />
                    <Badge label={routine.contributor_name} bg="var(--bg3)" />
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--font-mono)'}}>SUCCESS RATE</div>
                  <div style={{
                    fontSize:24,
                    fontWeight:700,
                    color: routine.success_rate >= 0.85 ? 'var(--kalro-green)' : routine.success_rate >= 0.6 ? 'var(--yellow)' : 'var(--kalro-red)',
                    fontFamily:'var(--font-mono)'
                  }}>
                    {(routine.success_rate * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:12,fontSize:12,marginBottom:12}}>
                <div>
                  <div style={{color:'var(--text3)',fontFamily:'var(--font-mono)',fontSize:10,marginBottom:4}}>Applied</div>
                  <div style={{color:'var(--text)',fontWeight:600}}>{routine.times_applied} times</div>
                </div>
                <div>
                  <div style={{color:'var(--text3)',fontFamily:'var(--font-mono)',fontSize:10,marginBottom:4}}>Confidence</div>
                  <div style={{color:'var(--kalro-green)',fontWeight:600}}>{(routine.confidence_score * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div style={{color:'var(--text3)',fontFamily:'var(--font-mono)',fontSize:10,marginBottom:4}}>Last Used</div>
                  <div style={{color:'var(--text)',fontWeight:600}}>
                    {routine.last_used_at ? new Date(routine.last_used_at).toLocaleDateString() : 'Never'}
                  </div>
                </div>
              </div>

              {routine.tags && routine.tags.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:6,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                  {routine.tags.map(tag => (
                    <span key={tag} style={{
                      background:'var(--bg3)',
                      padding:'2px 6px',
                      borderRadius:3,
                      fontSize:11,
                      color:'var(--text3)'
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'best-performing' && metrics && (
        <div>
          <h3 style={{fontSize:16,fontFamily:'var(--font-mono)',color:'var(--text)',marginBottom:16}}>
            Top 5 Best Performing Routines
          </h3>
          <div style={{display:'grid',gap:16}}>
            {metrics.highest_success.map((routine, idx) => (
              <div key={routine.id} style={{
                background:'var(--bg2)',
                border:'2px solid var(--kalro-green)',
                borderRadius:'var(--radius-lg)',
                padding:20
              }}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                  <span style={{fontSize:24}}>{'🥇🥈🥉🏅🎖️'[idx]}</span>
                  <div>
                    <h4 style={{fontSize:14,fontWeight:600,color:'var(--text)',margin:0}}>
                      {routine.title}
                    </h4>
                    <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>
                      Applied {routine.times_applied} times
                    </div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div style={{background:'var(--bg3)',padding:12,borderRadius:6}}>
                    <div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--font-mono)',marginBottom:4}}>Success Rate</div>
                    <div style={{fontSize:20,fontWeight:700,color:'var(--kalro-green)',fontFamily:'var(--font-mono)'}}>
                      {routine.success_rate}
                    </div>
                  </div>
                  <div style={{fontSize:12,color:'var(--text2)',lineHeight:1.6}}>
                    Recommendation: Continue using this routine as it has proven highly effective for this incident type.
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'coverage' && coverage && (
        <div>
          <h3 style={{fontSize:16,fontFamily:'var(--font-mono)',color:'var(--text)',marginBottom:16}}>
            Coverage Analysis by Incident Type
          </h3>

          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:20,marginBottom:24}}>
            <h4 style={{fontSize:14,fontFamily:'var(--font-mono)',color:'var(--text)',marginBottom:12}}>Coverage Summary</h4>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))',gap:12}}>
              <div>
                <div style={{fontSize:12,color:'var(--text3)',fontFamily:'var(--font-mono)',marginBottom:4}}>Total Routines</div>
                <div style={{fontSize:20,fontWeight:700,color:'var(--text)'}}>{coverage.total_routines}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:'var(--text3)',fontFamily:'var(--font-mono)',marginBottom:4}}>Covered Types</div>
                <div style={{fontSize:20,fontWeight:700,color:'var(--kalro-green)'}}>{coverage.incident_types_covered}</div>
              </div>
            </div>
          </div>

          {coverage.nist_function_counts && (
            <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:20,marginBottom:24}}>
              <h4 style={{fontSize:14,fontFamily:'var(--font-mono)',color:'var(--text)',marginBottom:12}}>NIST Function Coverage</h4>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:12}}>
                {Object.entries(coverage.nist_function_counts).map(([func, count]) => (
                  <div key={func} style={{padding:12,background:'var(--bg3)',borderRadius:8}}>
                    <div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>{func}</div>
                    <div style={{fontSize:20,fontWeight:700,color:'var(--text)'}}>{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {coverage.gaps && coverage.gaps.length > 0 && (
            <div style={{background:'var(--kalro-red)'+' 22',border:'1px solid var(--kalro-red)',borderRadius:'var(--radius-lg)',padding:20,marginBottom:24}}>
              <h4 style={{fontSize:14,fontFamily:'var(--font-mono)',color:'var(--kalro-red)',marginBottom:12}}>⚠️ Coverage Gaps</h4>
              <ul style={{margin:0,paddingLeft:20,fontSize:13,color:'var(--text2)'}}>
                {coverage.gaps.map((gap, idx) => (
                  <li key={idx} style={{marginBottom:6}}>{gap}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'editor' && isAdmin && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:20}}>
            <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:20}}>
              <h3 style={{fontSize:16,fontFamily:'var(--font-mono)',color:'var(--text)',marginBottom:16}}>Routine Editor</h3>
              <p style={{fontSize:13,color:'var(--text3)',marginBottom:20}}>
                Convert completed PIRs into validated defensive routines that map to the Game Theory payoff matrix and NIST CSF.
              </p>

              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,color:'var(--text3)',fontFamily:'var(--font-mono)',display:'block',marginBottom:6}}>Choose PIR</label>
                <select value={selectedPir?.id||''} onChange={e => {
                  const pir = pirs.find(p => p.id === e.target.value);
                  setSelectedPir(pir);
                  if (pir) {
                    setEditorForm(f => ({
                      ...f,
                      title: pir.root_cause ? `Routine: ${pir.root_cause.slice(0, 50)}` : `Routine from PIR ${pir.id}`,
                      content: pir.what_worked || pir.root_cause || '',
                      applicable_incident_types: pir.incident_id || ''
                    }));
                  }
                }} style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)'}}>
                  <option value="">Select a completed PIR</option>
                  {pirs.map(pir => (
                    <option key={pir.id} value={pir.id}>{pir.incident_title} — {pir.id}</option>
                  ))}
                </select>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                <div>
                  <label style={{fontSize:12,color:'var(--text3)',display:'block',marginBottom:6}}>Routine Title</label>
                  <input value={editorForm.title} onChange={e => setEditorForm(f => ({ ...f, title: e.target.value }))} style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)'}}/>
                </div>
                <div>
                  <label style={{fontSize:12,color:'var(--text3)',display:'block',marginBottom:6}}>Primary Goal</label>
                  <input value={editorForm.primary_goal} onChange={e => setEditorForm(f => ({ ...f, primary_goal: e.target.value }))} placeholder="Stop Data Exfiltration" style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)'}}/>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                <div>
                  <label style={{fontSize:12,color:'var(--text3)',display:'block',marginBottom:6}}>Payoff Weight (0-1)</label>
                  <input type="number" min="0" max="1" step="0.05" value={editorForm.payoff_weight} onChange={e => setEditorForm(f => ({ ...f, payoff_weight: Number(e.target.value) }))} style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)'}}/>
                </div>
                <div>
                  <label style={{fontSize:12,color:'var(--text3)',display:'block',marginBottom:6}}>NIST Function</label>
                  <select value={editorForm.nist_function} onChange={e => setEditorForm(f => ({ ...f, nist_function: e.target.value }))} style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)'}}>
                    <option value="ID">Identify</option>
                    <option value="PR">Protect</option>
                    <option value="DE">Detect</option>
                    <option value="RS">Respond</option>
                    <option value="RC">Recover</option>
                  </select>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                <div>
                  <label style={{fontSize:12,color:'var(--text3)',display:'block',marginBottom:6}}>Institutional Enablers (CSV)</label>
                  <input value={editorForm.institutional_enablers} onChange={e => setEditorForm(f => ({ ...f, institutional_enablers: e.target.value }))} placeholder="Firewall policy, User training" style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)'}}/>
                </div>
                <div>
                  <label style={{fontSize:12,color:'var(--text3)',display:'block',marginBottom:6}}>Associated Scripts (CSV)</label>
                  <input value={editorForm.associated_scripts} onChange={e => setEditorForm(f => ({ ...f, associated_scripts: e.target.value }))} placeholder="scan.sh, quarantine.ps1" style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)'}}/>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                <div>
                  <label style={{fontSize:12,color:'var(--text3)',display:'block',marginBottom:6}}>Incident Types (CSV)</label>
                  <input value={editorForm.applicable_incident_types} onChange={e => setEditorForm(f => ({ ...f, applicable_incident_types: e.target.value }))} placeholder="unauthorized_access, data_exfiltration" style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)'}}/>
                </div>
                <div>
                  <label style={{fontSize:12,color:'var(--text3)',display:'block',marginBottom:6}}>Socio-Technical Focus</label>
                  <select value={editorForm.socio_technical_focus} onChange={e => setEditorForm(f => ({ ...f, socio_technical_focus: e.target.value }))} style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)'}}>
                    <option value="technical">Technical</option>
                    <option value="social">Social</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,color:'var(--text3)',fontFamily:'var(--font-mono)',display:'block',marginBottom:6}}>ROUTINE CONTENT</label>
                <textarea rows={8} value={editorForm.content} onChange={e => setEditorForm(f => ({ ...f, content: e.target.value }))} style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)',fontFamily:'inherit',fontFamily:'monospace'}}/>
              </div>

              {editorError && <div className="alert alert-error" style={{marginBottom:16}}>{editorError}</div>}
              {editorStatus && <div className="alert alert-success" style={{marginBottom:16}}>✓ {editorStatus}</div>}

              <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-ghost" onClick={() => {
                  setSelectedPir(null);
                  setEditorForm({
                    title:'', content:'', category:'response-checklist', primary_goal:'', payoff_weight:0.6,
                    nist_function:'PR', associated_scripts:'', institutional_enablers:'', socio_technical_focus:'technical',
                    success_rate:0.5, times_applied:0, applicable_incident_types:'', prerequisites:'', estimated_cost:'', estimated_time_to_resolve:'', routine_signature:''
                  });
                  setEditorStatus('');
                  setEditorError('');
                }}>Reset</button>
                <button type="button" className="btn btn-primary" disabled={savingEditor || !selectedPir} onClick={async () => {
                  if (!selectedPir) return;
                  setSavingEditor(true);
                  setEditorError('');
                  setEditorStatus('');
                  try {
                    const payload = {
                      title: editorForm.title,
                      content: editorForm.content,
                      category: editorForm.category,
                      primary_goal: editorForm.primary_goal,
                      payoff_weight: Number(editorForm.payoff_weight),
                      nist_function: editorForm.nist_function,
                      associated_scripts: editorForm.associated_scripts.split(',').map(s => s.trim()).filter(Boolean),
                      institutional_enablers: editorForm.institutional_enablers.split(',').map(s => s.trim()).filter(Boolean),
                      socio_technical_focus: editorForm.socio_technical_focus,
                      applicable_incident_types: editorForm.applicable_incident_types.split(',').map(s => s.trim()).filter(Boolean),
                      routine_signature: editorForm.routine_signature.split(',').map(s => s.trim()).filter(Boolean)
                    };

                    const res = await api.post(`/knowledge/from-pir/${selectedPir.id}`, payload);
                    setEditorStatus('Routine created successfully from PIR.');
                    setRoutines(prev => prev ? [res.data, ...prev] : [res.data]);
                    setSelectedPir(null);
                    setTimeout(() => setEditorStatus(''), 3000);
                  } catch (err) {
                    setEditorError(err.response?.data?.error || 'Failed to create routine from PIR');
                  } finally {
                    setSavingEditor(false);
                  }
                }}>{savingEditor ? 'Saving...' : 'Convert PIR to Routine'}</button>
              </div>
            </div>
            <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:20}}>
              <h4 style={{fontSize:14,fontFamily:'var(--font-mono)',color:'var(--text)',marginBottom:12}}>Editor Guide</h4>
              <p style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>Convert PIR insights into permanent organizational defensive routines that map to the Game Theory payoff matrix.</p>
              <ul style={{fontSize:12,color:'var(--text3)',paddingLeft:18,lineHeight:1.8,marginTop:12}}>
                <li>Extract root cause and best practices from the PIR</li>
                <li>Assign payoff weight (0–1) for Game Theory alignment</li>
                <li>Select NIST function covered by routine</li>
                <li>List institutional enablers and scripts</li>
                <li>Save as organizational knowledge for reuse</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div style={{marginTop:32,padding:16,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,color:'var(--text3)'}}>
        <strong style={{color:'var(--text2)'}}>💡 Pro Tip:</strong> Defensive routines are continuously refined based on incident outcomes. Link knowledge entries to routines to build institutional memory and improve response effectiveness over time.
      </div>
    </div>
  );
}
