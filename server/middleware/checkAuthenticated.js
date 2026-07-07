// Allows either an admin or a recipient session. Sets req.session.role for downstream use.
const checkAuthenticated = (req, res, next) => {
  if (req.session.admin_id) {
    req.session.role = 'admin';
    return next();
  }
  if (req.session.recipient_id) {
    req.session.role = 'recipient';
    return next();
  }
  res.status(401).send({ message: 'You must be logged in.' });
};

module.exports = checkAuthenticated;
