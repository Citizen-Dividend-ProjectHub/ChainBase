const disbursementModel = require('../models/disbursementModel');
const recipientModel = require('../models/recipientModel');

module.exports.listByRecipient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recipient = await recipientModel.find(id);
    if (!recipient) return res.status(404).send({ message: 'Recipient not found.' });

    // A recipient can only fetch their own disbursements; admins can fetch any
    if (req.session.role === 'recipient' && req.session.recipient_id !== recipient.recipient_id) {
      return res.status(403).send({ message: 'Not authorized.' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const disbursements = await disbursementModel.listByRecipient(id, limit, offset);
    res.send(disbursements);
  } catch (err) {
    next(err);
  }
};

module.exports.getDisbursement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const disbursement = await disbursementModel.find(id);
    if (!disbursement) return res.status(404).send({ message: 'Disbursement not found.' });

    // Recipients may only view their own disbursements
    if (req.session.role === 'recipient' && req.session.recipient_id !== disbursement.recipient_id) {
      return res.status(403).send({ message: 'Not authorized.' });
    }

    res.send(disbursement);
  } catch (err) {
    next(err);
  }
};
