const checkAdmin = (req, res, next) => {
  if (!req.session.admin_id) {
    return res.status(req.session.recipient_id ? 403 : 401).send({ message: 'Admin access required.' });
  }
  next();
};

module.exports = checkAdmin;
