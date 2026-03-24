const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { read, write } = require('../store');
const { authenticate } = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');
const { logAction } = require('./audit');
const router = express.Router();
router.get('/', authenticate, (req, res) => {
  const incidents = read('incidents');
  const users = read('users');
  const { status, severity, type } = req.query;
  let filtered = incidents;
  if (status) filtered = filtered.filter(i => i.status === status);
  if (severity) filtered = filtered.filter(i => i.severity === severity);
  if (type) filtered = filtered.filter(i => i.type === type);
  const enriched = filtered.map(inc => {
    const reporter = users.find(u => u.id === inc.reported_by);
    const assignee = users.find(u => u.id === inc.assigned_to);
    return { ...inc, reporter_name: reporter ? reporter.name : 'Unknown', assignee_name: assignee ? assignee.name : 'Unassigned' };
  });
  res.json(enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});
router.get('/stats', authenticate, (req, res) => {
  const incidents = read('incidents');
  const stats = { total: incidents.length, by_status: {}, by_severity: {}, by_type: {} };
  incidents.forEach(i => {
    stats.by_status[i.status] = (stats.by_status[i.status] || 0) + 1;
    stats.by_severity[i.severity] = (stats.by_severity[i.severity] || 0) + 1;
    stats.by_type[i.type] = (stats.by_type[i.type] || 0) + 1;
  });
  res.json(stats);
});
router.get('/:id', authenticate, (req, res) => {
  const incidents = read('incidents');
  const users = read('users');
  const knowledge = read('knowledge');
  const inc = incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: 'Incident not found' });
  const reporter = users.find(u => u.id === inc.reported_by);
  const assignee = users.find(u => u.id === inc.assigned_to);
  const related = knowledge.filter(k => k.status === 'active' && (k.incident_id === inc.id || k.tags.some(tag => inc.type && inc.type.toLowerCase().includes(tag.toLowerCase()))));
  res.json({ ...inc, reporter_name: reporter ? reporter.name : 'Unknown', assignee_name: assignee ? assignee.name : 'Unassigned', related_knowledge: related });
});
router.post('/', authenticate, requireMinRole('analyst'), (req, res) => {
  const { title, type, severity, description, entities } = req.body;
  if (!title || !type || !severity) return res.status(400).json({ error: 'title, type, severity required' });
  const incidents = read('incidents');
  const newInc = { id: 'inc' + uuidv4().slice(0,8), title, type, severity, status: 'open', description: description || '', entities: entities || {}, reported_by: req.user.id, assigned_to: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  incidents.push(newInc);
  write('incidents', incidents);
  logAction({ userId: req.user.id, action: 'CREATE_INCIDENT', targetType: 'incident', targetId: newInc.id, metadata: { title, severity } });
  res.status(201).json(newInc);
});
router.put('/:id', authenticate, requireMinRole('analyst'), (req, res) => {
  const incidents = read('incidents');
  const idx = incidents.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Incident not found' });
  ['title','status','severity','description','assigned_to','entities','type'].forEach(f => { if (req.body[f] !== undefined) incidents[idx][f] = req.body[f]; });
  incidents[idx].updated_at = new Date().toISOString();
  write('incidents', incidents);
  logAction({ userId: req.user.id, action: 'UPDATE_INCIDENT', targetType: 'incident', targetId: req.params.id, metadata: { status: incidents[idx].status } });
  res.json(incidents[idx]);
});
router.delete('/:id', authenticate, requireMinRole('super_admin'), (req, res) => {
  let incidents = read('incidents');
  if (!incidents.find(i => i.id === req.params.id)) return res.status(404).json({ error: 'Not found' });
  incidents = incidents.filter(i => i.id !== req.params.id);
  write('incidents', incidents);
  logAction({ userId: req.user.id, action: 'DELETE_INCIDENT', targetType: 'incident', targetId: req.params.id });
  res.json({ success: true });
});
module.exports = router;
