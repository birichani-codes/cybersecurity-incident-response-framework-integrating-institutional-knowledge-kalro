import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Badge, ConfidenceBadge, Tags, Loading, EmptyState, KTypeBadge } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

const K_TYPES=['lessons-learned','playbook','runbook','reference']

export default function Knowledge() {
  const [entries,setEntries]=useState([]), [loading,setLoading]=useState(true)
  const [showModal,setShowModal]=useState(false)
  const [form,setForm]=useState({title:'',content:'',tags:'',incident_id:'',knowledge_type:'lessons-learned'})
  const [incidents,setIncidents]=useState([]), [submitting,setSubmitting]=useState(false), [error,setError]=useState('')
  const [statusFilter,setStatusFilter]=useState(''), [typeFilter,setTypeFilter]=useState('')
  const navigate=useNavigate(), { isAnalyst }=useAuth()

  const load=()=>{
    setLoading(true)
    const p=new URLSearchParams()
    if(statusFilter) p.set('status',statusFilter)
    if(typeFilter) p.set('knowledge_type',typeFilter)
    api.get('/knowledge?'+p).then(r=>setEntries(r.data)).finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[statusFilter,typeFilter])
  useEffect(()=>{ api.get('/incidents').then(r=>setIncidents(r.data)) },[])

  const handleCreate=async(e)=>{ e.preventDefault(); setSubmitting(true); setError('')
    try{ await api.post('/knowledge',{...form,tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean)}); setShowModal(false); setForm({title:'',content:'',tags:'',incident_id:'',knowledge_type:'lessons-learned'}); load() }
    catch(err){ setError(err.response?.data?.error||'Failed') }finally{ setSubmitting(false) }
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex-between" style={{paddingBottom:20}}>
          <div><h1>Knowledge Base</h1><p>Institutional knowledge — playbooks, runbooks, and lessons learned</p></div>
          {isAnalyst&&<button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Add Entry</button>}
        </div>
      </div>
      <div className="page-body">
        <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
          {['','active','superseded','retired'].map(s=>(
            <button key={s} className={'btn btn-sm '+(statusFilter===s?'btn-primary':'btn-ghost')} onClick={()=>setStatusFilter(s)}>{s||'All'}</button>
          ))}
          <div style={{width:1,background:'var(--border)',margin:'0 4px'}}/>
          {K_TYPES.map(t=>(
            <button key={t} className={'btn btn-sm '+(typeFilter===t?'btn-primary':'btn-ghost')} onClick={()=>setTypeFilter(typeFilter===t?'':t)}>{t}</button>
          ))}
        </div>
        {loading?<Loading/>:entries.length===0?<EmptyState icon="◈" title="No knowledge entries" sub="Capture institutional knowledge from resolved incidents."/>:(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {entries.map(k=>(
              <div key={k.id} className="card" style={{cursor:'pointer',transition:'border-color 0.15s'}} onClick={()=>navigate('/knowledge/'+k.id)}
                onMouseEnter={e=>e.currentTarget.style.borderColor='var(--kalro-green)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                <div className="flex-between mb-3">
                  <div style={{flex:1,paddingRight:12}}>
                    <h3 style={{fontWeight:600,fontSize:15,color:'var(--text)',marginBottom:4}}>{k.title}</h3>
                    <div style={{fontSize:12,color:'var(--text3)'}}>by {k.contributor_name} · v{k.version} · used {k.use_count}×</div>
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}><KTypeBadge type={k.knowledge_type}/><Badge value={k.status}/></div>
                </div>
                <div style={{marginBottom:10}}><ConfidenceBadge score={k.confidence_score}/></div>
                <Tags tags={k.tags}/>
                <p style={{fontSize:13,color:'var(--text3)',marginTop:8,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{k.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{maxWidth:640}}>
            <div className="modal-header"><h2>Add Knowledge Entry</h2><button className="modal-close" onClick={()=>setShowModal(false)}>×</button></div>
            {error&&<div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group"><label className="form-label">Title *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Ransomware Containment Playbook" required/></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Knowledge Type</label>
                  <select value={form.knowledge_type} onChange={e=>setForm(f=>({...f,knowledge_type:e.target.value}))}>
                    <option value="lessons-learned">Lessons Learned</option>
                    <option value="playbook">Playbook</option>
                    <option value="runbook">Runbook</option>
                    <option value="reference">Reference</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Link to Incident</label>
                  <select value={form.incident_id} onChange={e=>setForm(f=>({...f,incident_id:e.target.value}))}>
                    <option value="">— None —</option>{incidents.map(i=><option key={i.id} value={i.id}>{i.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Content *</label><textarea rows={8} value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder="Document steps, lessons learned, mitigation techniques..." required/></div>
              <div className="form-group"><label className="form-label">Tags (comma-separated)</label><input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="phishing, email, credentials"/></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting?'Saving...':'Save Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
