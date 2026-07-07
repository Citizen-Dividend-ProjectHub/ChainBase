const checkRecipient = (req, res, next) => {
  if (!req.session.recipient_id) {
    return res.status(401).send({ message: 'You must be logged in.' });
  }
  next();
};

module.exports = checkRecipient;
