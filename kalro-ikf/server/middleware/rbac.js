const ROLE_HIERARCHY = { super_admin: 4, analyst: 3, viewer: 2, system: 1 };
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};
const requireMinRole = (minRole) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  if ((ROLE_HIERARCHY[req.user.role] || 0) < (ROLE_HIERARCHY[minRole] || 0))
    return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};
module.exports = { requireRole, requireMinRole };
