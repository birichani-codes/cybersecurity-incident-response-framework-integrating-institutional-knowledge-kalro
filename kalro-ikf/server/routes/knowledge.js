const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { read, write } = require('../store');
const { authenticate } = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');
const { logAction } = require('./audit');
const router = express.Router();
router.get('/', authenticate, (req, res) => {
  const knowledge = read('knowledge');
  const users = read('users');
  const { status, tag } = req.query;
  let filtered = knowledge;
  if (status) filtered = filtered.filter(k => k.status === status);
  else filtered = filtered.filter(k => k.status !== 'superseded');
  if (tag) filtered = filtered.filter(k => k.tags.includes(tag));
  const enriched = filtered.map(k => { const c = users.find(u => u.id === k.contributor_id); return { ...k, contributor_name: c ? c.name : 'Unknown' }; });
  res.json(enriched.sort((a, b) => b.confidence_score - a.confidence_score));
});
router.get('/:id', authenticate, (req, res) => {
  const knowledge = read('knowledge');
  const users = read('users');
  const annotations = read('annotations');
  const entry = knowledge.find(k => k.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  const contributor = users.find(u => u.id === entry.contributor_id);
  const entryAnnotations = annotations.filter(a => a.knowledge_id === entry.id).map(a => { const u = users.find(u => u.id === a.user_id); return { ...a, user_name: u ? u.name : 'Unknown' }; });
  const versions = knowledge.filter(k => k.id === entry.id || k.superseded_by === entry.id || entry.superseded_by === k.id);
  res.json({ ...entry, contributor_name: contributor ? contributor.name : 'Unknown', annotations: entryAnnotations, version_history: versions });
});
router.post('/', authenticate, requireMinRole('analyst'), (req, res) => {
  const { title, content, tags, incident_id } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  const knowledge = read('knowledge');
  const newEntry = { id: 'k' + uuidv4().slice(0,8), title, content, tags: tags || [], incident_id: incident_id || null, contributor_id: req.user.id, confidence_score: 1.0, version: 1, superseded_by: null, status: 'active', use_count: 0, last_used_at: null, created_at: new Date().toISOString() };
  knowledge.push(newEntry);
  write('knowledge', knowledge);
  logAction({ userId: req.user.id, action: 'CREATE_KNOWLEDGE', targetType: 'knowledge', targetId: newEntry.id, metadata: { title } });
  res.status(201).json(newEntry);
});
router.put('/:id', authenticate, requireMinRole('analyst'), (req, res) => {
  const knowledge = read('knowledge');
  const idx = knowledge.findIndex(k => k.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const old = knowledge[idx];
  const { title, content, tags, status } = req.body;
  if (req.body.new_version) {
    const newEntry = { id: 'k' + uuidv4().slice(0,8), title: title || old.title, content: content || old.content, tags: tags || old.tags, incident_id: old.incident_id, contributor_id: req.user.id, confidence_score: 1.0, version: old.version + 1, superseded_by: null, status: 'active', use_count: 0, last_used_at: null, created_at: new Date().toISOString() };
    knowledge[idx].superseded_by = newEntry.id;
    knowledge[idx].status = 'superseded';
    knowledge.push(newEntry);
    write('knowledge', knowledge);
    return res.status(201).json(newEntry);
  }
  if (title) knowledge[idx].title = title;
  if (content) knowledge[idx].content = content;
  if (tags) knowledge[idx].tags = tags;
  if (status) knowledge[idx].status = status;
  write('knowledge', knowledge);
  res.json(knowledge[idx]);
});
router.post('/:id/use', authenticate, (req, res) => {
  const knowledge = read('knowledge');
  const idx = knowledge.findIndex(k => k.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  knowledge[idx].use_count += 1;
  knowledge[idx].last_used_at = new Date().toISOString();
  knowledge[idx].confidence_score = Math.min(1.0, knowledge[idx].confidence_score + 0.02);
  write('knowledge', knowledge);
  res.json({ success: true, use_count: knowledge[idx].use_count });
});
router.post('/:id/annotate', authenticate, requireMinRole('analyst'), (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: 'note required' });
  const knowledge = read('knowledge');
  if (!knowledge.find(k => k.id === req.params.id)) return res.status(404).json({ error: 'Not found' });
  const annotations = read('annotations');
  const newAnnotation = { id: 'a' + uuidv4().slice(0,8), knowledge_id: req.params.id, user_id: req.user.id, note, created_at: new Date().toISOString() };
  annotations.push(newAnnotation);
  write('annotations', annotations);
  const users = read('users');
  const user = users.find(u => u.id === req.user.id);
  res.status(201).json({ ...newAnnotation, user_name: user ? user.name : 'Unknown' });
});
module.exports = router;
