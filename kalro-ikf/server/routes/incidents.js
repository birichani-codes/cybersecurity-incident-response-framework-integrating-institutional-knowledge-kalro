const express = require('express');
const { v4: uuid } = require('uuid');
const { read, write } = require('../store');
const { authenticate } = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');
const { logAction } = require('./audit');
const gameTheory = require('../logic/game-theory');
const sosioTechnical = require('../logic/socio-technical');
const defensiveRoutines = require('../logic/defensive-routines');
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
  return {
    ...inc,
    site: inc.station_id || 'Site A',
    sla_deadline,
    sla_breached,
    sla_minutes_remaining,
    reporter_name:r?r.name:'Unknown',
    assignee_name:a?a.name:'Unassigned',
    ...(related!==undefined?{related_knowledge:related}:{})
  };
}

router.get('/', authenticate, (req,res) => {
  const { status, severity, type, is_major, station_id, scope } = req.query;
  const users = read('users'); const knowledge = read('knowledge');
  let f = read('incidents');
  if (status)   f = f.filter(i => i.status===status);
  if (severity) f = f.filter(i => i.severity===severity);
  if (type)     f = f.filter(i => i.type===type);
  if (is_major) f = f.filter(i => i.is_major===true);
  if (station_id) f = f.filter(i => i.station_id===station_id);
  if (scope==='local' && req.user.station_id) f = f.filter(i => i.station_id===req.user.station_id);
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
  const { title, type, severity, description, entities, is_major, station_id } = req.body;
  if (!title||!type||!severity) return res.status(400).json({ error:'title, type, severity required' });
  const incidents = read('incidents');
  const created_at = new Date().toISOString();
  const newInc = {
    id:'inc'+uuid().slice(0,8), title, type, severity, status:'open',
    is_major: is_major||false, description:description||'', entities:entities||{},
    reported_by:req.user.id, assigned_to:null,
    station_id: station_id || req.user.station_id || 'Site A',
    sla_deadline: computeSlaDeadline(severity, created_at),
    created_at, updated_at:created_at
  };
  incidents.push(newInc); write('incidents', incidents);
  logAction({ userId:req.user.id, action:'CREATE_INCIDENT', targetType:'incident', targetId:newInc.id, metadata:{ title, severity, is_major:newInc.is_major, station_id:newInc.station_id } });
  
  // Trigger notifications for incident alert
  const users = read('users');
  const notifs = read('notifications');
  const stationAnalysts = users.filter(u => 
    u.station_id === newInc.station_id && 
    (u.role === 'analyst' || u.role === 'super_admin')
  );
  stationAnalysts.forEach(analyst => {
    const notification = {
      id: Date.now().toString() + Math.random(),
      title: `🚨 New Incident at ${newInc.station_id}`,
      message: `${newInc.title} - ${newInc.description?.substring(0, 100)}...`,
      type: 'incident_alert',
      recipient_id: analyst.id,
      recipient_station_id: newInc.station_id,
      severity: severity,
      related_incident_id: newInc.id,
      action_url: `/incidents/${newInc.id}`,
      read: false,
      created_at: created_at,
      created_by: 'SYSTEM'
    };
    notifs.push(notification);
  });
  if (severity === 'critical' || is_major) {
    const superAdmins = users.filter(u => u.role === 'super_admin');
    superAdmins.forEach(admin => {
      const notification = {
        id: Date.now().toString() + Math.random(),
        title: `⚠️ ESCALATION: Critical Incident at ${newInc.station_id}`,
        message: `${newInc.title} - Severity: ${severity}`,
        type: 'escalation',
        recipient_id: admin.id,
        severity: 'critical',
        related_incident_id: newInc.id,
        action_url: `/incidents/${newInc.id}`,
        read: false,
        created_at: created_at,
        created_by: 'SYSTEM'
      };
      notifs.push(notification);
    });
  }
  write('notifications', notifs);
  
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

// ─── NEW: SOCIO-TECHNICAL ANALYSIS ────────────────────────────────────────

router.post('/:id/tag-socio-technical', authenticate, requireMinRole('analyst'), (req,res) => {
  const { technical_factors, social_factors } = req.body;
  if (!technical_factors || !social_factors) {
    return res.status(400).json({ error: 'technical_factors and social_factors required' });
  }

  try {
    const stsAnalysis = sosioTechnical.analyzeIncident(
      read('incidents').find(i => i.id === req.params.id),
      { technical_factors, social_factors }
    );
    
    const incident = sosioTechnical.tagIncidentSTS(req.params.id, stsAnalysis);
    
    logAction({
      userId: req.user.id,
      action: 'TAG_INCIDENT_STS',
      targetType: 'incident',
      targetId: req.params.id,
      metadata: { root_cause_type: stsAnalysis.root_cause_type, sts_risk_score: stsAnalysis.sts_risk_score }
    });

    res.json(incident);
  } catch(err) {
    res.status(404).json({ error: err.message });
  }
});

// ─── NEW: GAME THEORY ANALYSIS ────────────────────────────────────────────

router.post('/:id/calculate-game-theory', authenticate, requireMinRole('analyst'), (req,res) => {
  const incidents = read('incidents');
  const incident = incidents.find(i => i.id === req.params.id);
  
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  try {
    const payoffMatrix = gameTheory.calculatePayoffMatrix(incident, req.body.config);
    const nashEquilibrium = gameTheory.calculateNashEquilibrium(payoffMatrix, incident);
    
    const decision = gameTheory.recordStrategicDecision(
      req.params.id,
      { ...nashEquilibrium, payoffMatrix },
      req.user.id
    );

    logAction({
      userId: req.user.id,
      action: 'CALCULATE_GAME_THEORY',
      targetType: 'incident',
      targetId: req.params.id,
      metadata: { recommendation: nashEquilibrium.recommendedAction, confidence: nashEquilibrium.confidence }
    });

    res.json({
      payoff_matrix: payoffMatrix,
      nash_equilibrium: nashEquilibrium,
      strategic_decision: decision
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── NEW: GET STRATEGIC DECISIONS ────────────────────────────────────────

router.get('/:id/strategic-decisions', authenticate, (req,res) => {
  const incident = read('incidents').find(i => i.id === req.params.id);
  
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const decisions = incident.strategic_decisions || [];
  const users = read('users');

  const enriched = decisions.map(d => ({
    ...d,
    user_name: users.find(u => u.id === d.user_id)?.name || 'Unknown'
  }));

  res.json(enriched);
});

// ─── NEW: GET DEFENSIVE ROUTINES ─────────────────────────────────────────

router.get('/:id/defensive-routines', authenticate, (req,res) => {
  const incident = read('incidents').find(i => i.id === req.params.id);
  
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const suggestions = defensiveRoutines.suggestRoutines(incident);
  res.json(suggestions);
});

// ─── NEW: RECORD ROUTINE APPLICATION ─────────────────────────────────────

router.post('/:id/apply-routine/:knowledgeId', authenticate, requireMinRole('analyst'), (req,res) => {
  const { outcome } = req.body;

  try {
    const entry = defensiveRoutines.recordRoutineApplication(
      req.params.knowledgeId,
      req.params.id,
      outcome
    );

    logAction({
      userId: req.user.id,
      action: 'APPLY_DEFENSIVE_ROUTINE',
      targetType: 'knowledge',
      targetId: req.params.knowledgeId,
      metadata: { incident_id: req.params.id, success: outcome?.success }
    });

    res.json({ success: true, entry });
  } catch(err) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/:id/review-routine/:knowledgeId', authenticate, requireMinRole('super_admin'), (req,res) => {
  const { rating, comments } = req.body;
  if (rating === undefined || rating === null) {
    return res.status(400).json({ error: 'rating is required' });
  }

  try {
    const entry = defensiveRoutines.reviewRoutineEffectiveness(
      req.params.id,
      req.params.knowledgeId,
      { rating, comments, reviewed_by: req.user.id }
    );

    const incident = read('incidents').find(i => i.id === req.params.id);
    if (incident?.is_major) {
      const alerts = read('knowledge_alerts');
      alerts.push({
        id: 'pulse' + Math.random().toString(36).slice(2, 9),
        incident_id: incident.id,
        routine_id: entry.id,
        title: `Knowledge Alert: Major incident ${incident.type} reviewed`,
        summary: `A major incident was closed and the defensive routine '${entry.title}' was reviewed by super admin ${req.user.name || req.user.id}. Share this learning across sites.`,
        source_site: incident.site || 'Site A',
        target_site: 'All Sites',
        severity: 'high',
        status: 'new',
        created_at: new Date().toISOString(),
        created_by: req.user.id
      });
      write('knowledge_alerts', alerts);
    }

    logAction({
      userId: req.user.id,
      action: 'REVIEW_DEFENSIVE_ROUTINE',
      targetType: 'knowledge',
      targetId: req.params.knowledgeId,
      metadata: { incident_id: req.params.id, rating }
    });

    res.json({ success: true, entry });
  } catch(err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── NEW: GET RESILIENCE METRICS ─────────────────────────────────────────

router.get('/dashboard/resilience-metrics', authenticate, (req,res) => {
  try {
    const metrics = gameTheory.calculateResilienceMetrics();
    res.json(metrics);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
