import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Badge, Loading, timeAgo, SlaIndicator } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

const SEV = { critical:'var(--kalro-red-light)', high:'var(--orange)', medium:'var(--yellow)', low:'var(--green)' }

function CoverageBar({ rate }) {
  const color = rate>=80?'var(--kalro-green)':rate>=50?'var(--yellow)':'var(--kalro-red)'
  const label = rate>=80?'Good':rate>=50?'At risk':'Critical'
  return (
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div style={{flex:1,height:8,background:'var(--bg4)',borderRadius:4,overflow:'hidden'}}>
        <div style={{width:rate+'%',height:'100%',background:color,borderRadius:4,transition:'width 0.6s ease'}}/>
      </div>
      <span style={{fontFamily:'var(--font-mono)',fontSize:13,color,minWidth:36}}>{rate}%</span>
      <span style={{fontSize:12,color,background:color+'22',padding:'2px 8px',borderRadius:4,border:'1px solid '+color+'44'}}>{label}</span>
    </div>
  )
}

function ConfPip({ score }) {
  const pct=Math.round(score*100), color=pct>=80?'var(--kalro-green)':pct>=50?'var(--yellow)':'var(--kalro-red-light)'
  return <div style={{display:'flex',alignItems:'center',gap:6}}>
    <div style={{width:60,height:4,background:'var(--bg4)',borderRadius:2}}><div style={{width:pct+'%',height:'100%',background:color,borderRadius:2}}/></div>
    <span style={{fontFamily:'var(--font-mono)',fontSize:11,color}}>{pct}%</span>
  </div>
}

export default function Dashboard() {
  const [data,setData]=useState(null), [loading,setLoading]=useState(true)
  const navigate=useNavigate(), { user }=useAuth()
  useEffect(()=>{ api.get('/reports/dashboard').then(r=>setData(r.data)).finally(()=>setLoading(false)) },[])
  if (loading) return <Loading/>
  const { summary,by_severity,by_status,coverage_rate,uncovered_gaps,weak_entries,
          escalated_incidents,major_incidents,sla_breached,recent_incidents,top_knowledge,metrics } = data

  const hov=(e)=>{ e.currentTarget.style.paddingLeft='6px' }
  const hout=(e)=>{ e.currentTarget.style.paddingLeft='0' }
  const row={ padding:'11px 0',borderBottom:'1px solid var(--border)',cursor:'pointer',transition:'padding 0.15s' }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.name} — {new Date().toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
      </div>
      <div className="page-body">

        {/* Major incident alert */}
        {major_incidents.length>0 && (
          <div className="alert-major" style={{borderRadius:'var(--radius)',padding:'14px 20px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontFamily:'var(--font-mono)',fontWeight:700,fontSize:13,marginBottom:4}}>⚠ {major_incidents.length} MAJOR INCIDENT{major_incidents.length>1?'S':''} ACTIVE</div>
              <div style={{fontSize:13,color:'var(--text2)'}}>{major_incidents.map(i=>i.title).join(' · ')}</div>
            </div>
            <button className="btn btn-sm" style={{background:'var(--kalro-red)',color:'#fff',whiteSpace:'nowrap'}} onClick={()=>navigate('/incidents?is_major=true')}>View Major</button>
          </div>
        )}

        {/* SLA breach alert */}
        {sla_breached.length>0 && (
          <div className="alert alert-error" style={{marginBottom:20}}>
            ⏱ {sla_breached.length} incident{sla_breached.length>1?'s':''} have breached SLA deadlines — {sla_breached.map(i=>i.title).join(', ')}
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',marginBottom:20}}>
          <div className="stat-card green" onClick={()=>navigate('/incidents')} style={{cursor:'pointer'}}>
            <div className="stat-label">Total Incidents</div>
            <div className="stat-value">{summary.total_incidents}</div>
            <div className="stat-sub">{summary.open_incidents} active</div>
          </div>
          <div className="stat-card red" onClick={()=>navigate('/incidents?is_major=true')} style={{cursor:'pointer'}}>
            <div className="stat-label">Major Incidents</div>
            <div className="stat-value">{summary.major_incidents}</div>
            <div className="stat-sub">requiring MIT</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-label">SLA Breached</div>
            <div className="stat-value">{sla_breached.length}</div>
            <div className="stat-sub">overdue incidents</div>
          </div>
          <div className="stat-card accent">
            <div className="stat-label">Knowledge</div>
            <div className="stat-value">{summary.active_knowledge}</div>
            <div className="stat-sub">active entries</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-label">PIR Completion</div>
            <div className="stat-value">{summary.pir_completion_rate}%</div>
            <div className="stat-sub">{summary.pir_count} reviews done</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Avg Confidence</div>
            <div className="stat-value">{Math.round(summary.avg_confidence*100)}%</div>
            <div className="stat-sub">knowledge health</div>
          </div>
        </div>

        {/* Coverage bar */}
        <div className="card" style={{marginBottom:20,borderLeft:'3px solid '+(coverage_rate>=80?'var(--kalro-green)':coverage_rate>=50?'var(--yellow)':'var(--kalro-red)')}}>
          <div className="flex-between" style={{marginBottom:10}}>
            <div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Knowledge Coverage Rate</div>
              <div style={{fontSize:13,color:'var(--text2)'}}>{data.gaps.filter(g=>g.covered).length} of {data.gaps.length} incident types have active knowledge</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/knowledge')}>Manage Knowledge</button>
          </div>
          <CoverageBar rate={coverage_rate}/>
        </div>

        {/* Row 2: gaps + weak + metrics */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
          <div className="card">
            <div className="section-header">
              <h2>Knowledge Gaps</h2>
              <span style={{fontSize:12,color:'var(--kalro-red-light)',fontFamily:'var(--font-mono)'}}>{uncovered_gaps.length} uncovered</span>
            </div>
            {uncovered_gaps.length===0?<div style={{padding:'16px 0',textAlign:'center',color:'var(--green)',fontSize:13}}>✓ All types covered</div>:
              uncovered_gaps.map(g=>(
                <div key={g.type} onClick={()=>navigate('/knowledge')} style={row} onMouseEnter={hov} onMouseLeave={hout}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <div style={{fontWeight:500,fontSize:14,color:'var(--text)',textTransform:'capitalize'}}>{g.type.replace(/_/g,' ')}</div>
                      <div style={{fontSize:12,color:'var(--text3)'}}>{g.incident_count} incident{g.incident_count!==1?'s':''}{g.latest_incident?' · last '+timeAgo(g.latest_incident):''}</div>
                    </div>
                    <span style={{background:'var(--kalro-critical-bg)',color:'var(--kalro-red-light)',fontSize:11,fontFamily:'var(--font-mono)',padding:'2px 8px',borderRadius:4}}>NO COVERAGE</span>
                  </div>
                </div>
              ))
            }
          </div>

          <div className="card">
            <div className="section-header">
              <h2>Needs Review</h2>
              <span style={{fontSize:12,color:'var(--yellow)',fontFamily:'var(--font-mono)'}}>{weak_entries.length} below 60%</span>
            </div>
            {weak_entries.length===0?<div style={{padding:'16px 0',textAlign:'center',color:'var(--green)',fontSize:13}}>✓ All entries healthy</div>:
              weak_entries.map(k=>(
                <div key={k.id} onClick={()=>navigate('/knowledge/'+k.id)} style={row} onMouseEnter={hov} onMouseLeave={hout}>
                  <div style={{fontWeight:500,fontSize:13,color:'var(--text)',marginBottom:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{k.title}</div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}><ConfPip score={k.confidence_score}/><span style={{fontSize:11,color:'var(--text3)'}}>used {k.use_count}× · v{k.version}</span></div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Row 3: escalated + SLA metrics */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
          <div className="card">
            <div className="section-header">
              <h2>Escalated — No Knowledge</h2>
              <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/incidents?status=escalated')}>View all</button>
            </div>
            {escalated_incidents.length===0?<div style={{padding:'16px 0',textAlign:'center',color:'var(--green)',fontSize:13}}>✓ No escalated incidents</div>:
              escalated_incidents.map(inc=>(
                <div key={inc.id} onClick={()=>navigate('/incidents/'+inc.id)} style={row} onMouseEnter={hov} onMouseLeave={hout}>
                  <div className="flex-between mb-3"><span style={{fontWeight:500,fontSize:14,color:'var(--text)'}}>{inc.title}</span><Badge value={inc.severity}/></div>
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text3)'}}><SlaIndicator inc={inc}/><span>·</span><span>{inc.reporter_name}</span></div>
                </div>
              ))
            }
          </div>

          <div className="card">
            <div className="section-header"><h2>SLA Performance</h2></div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:'var(--text3)',marginBottom:6,fontFamily:'var(--font-mono)'}}>SLA BREACH RATE (ACTIVE)</div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1,height:8,background:'var(--bg4)',borderRadius:4}}><div style={{width:metrics.sla_breach_rate+'%',height:'100%',background:metrics.sla_breach_rate>30?'var(--kalro-red)':metrics.sla_breach_rate>10?'var(--yellow)':'var(--kalro-green)',borderRadius:4}}/></div>
                <span style={{fontFamily:'var(--font-mono)',fontSize:13,color:metrics.sla_breach_rate>30?'var(--kalro-red-light)':metrics.sla_breach_rate>10?'var(--yellow)':'var(--green)'}}>{metrics.sla_breach_rate}%</span>
              </div>
            </div>
            <div className="section-header" style={{marginTop:12}}><h2>Time to Resolve (Percentiles)</h2></div>
            {Object.entries(metrics.ttr_by_severity||{}).length===0?<div style={{fontSize:13,color:'var(--text3)'}}>No resolved incidents yet</div>:
              Object.entries(metrics.ttr_by_severity).map(([sev,d])=>(
                <div key={sev} style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:11,textTransform:'uppercase',color:SEV[sev]||'var(--text3)',minWidth:64}}>{sev}</span>
                    <span style={{fontSize:12,color:'var(--text2)'}}>p50: {d.p50_min<60?d.p50_min+'m':Math.round(d.p50_min/60)+'h'}</span>
                    <span style={{fontSize:12,color:'var(--text3)'}}>p90: {d.p90_min<60?d.p90_min+'m':Math.round(d.p90_min/60)+'h'}</span>
                    <span style={{fontSize:11,color:'var(--text3)'}}>{d.count} closed</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Row 4: recent + top knowledge */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div className="card">
            <div className="section-header"><h2>Recent Incidents</h2><button className="btn btn-ghost btn-sm" onClick={()=>navigate('/incidents')}>View all</button></div>
            {recent_incidents.map(inc=>(
              <div key={inc.id} onClick={()=>navigate('/incidents/'+inc.id)} style={row} onMouseEnter={hov} onMouseLeave={hout}>
                <div className="flex-between mb-3">
                  <span style={{fontWeight:500,fontSize:14,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200}}>
                    {inc.is_major && <span style={{color:'var(--kalro-red-light)',marginRight:4}}>★</span>}{inc.title}
                  </span>
                  <Badge value={inc.severity}/>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text3)'}}>
                  <Badge value={inc.status}/><span>·</span><SlaIndicator inc={inc}/><span>·</span><span>{timeAgo(inc.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="section-header"><h2>Top Knowledge</h2><button className="btn btn-ghost btn-sm" onClick={()=>navigate('/knowledge')}>View all</button></div>
            {top_knowledge.map(k=>(
              <div key={k.id} onClick={()=>navigate('/knowledge/'+k.id)} style={row} onMouseEnter={hov} onMouseLeave={hout}>
                <div style={{fontWeight:500,fontSize:14,color:'var(--text)',marginBottom:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{k.title}</div>
                <div style={{display:'flex',alignItems:'center',gap:10}}><ConfPip score={k.confidence_score}/><span style={{fontSize:11,color:'var(--text3)'}}>{k.contributor_name} · used {k.use_count}×</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
