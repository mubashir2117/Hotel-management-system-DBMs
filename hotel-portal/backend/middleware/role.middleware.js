function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin access required' });
}

function requireGuest(req, res, next) {
  if (req.user && req.user.role === 'guest') return next();
  return res.status(403).json({ message: 'Guest access required' });
}

module.exports = { requireAdmin, requireGuest };
