import { useState, useEffect } from 'react'
import api from '../api/axios'
import { Loading, fmtDate } from '../components/Shared'

export default function Reports() {
  const [summary,setSummary]=useState(null), [logs,setLogs]=useState([]), [loading,setLoading]=useState(true), [tab,setTab]=useState('overview')
  useEffect(()=>{ Promise.all([api.get('/reports/summary'),api.get('/reports/audit')]).then(([s,l])=>{ setSummary(s.data); setLogs(l.data) }).finally(()=>setLoading(false)) },[])
  if(loading) return <Loading/>
  const ACT={ LOGIN:'var(--kalro-green-light)', CREATE_INCIDENT:'var(--orange)', CREATE_KNOWLEDGE:'var(--kalro-green)', UPDATE_INCIDENT:'var(--yellow)', ANNOTATE_KNOWLEDGE:'var(--purple)', SEARCH:'var(--text3)', CREATE_USER:'var(--kalro-green-light)', DELETE_USER:'var(--kalro-red-light)', VERSION_KNOWLEDGE:'var(--accent)', USE_KNOWLEDGE:'var(--kalro-green)', CREATE_PIR:'var(--accent)', UPDATE_PIR:'var(--yellow)' }
  return (
    <div>
      <div className="page-header"><h1>Reports & Audit</h1><p>System analytics and full audit trail — admin only</p></div>
      <div className="page-body">
        <div className="tabs">
          <button className={'tab-btn '+(tab==='overview'?'active':'')} onClick={()=>setTab('overview')}>Overview</button>
          <button className={'tab-btn '+(tab==='audit'?'active':'')} onClick={()=>setTab('audit')}>Audit Log ({logs.length})</button>
        </div>
        {tab==='overview'&&summary&&(
          <div className="stats-grid">
            {[{l:'Total Incidents',v:summary.total_incidents,c:'green'},{l:'Open / Active',v:summary.open_incidents,c:'red'},{l:'Resolved',v:summary.resolved_incidents,c:'green'},{l:'Knowledge Entries',v:summary.total_knowledge,c:'accent'},{l:'Active Entries',v:summary.active_knowledge,c:'green'},{l:'Avg Confidence',v:Math.round(summary.avg_confidence*100)+'%',c:'yellow'},{l:'Total Users',v:summary.total_users,c:'green'},{l:'Audit Events',v:summary.total_audit_events,c:'accent'}].map(({l,v,c})=>(
              <div key={l} className={'stat-card '+c}><div className="stat-label">{l}</div><div className="stat-value">{v}</div></div>
            ))}
          </div>
        )}
        {tab==='audit'&&(
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Action</th><th>User</th><th>Role</th><th>Target</th><th>Details</th><th>Time</th></tr></thead>
                <tbody>
                  {logs.map(l=>(
                    <tr key={l.id} style={{cursor:'default'}}>
                      <td><span style={{fontFamily:'var(--font-mono)',fontSize:12,color:ACT[l.action]||'var(--text3)'}}>{l.action}</span></td>
                      <td style={{color:'var(--text)'}}>{l.user_name}</td>
                      <td><span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)'}}>{l.user_role}</span></td>
                      <td><span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)'}}>{l.target_type||'—'}{l.target_id?' / '+l.target_id:''}</span></td>
                      <td style={{fontSize:12,color:'var(--text3)'}}>{l.metadata&&Object.entries(l.metadata).map(([k,v])=>k+': '+v).join(', ')}</td>
                      <td style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',whiteSpace:'nowrap'}}>{fmtDate(l.created_at)}</td>
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
