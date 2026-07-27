function requireAuth(req, res, next){
  if(req.isAuthenticated && req.isAuthenticated()) return next();
  res.status(401).json({ error:'not_authenticated' });
}

function requireAdmin(req, res, next){
  if(req.isAuthenticated && req.isAuthenticated() && req.user && req.user.isAdmin) return next();
  res.status(403).json({ error:'forbidden' });
}

module.exports = { requireAuth, requireAdmin };
