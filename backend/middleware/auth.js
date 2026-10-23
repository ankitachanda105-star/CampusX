const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'campusx_jwt_secret_key_secure_2026_salt_987654321';

/**
 * Middleware to authenticate requests using JWT Bearer token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No Bearer token provided in Authorization header.',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.',
        error: err.message,
      });
    }

    req.user = decodedUser;
    next();
  });
}

/**
 * Role authorization middleware factory
 * @param  {...string} allowedRoles - List of roles permitted to access the route
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'User authentication context missing.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};
