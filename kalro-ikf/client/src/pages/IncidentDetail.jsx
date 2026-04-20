import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Badge, Tags, ConfidenceBadge, Loading, fmtDate, SlaIndicator, KTypeBadge } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

const STATUSES=['open','investigating','escalated','resolved','closed']

function CaptureModal({ incident, onClose, onSaved }) {
  const [form,setForm]=useState({ title:'Lessons learned: '+incident.title, content:'', tags:incident.type?incident.type.replace(/_/g,'-'):'', knowledge_type:'lessons-learned' })
  const [saving,setSaving]=useState(false), [error,setError]=useState('')
  const handleSave=async(e)=>{ e.preventDefault(); if(!form.content.trim()){setError('Content required');return}; setSaving(true); setError('')
    try{ await api.post('/knowledge',{...form,tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean),incident_id:incident.id}); onSaved() }
    catch(err){ setError(err.response?.data?.error||'Failed') }finally{ setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:640}}>
        <div className="modal-header"><h2>Capture Knowledge from Incident</h2><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="alert alert-info" style={{marginBottom:16}}>Per KALRO IRP: document what you learned so future analysts respond faster to similar incidents.</div>
        {error&&<div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="form-group"><label className="form-label">Title *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required/></div>
          <div className="form-group"><label className="form-label">Knowledge Type</label>
            <select value={form.knowledge_type} onChange={e=>setForm(f=>({...f,knowledge_type:e.target.value}))}>
              <option value="lessons-learned">Lessons Learned</option>
              <option value="playbook">Playbook (step-by-step response)</option>
              <option value="runbook">Runbook (operational procedure)</option>
              <option value="reference">Reference (technical facts)</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Content *</label><textarea rows={8} value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder={"What happened\nSteps that worked\nWhat to avoid\nKALRO-specific context (systems, contacts, configs)"} required/></div>
          <div className="form-group"><label className="form-label">Tags (comma-separated)</label><input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="phishing, email, credentials"/></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Skip</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':'Save Entry'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function IncidentDetail() {
  const { id }=useParams()
  const [incident,setIncident]=useState(null), [loading,setLoading]=useState(true)
  const [updating,setUpdating]=useState(false), [showCapture,setShowCapture]=useState(false), [savedMsg,setSavedMsg]=useState('')
  const navigate=useNavigate(), { isAnalyst }=useAuth()

  const load=()=>{ setLoading(true); api.get('/incidents/'+id).then(r=>setIncident(r.data)).finally(()=>setLoading(false)) }
  useEffect(()=>{ load() },[id])

  const updateStatus=async(status)=>{ setUpdating(true); await api.put('/incidents/'+id,{status}); if((status==='resolved'||status==='closed')&&isAnalyst) setShowCapture(true); load(); setUpdating(false) }
  const handleCaptured=()=>{ setShowCapture(false); setSavedMsg('Knowledge entry saved.'); load(); setTimeout(()=>setSavedMsg(''),4000) }

  if(loading) return <Loading/>
  if(!incident) return <div className="page-body"><div className="alert alert-error">Incident not found.</div></div>

  const entitiesFlat=Object.entries(incident.entities||{}).flatMap(([k,v])=>Array.isArray(v)?v.map(val=>({type:k,val})):[{type:k,val:String(v)}])
  const hasKnowledge=incident.related_knowledge?.length>0
  const isCloseable=['resolved','closed'].includes(incident.status)
  const hasPIR=false // checked separately

  return (
    <div>
      <div className="page-header">
        <div style={{paddingBottom:20}}>
          <div style={{fontSize:12,color:'var(--text3)',fontFamily:'var(--font-mono)',marginBottom:8}}>
            <span style={{cursor:'pointer',color:'var(--accent)'}} onClick={()=>navigate('/incidents')}>Incidents</span> / #{incident.id}
          </div>
          <div className="flex-between">
            <div>
              <h1 style={{marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
                {incident.is_major&&<span style={{background:'var(--kalro-critical-bg)',color:'var(--kalro-red-light)',fontSize:13,fontFamily:'var(--font-mono)',padding:'2px 10px',borderRadius:4,border:'1px solid rgba(198,40,40,0.3)'}}>★ MAJOR</span>}
                {incident.title}
              </h1>
              <div className="flex gap-2" style={{flexWrap:'wrap',alignItems:'center'}}>
                <Badge value={incident.severity}/><Badge value={incident.status}/>
                <span className="tag">{incident.type?.replace(/_/g,' ')}</span>
                <SlaIndicator inc={incident}/>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {savedMsg&&<div className="alert alert-success" style={{marginBottom:16}}>✓ {savedMsg}</div>}

        {/* Major incident banner */}
        {incident.is_major&&(
          <div style={{background:'var(--kalro-critical-bg)',border:'1px solid rgba(198,40,40,0.4)',borderLeft:'4px solid var(--kalro-red)',borderRadius:'var(--radius)',padding:'14px 20px',marginBottom:20}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:13,fontWeight:700,color:'var(--kalro-red-light)',marginBottom:4}}>★ MAJOR INCIDENT — MIT ACTIVATION REQUIRED</div>
            <div style={{fontSize:13,color:'var(--text2)'}}>This is classified as a major incident. Senior leadership must be notified. All actions must be documented for the Post-Incident Review (PIR).</div>
          </div>
        )}

        {/* Escalation banner */}
        {incident.status==='escalated'&&(
          <div style={{background:'var(--kalro-critical-bg)',border:'1px solid rgba(198,40,40,0.4)',borderLeft:'4px solid var(--kalro-red)',borderRadius:'var(--radius)',padding:'14px 20px',marginBottom:20,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
            <div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:13,fontWeight:700,color:'var(--kalro-red-light)',marginBottom:4}}>⚡ ESCALATED — No Institutional Knowledge Found</div>
              <div style={{fontSize:13,color:'var(--text2)'}}>No matching knowledge exists. A senior analyst should lead. Document findings for PIR on resolution.</div>
            </div>
            {isAnalyst&&<button className="btn btn-ghost btn-sm" style={{borderColor:'rgba(198,40,40,0.4)',color:'var(--kalro-red-light)',whiteSpace:'nowrap'}} onClick={()=>setShowCapture(true)}>Capture Now</button>}
          </div>
        )}

        {/* No knowledge warning */}
        {!hasKnowledge&&incident.status!=='escalated'&&(
          <div style={{background:'var(--yellow-bg)',border:'1px solid rgba(255,193,7,0.4)',borderLeft:'4px solid var(--yellow)',borderRadius:'var(--radius)',padding:'12px 20px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
            <div style={{fontSize:13,color:'var(--text2)'}}><span style={{fontFamily:'var(--font-mono)',color:'var(--yellow)',fontWeight:700}}>◈ No knowledge suggestions</span> — consider escalating if unfamiliar territory.</div>
            {isAnalyst&&<div style={{display:'flex',gap:8,flexShrink:0}}>
              <button className="btn btn-ghost btn-sm" style={{borderColor:'rgba(255,193,7,0.4)',color:'var(--yellow)'}} onClick={()=>updateStatus('escalated')}>Escalate</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/search')}>Search KB</button>
            </div>}
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:20}}>
          <div>
            <div className="card" style={{marginBottom:20}}>
              <div className="section-header"><h2>Description</h2></div>
              <p style={{color:'var(--text2)',lineHeight:1.8,fontSize:14,whiteSpace:'pre-wrap'}}>{incident.description||<span className="text-muted">No description.</span>}</p>
            </div>

            {entitiesFlat.length>0&&(
              <div className="card" style={{marginBottom:20}}>
                <div className="section-header"><h2>Affected Entities</h2></div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {entitiesFlat.map(({type,val},i)=>(
                    <div key={i} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:6,padding:'6px 12px'}}>
                      <span style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--font-mono)',textTransform:'uppercase',marginRight:6}}>{type}:</span>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:13,color:'var(--kalro-green-light)'}}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <div className="section-header">
                <h2>Related Knowledge {hasKnowledge&&<span style={{color:'var(--accent)',fontFamily:'var(--font-mono)',fontWeight:400}}>({incident.related_knowledge.length})</span>}</h2>
                {isAnalyst&&<button className="btn btn-ghost btn-sm" onClick={()=>setShowCapture(true)}>+ Capture</button>}
              </div>
              {!hasKnowledge?(
                <div style={{textAlign:'center',padding:'24px 0',color:'var(--text3)'}}>
                  <div style={{fontSize:28,marginBottom:8,opacity:0.4}}>◈</div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:13,color:'var(--text2)',marginBottom:12}}>No matching entries in knowledge base</div>
                  <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/search')}>Search KB</button>
                    {isAnalyst&&<button className="btn btn-primary btn-sm" onClick={()=>setShowCapture(true)}>Capture knowledge</button>}
                  </div>
                </div>
              ):incident.related_knowledge.map(k=>(
                <div key={k.id} onClick={()=>navigate('/knowledge/'+k.id)} style={{padding:'14px 0',borderBottom:'1px solid var(--border)',cursor:'pointer',transition:'padding 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.paddingLeft='6px'} onMouseLeave={e=>e.currentTarget.style.paddingLeft='0'}>
                  <div className="flex-between" style={{marginBottom:8}}>
                    <span style={{fontWeight:500,fontSize:14}}>{k.title}</span>
                    <div style={{display:'flex',gap:6}}><KTypeBadge type={k.knowledge_type}/><Badge value={k.status}/></div>
                  </div>
                  <div style={{marginBottom:8}}><ConfidenceBadge score={k.confidence_score}/></div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <Tags tags={k.tags}/>
                    <span style={{fontSize:11,color:'var(--text3)',whiteSpace:'nowrap',marginLeft:8}}>used {k.use_count}×</span>
                  </div>
                  <p style={{fontSize:12,color:'var(--text3)',marginTop:8,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{k.content}</p>
                  {isAnalyst&&<button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={async(e)=>{e.stopPropagation();await api.post('/knowledge/'+k.id+'/use');load()}}>✓ Mark as used</button>}
                </div>
              ))}
            </div>
          </div>

          <div>
            {isAnalyst&&(
              <div className="card" style={{marginBottom:16}}>
                <div style={{fontSize:12,fontFamily:'var(--font-mono)',color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Update Status</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {STATUSES.map(s=>(
                    <button key={s} onClick={()=>updateStatus(s)} disabled={updating||incident.status===s}
                      className={'btn btn-sm '+(incident.status===s?'btn-primary':'btn-ghost')} style={{justifyContent:'flex-start'}}>
                      {incident.status===s&&<span style={{marginRight:6}}>▸</span>}{s.charAt(0).toUpperCase()+s.slice(1)}
                      {(s==='resolved'||s==='closed')&&incident.status!==s&&<span style={{marginLeft:'auto',fontSize:10,color:'var(--accent)',opacity:0.8}}>+ capture</span>}
                    </button>
                  ))}
                </div>
                {isCloseable&&(
                  <div style={{marginTop:12,padding:'10px 12px',background:'var(--kalro-green-glow)',border:'1px solid rgba(46,125,50,0.3)',borderRadius:'var(--radius)',fontSize:12,color:'var(--kalro-green-light)'}}>
                    <div style={{fontWeight:600,marginBottom:4}}>◈ Capture knowledge</div>
                    <div style={{color:'var(--text2)',marginBottom:8}}>Document lessons learned to prevent recurrence.</div>
                    <button className="btn btn-primary btn-sm" style={{width:'100%',justifyContent:'center'}} onClick={()=>setShowCapture(true)}>Document lessons</button>
                  </div>
                )}
                <div style={{marginTop:12}}>
                  <button className="btn btn-ghost btn-sm" style={{width:'100%',justifyContent:'center'}} onClick={()=>navigate('/incidents/'+id+'/pir')}>
                    {isCloseable?'View / Create PIR':'Start PIR (post-incident review)'}
                  </button>
                </div>
              </div>
            )}
            <div className="card">
              <div style={{fontSize:12,fontFamily:'var(--font-mono)',color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Details</div>
              {[{l:'Reported by',v:incident.reporter_name},{l:'Assigned to',v:incident.assignee_name},{l:'Logged',v:fmtDate(incident.created_at)},{l:'Updated',v:fmtDate(incident.updated_at)},{l:'SLA Deadline',v:incident.sla_deadline?new Date(incident.sla_deadline).toLocaleString('en-KE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—'},{l:'Incident ID',v:incident.id}].map(({l,v})=>(
                <div key={l} style={{marginBottom:12}}>
                  <div style={{fontSize:11,color:'var(--text3)',fontFamily:'var(--font-mono)',marginBottom:2}}>{l}</div>
                  <div style={{fontSize:14,color:'var(--text)'}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showCapture&&<CaptureModal incident={incident} onClose={()=>setShowCapture(false)} onSaved={handleCaptured}/>}
    </div>
  )
}
