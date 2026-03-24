const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { read, write } = require('../store');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const router = express.Router();
const logAction = ({ userId, action, targetType = null, targetId = null, metadata = {} }) => {
  const logs = read('audit_logs');
  logs.unshift({ id: 'log' + uuidv4().slice(0,8), user_id: userId, action, target_type: targetType, target_id: targetId, metadata, created_at: new Date().toISOString() });
  write('audit_logs', logs);
};
router.get('/', authenticate, requireRole('super_admin'), (req, res) => {
  const logs = read('audit_logs');
  const users = read('users');
  const enriched = logs.map(log => {
    const user = users.find(u => u.id === log.user_id);
    return { ...log, user_name: user ? user.name : 'Unknown', user_role: user ? user.role : null };
  });
  res.json(enriched);
});
module.exports = { router, logAction };
