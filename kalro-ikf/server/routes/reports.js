const express = require('express');
const { read } = require('../store');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const router = express.Router();

const SLA_HOURS = { critical:2, high:4, medium:8, low:24 };

function slaDeadline(inc) {
  return inc.sla_deadline || new Date(new Date(inc.created_at).getTime() + (SLA_HOURS[inc.severity]||8)*3600000).toISOString();
}

function computeGaps(incidents, knowledge) {
  const active = knowledge.filter(k=>k.status==='active');
  const types  = [...new Set(incidents.map(i=>i.type).filter(Boolean))];
  return types.map(type => {
    const typeInc = incidents.filter(i=>i.type===type);
    const covered = active.some(k=>k.tags.some(t=>type.toLowerCase().includes(t.toLowerCase())||t.toLowerCase().includes(type.toLowerCase()))||(k.incident_id&&typeInc.some(i=>i.id===k.incident_id)));
    return { type, incident_count:typeInc.length, covered, latest_incident:typeInc.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]?.created_at||null };
  }).sort((a,b)=>b.incident_count-a.incident_count);
}

function coverageRate(gaps) {
  return gaps.length?Math.round((gaps.filter(g=>g.covered).length/gaps.length)*100):0;
}

function computeMetrics(incidents) {
  const resolved = incidents.filter(i=>['resolved','closed'].includes(i.status));
  const now = new Date();
  // SLA breach rate
  const active = incidents.filter(i=>!['resolved','closed'].includes(i.status));
  const breached = active.filter(i=>now>new Date(slaDeadline(i))).length;
  const sla_breach_rate = active.length?Math.round((breached/active.length)*100):0;
  // avg time to resolve by severity (minutes)
  const ttrBySeverity = {};
  ['critical','high','medium','low'].forEach(sev => {
    const inc = resolved.filter(i=>i.severity===sev&&i.created_at&&i.updated_at);
    if (inc.length) {
      const times = inc.map(i=>(new Date(i.updated_at)-new Date(i.created_at))/60000).sort((a,b)=>a-b);
      const p50 = times[Math.floor(times.length*0.5)];
      const p90 = times[Math.floor(times.length*0.9)];
      ttrBySeverity[sev] = { count:inc.length, p50_min:Math.round(p50), p90_min:Math.round(p90) };
    }
  });
  // recurrence: incidents of same type within 90 days of a previous one
  const typeMap = {};
  incidents.forEach(i=>{ if (!typeMap[i.type]) typeMap[i.type]=[]; typeMap[i.type].push(new Date(i.created_at)); });
  let recurrences=0;
  Object.values(typeMap).forEach(dates => { dates.sort((a,b)=>a-b); for (let j=1;j<dates.length;j++) { if ((dates[j]-dates[j-1])<90*24*3600000) { recurrences++; break; } } });
  return { sla_breach_rate, ttr_by_severity:ttrBySeverity, recurrence_count:recurrences };
}

router.get('/dashboard', authenticate, (req,res) => {
  const incidents=read('incidents'), knowledge=read('knowledge'),
        users=read('users'), logs=read('audit_logs'), pirs=read('pirs');
  const active=knowledge.filter(k=>k.status==='active');
  const byStatus={},bySeverity={},byType={};
  incidents.forEach(i=>{ byStatus[i.status]=(byStatus[i.status]||0)+1; bySeverity[i.severity]=(bySeverity[i.severity]||0)+1; byType[i.type]=(byType[i.type]||0)+1; });
  const avgConf=active.length?parseFloat((active.reduce((s,k)=>s+k.confidence_score,0)/active.length).toFixed(2)):0;
  const gaps=computeGaps(incidents,knowledge);
  const metrics=computeMetrics(incidents);
  const pir_completion_rate=incidents.filter(i=>i.status==='closed').length?
    Math.round((pirs.length/incidents.filter(i=>i.status==='closed').length)*100):0;
  const enrich=(arr,fld)=>arr.map(i=>{const r=users.find(u=>u.id===i[fld]);return{...i,reporter_name:r?r.name:'Unknown'};});
  res.json({
    summary:{ total_incidents:incidents.length, open_incidents:incidents.filter(i=>['open','investigating','escalated'].includes(i.status)).length,
      resolved_incidents:incidents.filter(i=>i.status==='resolved').length, total_knowledge:knowledge.length,
      active_knowledge:active.length, avg_confidence:avgConf, total_users:users.length,
      total_audit_events:logs.length, major_incidents:incidents.filter(i=>i.is_major).length,
      pir_count:pirs.length, pir_completion_rate },
    by_status:byStatus, by_severity:bySeverity, by_type:byType,
    coverage_rate:coverageRate(gaps), gaps, uncovered_gaps:gaps.filter(g=>!g.covered),
    weak_entries:active.filter(k=>k.confidence_score<0.6).sort((a,b)=>a.confidence_score-b.confidence_score).slice(0,8).map(k=>{const c=users.find(u=>u.id===k.contributor_id);return{...k,contributor_name:c?c.name:'Unknown'};}),
    escalated_incidents:enrich(incidents.filter(i=>i.status==='escalated').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5),'reported_by'),
    major_incidents:enrich(incidents.filter(i=>i.is_major&&!['resolved','closed'].includes(i.status)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5),'reported_by'),
    sla_breached:incidents.filter(i=>!['resolved','closed'].includes(i.status)&&new Date()>new Date(slaDeadline(i))).map(i=>{const r=users.find(u=>u.id===i.reported_by);return{...i,reporter_name:r?r.name:'Unknown'};}),
    recent_incidents:enrich([...incidents].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,6),'reported_by'),
    top_knowledge:[...active].sort((a,b)=>b.confidence_score-a.confidence_score).slice(0,5).map(k=>{const c=users.find(u=>u.id===k.contributor_id);return{...k,contributor_name:c?c.name:'Unknown'};}),
    recent_activity:logs.slice(0,6).map(l=>{const u=users.find(u=>u.id===l.user_id);return{...l,user_name:u?u.name:'Unknown'};}),
    metrics
  });
});

router.get('/summary', authenticate, requireRole('super_admin'), (req,res) => {
  const incidents=read('incidents'),knowledge=read('knowledge'),users=read('users'),logs=read('audit_logs');
  const active=knowledge.filter(k=>k.status==='active');
  const avgConf=active.length?(active.reduce((s,k)=>s+k.confidence_score,0)/active.length).toFixed(2):0;
  res.json({ total_incidents:incidents.length, open_incidents:incidents.filter(i=>['open','investigating','escalated'].includes(i.status)).length,
    resolved_incidents:incidents.filter(i=>i.status==='resolved').length, total_knowledge:knowledge.length,
    active_knowledge:active.length, avg_confidence:parseFloat(avgConf), total_users:users.length, total_audit_events:logs.length });
});

router.get('/audit', authenticate, requireRole('super_admin'), (req,res) => {
  const users=read('users');
  res.json(read('audit_logs').map(l=>{const u=users.find(u=>u.id===l.user_id);return{...l,user_name:u?u.name:'Unknown',user_role:u?u.role:null};}));
});

router.get('/gaps', authenticate, (req,res) => {
  const gaps=computeGaps(read('incidents'),read('knowledge'));
  res.json({ coverage_rate:coverageRate(gaps), gaps });
});

module.exports = router;
