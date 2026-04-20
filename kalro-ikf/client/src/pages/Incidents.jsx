import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import { Badge, Loading, EmptyState, timeAgo, SlaIndicator } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

const TYPES=['phishing','ransomware','ddos','unauthorized_access','malware','data_exfiltration','other']
const SEVS=['critical','high','medium','low']

export default function Incidents() {
  const [incidents,setIncidents]=useState([]), [loading,setLoading]=useState(true)
  const [showModal,setShowModal]=useState(false)
  const [filters,setFilters]=useState({status:'',severity:'',type:'',is_major:''})
  const [form,setForm]=useState({title:'',type:'phishing',severity:'medium',description:'',entities:'',is_major:false})
  const [submitting,setSubmitting]=useState(false), [error,setError]=useState('')
  const navigate=useNavigate(), { isAnalyst }=useAuth()
  const [sp]=useSearchParams()

  useEffect(()=>{
    const init={status:sp.get('status')||'',severity:sp.get('severity')||'',type:'',is_major:sp.get('is_major')||''}
    setFilters(init)
  },[])

  const load=()=>{
    setLoading(true)
    const p=new URLSearchParams()
    if(filters.status) p.set('status',filters.status)
    if(filters.severity) p.set('severity',filters.severity)
    if(filters.type) p.set('type',filters.type)
    if(filters.is_major) p.set('is_major','true')
    api.get('/incidents?'+p).then(r=>setIncidents(r.data)).finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[filters])

  const handleCreate=async(e)=>{
    e.preventDefault(); setSubmitting(true); setError('')
    try{
      const ips=form.entities.split(',').map(s=>s.trim()).filter(Boolean)
      await api.post('/incidents',{...form,entities:ips.length?{ips}:{},is_major:form.is_major})
      setShowModal(false); setForm({title:'',type:'phishing',severity:'medium',description:'',entities:'',is_major:false}); load()
    }catch(err){ setError(err.response?.data?.error||'Failed') }finally{ setSubmitting(false) }
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex-between" style={{paddingBottom:20}}>
          <div><h1>Incidents</h1><p>Track, investigate, and resolve security incidents</p></div>
          {isAnalyst && <button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Log Incident</button>}
        </div>
      </div>
      <div className="page-body">
        <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
          {[{key:'status',opts:['','open','investigating','escalated','resolved','closed'],label:'All Statuses'},
            {key:'severity',opts:['',...SEVS],label:'All Severities'},
            {key:'type',opts:['',...TYPES],label:'All Types'}].map(({key,opts,label})=>(
            <select key={key} value={filters[key]} onChange={e=>setFilters(f=>({...f,[key]:e.target.value}))} style={{width:'auto',minWidth:150}}><option value="">{label}</option>{opts.filter(Boolean).map(o=><option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}</select>
          ))}
          <button className={filters.is_major?'btn btn-sm btn-primary':'btn btn-sm btn-ghost'} onClick={()=>setFilters(f=>({...f,is_major:f.is_major?'':'true'}))}>★ Major only</button>
          {Object.values(filters).some(Boolean)&&<button className="btn btn-ghost btn-sm" onClick={()=>setFilters({status:'',severity:'',type:'',is_major:''})}>Clear</button>}
        </div>

        {loading?<Loading/>:incidents.length===0?<EmptyState icon="⚡" title="No incidents found" sub="Try changing filters or log a new incident"/>:(
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Title</th><th>Type</th><th>Severity</th><th>Status</th><th>SLA</th><th>Reported</th></tr></thead>
                <tbody>
                  {incidents.map(inc=>(
                    <tr key={inc.id} onClick={()=>navigate('/incidents/'+inc.id)}>
                      <td style={{maxWidth:260}}>
                        <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:6}}>
                          {inc.is_major&&<span style={{color:'var(--kalro-red-light)',fontSize:12}}>★</span>}
                          <span style={{color:'var(--text)',fontWeight:500}}>{inc.title}</span>
                        </div>
                      </td>
                      <td><span className="tag">{inc.type?.replace(/_/g,' ')}</span></td>
                      <td><Badge value={inc.severity}/></td>
                      <td><Badge value={inc.status}/></td>
                      <td><SlaIndicator inc={inc}/></td>
                      <td style={{color:'var(--text3)',fontFamily:'var(--font-mono)',fontSize:12}}>{timeAgo(inc.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h2>Log New Incident</h2><button className="modal-close" onClick={()=>setShowModal(false)}>×</button></div>
            {error&&<div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group"><label className="form-label">Title *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Brief incident description" required/></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Type *</label><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Severity *</label><select value={form.severity} onChange={e=>setForm(f=>({...f,severity:e.target.value}))}>{SEVS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label><textarea rows={4} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What happened..."/></div>
              <div className="form-group"><label className="form-label">Affected IPs / Hosts</label><input value={form.entities} onChange={e=>setForm(f=>({...f,entities:e.target.value}))} placeholder="192.168.1.1, ws-admin-01"/></div>
              <div className="form-group">
                <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                  <input type="checkbox" checked={form.is_major} onChange={e=>setForm(f=>({...f,is_major:e.target.checked}))} style={{width:'auto'}}/>
                  <span className="form-label" style={{margin:0}}>Mark as Major Incident (requires MIT involvement)</span>
                </label>
              </div>
              {form.is_major&&<div className="alert alert-warning" style={{marginBottom:0}}>Major incidents alert all analysts and require senior leadership involvement per KALRO IRP.</div>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting?'Logging...':'Log Incident'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
