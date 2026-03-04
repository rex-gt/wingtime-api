const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const result = await pool.query('SELECT id, member_number, first_name, last_name, email, phone, role, is_active FROM members WHERE id = $1', [decoded.id]);
      const user = result.rows[0];
      if (!user) return res.status(401).json({ message: 'Not authorized, user not found' });

      req.user = { id: user.id, member_number: user.member_number, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role, is_active: user.is_active };
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }
  return next();
};

module.exports = { protect, authorize };
