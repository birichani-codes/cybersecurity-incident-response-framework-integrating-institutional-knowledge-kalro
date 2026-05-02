const express = require('express');
const { v4: uuid } = require('uuid');
const { read, write } = require('../store');
const { authenticate } = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');
const { logAction } = require('./audit');
const defensiveRoutines = require('../logic/defensive-routines');
const router = express.Router();

router.get('/', authenticate, (req,res) => {
  const { status, tag, knowledge_type } = req.query;
  const users = read('users');
  let f = read('knowledge');
  if (status) f = f.filter(k => k.status===status);
  else f = f.filter(k => k.status!=='superseded');
  if (tag)            f = f.filter(k => k.tags.includes(tag));
  if (knowledge_type) f = f.filter(k => k.knowledge_type===knowledge_type);
  res.json(f.sort((a,b)=>b.confidence_score-a.confidence_score).map(k => {
    const c=users.find(u=>u.id===k.contributor_id); return {...k, contributor_name:c?c.name:'Unknown'};
  }));
});

router.get('/:id', authenticate, (req,res) => {
  const knowledge=read('knowledge'), users=read('users'), annotations=read('annotations');
  const entry = knowledge.find(k => k.id===req.params.id);
  if (!entry) return res.status(404).json({ error:'Not found' });
  const c = users.find(u=>u.id===entry.contributor_id);
  const versions = knowledge.filter(k=>k.id===entry.id||k.superseded_by===entry.id||entry.superseded_by===k.id);
  res.json({ ...entry, contributor_name:c?c.name:'Unknown',
    annotations: annotations.filter(a=>a.knowledge_id===entry.id).map(a=>{const u=users.find(u=>u.id===a.user_id);return{...a,user_name:u?u.name:'Unknown'};}),
    version_history: versions });
});

router.post('/', authenticate, requireMinRole('analyst'), (req,res) => {
  const { title, content, tags, incident_id, knowledge_type } = req.body;
  if (!title||!content) return res.status(400).json({ error:'title and content required' });
  const knowledge = read('knowledge');
  const newEntry = { id:'k'+uuid().slice(0,8), title, content, tags:tags||[], incident_id:incident_id||null,
    knowledge_type: knowledge_type||'lessons-learned', contributor_id:req.user.id,
    confidence_score:1.0, version:1, superseded_by:null, status:'active',
    use_count:0, last_used_at:null, created_at:new Date().toISOString() };
  knowledge.push(newEntry); write('knowledge', knowledge);
  logAction({ userId:req.user.id, action:'CREATE_KNOWLEDGE', targetType:'knowledge', targetId:newEntry.id, metadata:{ title, knowledge_type:newEntry.knowledge_type } });
  res.status(201).json(newEntry);
});

router.put('/:id', authenticate, requireMinRole('analyst'), (req,res) => {
  const knowledge = read('knowledge');
  const idx = knowledge.findIndex(k => k.id===req.params.id);
  if (idx===-1) return res.status(404).json({ error:'Not found' });
  const old = knowledge[idx];
  if (req.body.new_version) {
    const newEntry = { id:'k'+uuid().slice(0,8), title:req.body.title||old.title, content:req.body.content||old.content,
      tags:req.body.tags||old.tags, incident_id:old.incident_id, knowledge_type:old.knowledge_type,
      contributor_id:req.user.id, confidence_score:1.0, version:old.version+1,
      superseded_by:null, status:'active', use_count:0, last_used_at:null, created_at:new Date().toISOString() };
    knowledge[idx].superseded_by=newEntry.id; knowledge[idx].status='superseded';
    knowledge.push(newEntry); write('knowledge', knowledge);
    return res.status(201).json(newEntry);
  }
  ['title','content','tags','status','knowledge_type'].forEach(f => { if (req.body[f]!==undefined) knowledge[idx][f]=req.body[f]; });
  write('knowledge', knowledge);
  logAction({ userId:req.user.id, action:'UPDATE_KNOWLEDGE', targetType:'knowledge', targetId:req.params.id });
  res.json(knowledge[idx]);
});

router.post('/:id/use', authenticate, (req,res) => {
  const knowledge = read('knowledge');
  const idx = knowledge.findIndex(k => k.id===req.params.id);
  if (idx===-1) return res.status(404).json({ error:'Not found' });
  knowledge[idx].use_count+=1; knowledge[idx].last_used_at=new Date().toISOString();
  knowledge[idx].confidence_score=Math.min(1.0, knowledge[idx].confidence_score+0.02);
  write('knowledge', knowledge);
  logAction({ userId:req.user.id, action:'USE_KNOWLEDGE', targetType:'knowledge', targetId:req.params.id });
  res.json({ success:true, use_count:knowledge[idx].use_count });
});

router.post('/:id/annotate', authenticate, requireMinRole('analyst'), (req,res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error:'note required' });
  const knowledge = read('knowledge');
  if (!knowledge.find(k=>k.id===req.params.id)) return res.status(404).json({ error:'Not found' });
  const annotations = read('annotations');
  const newA = { id:'a'+uuid().slice(0,8), knowledge_id:req.params.id, user_id:req.user.id, note, created_at:new Date().toISOString() };
  annotations.push(newA); write('annotations', annotations);
  logAction({ userId:req.user.id, action:'ANNOTATE_KNOWLEDGE', targetType:'knowledge', targetId:req.params.id });
  const u = read('users').find(u=>u.id===req.user.id);
  res.status(201).json({ ...newA, user_name:u?u.name:'Unknown' });
});

// ─── NEW: DEFENSIVE ROUTINES ──────────────────────────────────────────────

router.post('/:id/link-routine', authenticate, requireMinRole('analyst'), (req,res) => {
  const { enabled, category, primary_goal, payoff_weight, nist_function, associated_scripts, institutional_enablers, socio_technical_focus, success_rate, times_applied, applicable_incident_types, prerequisites, estimated_cost, estimated_time_to_resolve, routine_signature } = req.body;

  try {
    const entry = defensiveRoutines.linkKnowledgeToRoutine(req.params.id, {
      enabled: enabled !== undefined ? enabled : true,
      category,
      primary_goal,
      payoff_weight,
      nist_function,
      associated_scripts,
      institutional_enablers,
      socio_technical_focus,
      success_rate,
      times_applied,
      applicable_incident_types,
      prerequisites,
      estimated_cost,
      estimated_time_to_resolve,
      routine_signature
    });

    logAction({
      userId: req.user.id,
      action: 'LINK_KNOWLEDGE_ROUTINE',
      targetType: 'knowledge',
      targetId: req.params.id,
      metadata: { category }
    });

    res.json(entry);
  } catch(err) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/from-pir/:pirId', authenticate, requireMinRole('super_admin'), (req,res) => {
  const { title, content, category, primary_goal, payoff_weight, nist_function, associated_scripts, institutional_enablers, socio_technical_focus, success_rate, times_applied, applicable_incident_types, prerequisites, estimated_cost, estimated_time_to_resolve, routine_signature } = req.body;
  const pirs = read('pirs');
  const knowledge = read('knowledge');
  const incidents = read('incidents');
  const pir = pirs.find(p => p.id === req.params.pirId);

  if (!pir) return res.status(404).json({ error:'PIR not found' });
  if (pir.status === 'converted') return res.status(409).json({ error:'PIR already converted' });

  const incident = incidents.find(i => i.id === pir.incident_id);
  const newEntry = {
    id:'k'+uuid().slice(0,8),
    title: title || `Routine from PIR: ${incident ? incident.title : pir.incident_id}`,
    content: content || `${pir.root_cause}\n\nWhat worked:\n${pir.what_worked || 'N/A'}\n\nWhat failed:\n${pir.what_failed || 'N/A'}`,
    tags: incident ? [incident.type, ...(incident.entities?.tags||[])] : [],
    incident_id: pir.incident_id,
    knowledge_type: 'defensive-routine',
    contributor_id: req.user.id,
    confidence_score: 0.75,
    version: 1,
    superseded_by: null,
    status: 'active',
    use_count: 0,
    last_used_at: null,
    created_at: new Date().toISOString(),
    defensive_routine: {
      enabled: true,
      category: category || 'response-checklist',
      primary_goal: primary_goal || '',
      payoff_weight: Math.min(1, Math.max(0, payoff_weight !== undefined ? payoff_weight : 0.5)),
      payoff_rating: null,
      nist_function: nist_function || 'PR',
      associated_scripts: associated_scripts || [],
      institutional_enablers: institutional_enablers || [],
      socio_technical_focus: socio_technical_focus || 'technical',
      success_rate: success_rate || 0.5,
      times_applied: times_applied || 0,
      avg_resolution_time: '0h',
      applicable_severities: ['critical', 'high', 'medium', 'low'],
      applicable_incident_types: applicable_incident_types || (incident ? [incident.type] : []),
      prerequisites: prerequisites || [],
      estimated_cost: estimated_cost || null,
      estimated_time_to_resolve: estimated_time_to_resolve || null,
      routine_signature: routine_signature || (incident ? [incident.type] : [])
    }
  };

  knowledge.push(newEntry);
  pir.status = 'converted';
  write('pirs', pirs);
  write('knowledge', knowledge);

  logAction({
    userId: req.user.id,
    action: 'CONVERT_PIR_TO_ROUTINE',
    targetType: 'knowledge',
    targetId: newEntry.id,
    metadata: { pir_id: pir.id, incident_id: pir.incident_id }
  });

  res.status(201).json(newEntry);
});

router.get('/defensive-routines/list', authenticate, (req,res) => {
  const knowledge = read('knowledge');
  const routines = knowledge.filter(k => k.defensive_routine && k.defensive_routine.enabled);
  
  const withContributors = routines.map(r => {
    const contributor = read('users').find(u => u.id === r.contributor_id);
    return {
      id: r.id,
      title: r.title,
      knowledge_type: r.knowledge_type,
      category: r.defensive_routine?.category,
      primary_goal: r.defensive_routine?.primary_goal,
      payoff_weight: r.defensive_routine?.payoff_weight,
      payoff_rating: r.defensive_routine?.payoff_rating,
      nist_function: r.defensive_routine?.nist_function,
      associated_scripts: r.defensive_routine?.associated_scripts,
      institutional_enablers: r.defensive_routine?.institutional_enablers,
      socio_technical_focus: r.defensive_routine?.socio_technical_focus,
      success_rate: r.defensive_routine?.success_rate,
      times_applied: r.defensive_routine?.times_applied,
      applicable_incident_types: r.defensive_routine?.applicable_incident_types,
      routine_signature: r.defensive_routine?.routine_signature,
      tags: r.tags,
      contributor_name: contributor?.name || 'Unknown',
      confidence_score: r.confidence_score,
      last_used_at: r.last_used_at
    };
  });

  res.json(withContributors.sort((a, b) => b.success_rate - a.success_rate));
});

router.get('/defensive-routines/metrics', authenticate, (req,res) => {
  try {
    const metrics = defensiveRoutines.getRoutineMetrics();
    res.json(metrics);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/defensive-routines/coverage', authenticate, (req,res) => {
  try {
    const coverage = defensiveRoutines.analyzeCoverage();
    res.json(coverage);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
