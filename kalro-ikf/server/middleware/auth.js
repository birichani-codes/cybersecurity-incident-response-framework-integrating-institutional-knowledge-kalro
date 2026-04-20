const jwt = require('jsonwebtoken');
const { read } = require('../store');
const JWT_SECRET = process.env.JWT_SECRET || 'kalro-ikf-secret-2024';
const authenticate = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error:'No token provided' });
  try {
    const d = jwt.verify(h.split(' ')[1], JWT_SECRET);
    const user = read('users').find(u => u.id === d.id);
    if (!user) return res.status(401).json({ error:'User not found' });
    req.user = { id:user.id, name:user.name, email:user.email, role:user.role };
    next();
  } catch(e) { res.status(401).json({ error:'Invalid or expired token' }); }
};
module.exports = { authenticate, JWT_SECRET };
