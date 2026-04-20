const express = require('express');
const { v4: uuid } = require('uuid');
const { read, write } = require('../store');
const { authenticate } = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');
const { logAction } = require('./audit');
const router = express.Router();

const SLA_HOURS = { critical:2, high:4, medium:8, low:24 };

function computeSlaDeadline(severity, created_at) {
  const h = SLA_HOURS[severity] || 8;
  return new Date(new Date(created_at).getTime() + h*60*60*1000).toISOString();
}

function enrichIncident(inc, users, knowledge) {
  const r = users.find(u => u.id===inc.reported_by);
  const a = users.find(u => u.id===inc.assigned_to);
  const related = knowledge ? knowledge.filter(k =>
    k.status==='active' && (
      k.incident_id===inc.id ||
      k.tags.some(t => inc.type && (inc.type.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(inc.type.toLowerCase())))
    )
  ) : undefined;
  const sla_deadline = inc.sla_deadline || computeSlaDeadline(inc.severity, inc.created_at);
  const sla_breached = !['resolved','closed'].includes(inc.status) && new Date() > new Date(sla_deadline);
  const sla_minutes_remaining = Math.round((new Date(sla_deadline)-new Date())/60000);
  return { ...inc, sla_deadline, sla_breached, sla_minutes_remaining, reporter_name:r?r.name:'Unknown', assignee_name:a?a.name:'Unassigned', ...(related!==undefined?{related_knowledge:related}:{}) };
}

router.get('/', authenticate, (req,res) => {
  const { status, severity, type, is_major } = req.query;
  const users = read('users'); const knowledge = read('knowledge');
  let f = read('incidents');
  if (status)   f = f.filter(i => i.status===status);
  if (severity) f = f.filter(i => i.severity===severity);
  if (type)     f = f.filter(i => i.type===type);
  if (is_major) f = f.filter(i => i.is_major===true);
  res.json(f.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(i=>enrichIncident(i,users,knowledge)));
});

router.get('/stats', authenticate, (req,res) => {
  const incidents = read('incidents');
  const stats = { total:incidents.length, by_status:{}, by_severity:{}, by_type:{}, major_count:0, sla_breached:0 };
  const now = new Date();
  incidents.forEach(i => {
    stats.by_status[i.status]     = (stats.by_status[i.status]||0)+1;
    stats.by_severity[i.severity] = (stats.by_severity[i.severity]||0)+1;
    stats.by_type[i.type]         = (stats.by_type[i.type]||0)+1;
    if (i.is_major) stats.major_count++;
    const sla = i.sla_deadline || computeSlaDeadline(i.severity, i.created_at);
    if (!['resolved','closed'].includes(i.status) && now > new Date(sla)) stats.sla_breached++;
  });
  res.json(stats);
});

router.get('/:id', authenticate, (req,res) => {
  const inc = read('incidents').find(i => i.id===req.params.id);
  if (!inc) return res.status(404).json({ error:'Incident not found' });
  res.json(enrichIncident(inc, read('users'), read('knowledge')));
});

router.post('/', authenticate, requireMinRole('analyst'), (req,res) => {
  const { title, type, severity, description, entities, is_major } = req.body;
  if (!title||!type||!severity) return res.status(400).json({ error:'title, type, severity required' });
  const incidents = read('incidents');
  const created_at = new Date().toISOString();
  const newInc = {
    id:'inc'+uuid().slice(0,8), title, type, severity, status:'open',
    is_major: is_major||false, description:description||'', entities:entities||{},
    reported_by:req.user.id, assigned_to:null,
    sla_deadline: computeSlaDeadline(severity, created_at),
    created_at, updated_at:created_at
  };
  incidents.push(newInc); write('incidents', incidents);
  logAction({ userId:req.user.id, action:'CREATE_INCIDENT', targetType:'incident', targetId:newInc.id, metadata:{ title, severity, is_major:newInc.is_major } });
  res.status(201).json(newInc);
});

router.put('/:id', authenticate, requireMinRole('analyst'), (req,res) => {
  const incidents = read('incidents');
  const idx = incidents.findIndex(i => i.id===req.params.id);
  if (idx===-1) return res.status(404).json({ error:'Not found' });
  ['title','status','severity','description','assigned_to','entities','type','is_major'].forEach(f => {
    if (req.body[f]!==undefined) incidents[idx][f]=req.body[f];
  });
  // recalculate SLA if severity changed
  if (req.body.severity) incidents[idx].sla_deadline = computeSlaDeadline(req.body.severity, incidents[idx].created_at);
  incidents[idx].updated_at = new Date().toISOString();
  write('incidents', incidents);
  logAction({ userId:req.user.id, action:'UPDATE_INCIDENT', targetType:'incident', targetId:req.params.id, metadata:{ status:incidents[idx].status } });
  res.json(incidents[idx]);
});

router.delete('/:id', authenticate, requireMinRole('super_admin'), (req,res) => {
  let incidents = read('incidents');
  if (!incidents.find(i => i.id===req.params.id)) return res.status(404).json({ error:'Not found' });
  write('incidents', incidents.filter(i => i.id!==req.params.id));
  logAction({ userId:req.user.id, action:'DELETE_INCIDENT', targetType:'incident', targetId:req.params.id });
  res.json({ success:true });
});

module.exports = router;
