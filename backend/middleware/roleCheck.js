const requireOwner = (req, res, next) => {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ success: false, error: 'Akses ditolak. Hanya Owner yang diizinkan.' });
  }
  next();
};

module.exports = { requireOwner };
