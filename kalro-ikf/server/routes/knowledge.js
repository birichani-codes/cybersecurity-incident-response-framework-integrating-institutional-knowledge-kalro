const express = require('express');
const { v4: uuid } = require('uuid');
const { read, write } = require('../store');
const { authenticate } = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');
const { logAction } = require('./audit');
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

module.exports = router;
