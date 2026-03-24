const express = require('express');
const { read } = require('../store');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const router = express.Router();
router.get('/summary', authenticate, requireRole('super_admin'), (req, res) => {
  const incidents = read('incidents');
  const knowledge = read('knowledge');
  const users = read('users');
  const logs = read('audit_logs');
  const active = knowledge.filter(k => k.status === 'active');
  const avgConf = active.length ? (active.reduce((s, k) => s + k.confidence_score, 0) / active.length).toFixed(2) : 0;
  res.json({ total_incidents: incidents.length, open_incidents: incidents.filter(i => ['open','investigating','escalated'].includes(i.status)).length, resolved_incidents: incidents.filter(i => i.status === 'resolved').length, total_knowledge: knowledge.length, active_knowledge: active.length, avg_confidence: parseFloat(avgConf), total_users: users.length, total_audit_events: logs.length });
});
module.exports = router;
