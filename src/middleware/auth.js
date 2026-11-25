function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }
    const userRole = req.session.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: `Access denied. Requires one of: ${allowedRoles.join(', ')}` });
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
