const express = require('express');
const { read, write } = require('../store');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { logAction } = require('./audit');
const router = express.Router();

/**
 * GET /sync/stations
 * List all known stations and their sync status
 */
router.get('/stations', authenticate, requireRole('super_admin'), (req, res) => {
  const incidents = read('incidents');
  const knowledge = read('knowledge');
  const users = read('users');

  // Aggregate station metadata
  const stations = {};
  
  incidents.forEach(inc => {
    const station = inc.station_id || 'Site A';
    if (!stations[station]) {
      stations[station] = {
        name: station,
        total_incidents: 0,
        open_incidents: 0,
        users: 0,
        local_routines: 0,
        synced_at: new Date().toISOString()
      };
    }
    stations[station].total_incidents++;
    if (inc.status === 'open' || inc.status === 'investigating') {
      stations[station].open_incidents++;
    }
  });

  users.forEach(u => {
    if (u.station_id) {
      if (!stations[u.station_id]) {
        stations[u.station_id] = {
          name: u.station_id,
          total_incidents: 0,
          open_incidents: 0,
          users: 0,
          local_routines: 0,
          synced_at: new Date().toISOString()
        };
      }
      stations[u.station_id].users++;
    }
  });

  knowledge.forEach(k => {
    if (k.station_id && !k.global_routine) {
      if (!stations[k.station_id]) {
        stations[k.station_id] = {
          name: k.station_id,
          total_incidents: 0,
          open_incidents: 0,
          users: 0,
          local_routines: 0,
          synced_at: new Date().toISOString()
        };
      }
      stations[k.station_id].local_routines++;
    }
  });

  res.json(Object.values(stations));
});

/**
 * GET /sync/pending-approvals
 * Super Admin view: routines pending approval for global sync
 */
router.get('/pending-approvals', authenticate, requireRole('super_admin'), (req, res) => {
  const knowledge = read('knowledge');
  const users = read('users');

  const pending = knowledge.filter(k => k.sync_status === 'pending').map(k => {
    const contributor = users.find(u => u.id === k.contributor_id);
    return {
      id: k.id,
      title: k.title,
      station_id: k.station_id || 'Unknown',
      contributor: contributor?.name || 'Unknown',
      pushed_at: k.pushed_at,
      content_preview: k.content.substring(0, 150) + '...',
      tags: k.tags
    };
  });

  res.json(pending);
});

/**
 * POST /sync/approve/:knowledgeId
 * Super Admin: approve a local routine for global sync
 */
router.post('/approve/:knowledgeId', authenticate, requireRole('super_admin'), (req, res) => {
  const knowledge = read('knowledge');
  const idx = knowledge.findIndex(k => k.id === req.params.knowledgeId);

  if (idx === -1) return res.status(404).json({ error: 'Knowledge entry not found' });

  knowledge[idx].sync_status = 'approved';
  knowledge[idx].global_routine = true;
  knowledge[idx].approved_by = req.user.id;
  knowledge[idx].approved_at = new Date().toISOString();

  write('knowledge', knowledge);

  logAction({
    userId: req.user.id,
    action: 'APPROVE_ROUTINE_GLOBAL_SYNC',
    targetType: 'knowledge',
    targetId: req.params.knowledgeId,
    metadata: { station_id: knowledge[idx].station_id }
  });

  res.json({ success: true, entry: knowledge[idx] });
});

/**
 * POST /sync/reject/:knowledgeId
 * Super Admin: reject a routine for global sync
 */
router.post('/reject/:knowledgeId', authenticate, requireRole('super_admin'), (req, res) => {
  const { reason } = req.body;
  const knowledge = read('knowledge');
  const idx = knowledge.findIndex(k => k.id === req.params.knowledgeId);

  if (idx === -1) return res.status(404).json({ error: 'Knowledge entry not found' });

  knowledge[idx].sync_status = 'rejected';
  knowledge[idx].rejection_reason = reason || '';
  knowledge[idx].rejected_by = req.user.id;
  knowledge[idx].rejected_at = new Date().toISOString();

  write('knowledge', knowledge);

  logAction({
    userId: req.user.id,
    action: 'REJECT_ROUTINE_GLOBAL_SYNC',
    targetType: 'knowledge',
    targetId: req.params.knowledgeId,
    metadata: { reason, station_id: knowledge[idx].station_id }
  });

  res.json({ success: true, entry: knowledge[idx] });
});

/**
 * GET /sync/global-routines
 * Get all globally approved routines for distribution to spokes
 */
router.get('/global-routines', authenticate, (req, res) => {
  const knowledge = read('knowledge');
  const global = knowledge.filter(k => k.global_routine && k.status === 'active');
  res.json(global);
});

/**
 * GET /sync/local-cache
 * Local station: get routines available locally (global + own station)
 */
router.get('/local-cache', authenticate, (req, res) => {
  const knowledge = read('knowledge');
  const userStation = req.user.station_id || 'Site A';

  const local = knowledge.filter(k =>
    k.status === 'active' && (
      k.global_routine ||
      k.station_id === userStation ||
      !k.station_id
    )
  );

  res.json(local);
});

/**
 * POST /sync/pull-updates
 * Local station: manually pull updates from hub
 */
router.post('/pull-updates', authenticate, (req, res) => {
  const userStation = req.user.station_id || 'Site A';
  const knowledge = read('knowledge');
  const global = knowledge.filter(k => k.global_routine && k.status === 'active');

  logAction({
    userId: req.user.id,
    action: 'PULL_UPDATES_FROM_HUB',
    targetType: 'station',
    targetId: userStation,
    metadata: { routines_pulled: global.length }
  });

  res.json({
    success: true,
    station: userStation,
    global_routines_count: global.length,
    pulled_at: new Date().toISOString(),
    routines: global
  });
});

/**
 * GET /sync/status/:stationId
 * Get sync health and last update for a specific station
 */
router.get('/status/:stationId', authenticate, requireRole('super_admin'), (req, res) => {
  const { stationId } = req.params;
  const knowledge = read('knowledge');
  const incidents = read('incidents');
  const users = read('users');

  const stationIncidents = incidents.filter(i => i.station_id === stationId);
  const stationUsers = users.filter(u => u.station_id === stationId);
  const stationRoutines = knowledge.filter(k => k.station_id === stationId && !k.global_routine);
  const globalRoutines = knowledge.filter(k => k.global_routine);

  const status = {
    station_id: stationId,
    total_incidents: stationIncidents.length,
    open_incidents: stationIncidents.filter(i => i.status === 'open' || i.status === 'investigating').length,
    total_users: stationUsers.length,
    local_routines: stationRoutines.length,
    global_routines_available: globalRoutines.length,
    last_sync: new Date().toISOString(),
    pending_approvals: knowledge.filter(k => k.station_id === stationId && k.sync_status === 'pending').length,
    health: stationIncidents.length > 0 ? 'active' : 'quiet'
  };

  res.json(status);
});

module.exports = router;
