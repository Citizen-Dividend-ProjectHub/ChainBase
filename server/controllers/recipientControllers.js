const recipientModel = require('../models/recipientModel');
const auditLogModel = require('../models/auditLogModel');

const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;

module.exports.listRecipients = async (req, res, next) => {
  try {
    const { is_eligible } = req.query;
    let filter = null;
    if (is_eligible === 'true') filter = true;
    if (is_eligible === 'false') filter = false;
    const recipients = await recipientModel.listAll(filter);
    res.send(recipients);
  } catch (err) {
    next(err);
  }
};

module.exports.getRecipient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recipient = await recipientModel.find(id);
    if (!recipient) return res.status(404).send({ message: 'Recipient not found.' });

    // A recipient can only fetch their own record; admins can fetch any
    if (req.session.role === 'recipient' && req.session.recipient_id !== recipient.recipient_id) {
      return res.status(403).send({ message: 'Not authorized.' });
    }

    res.send(recipient);
  } catch (err) {
    next(err);
  }
};

// Admin-only enrollment path (distinct from self-registration)
module.exports.enrollRecipient = async (req, res, next) => {
  try {
    const { full_name, recipient_email, wallet_address } = req.body;
    if (!full_name || !recipient_email || !wallet_address) {
      return res.status(400).send({ message: 'full_name, recipient_email, and wallet_address are required.' });
    }
    if (!WALLET_RE.test(wallet_address)) {
      return res.status(400).send({ message: 'Invalid wallet address format.' });
    }

    // Generate a temporary password — admin-enrolled recipients must reset it
    const tempPassword = Math.random().toString(36).slice(-10);
    const recipient = await recipientModel.create(full_name, tempPassword, recipient_email, wallet_address, req.session.admin_id);

    await auditLogModel.create(req.session.admin_id, 'enroll_recipient', recipient.recipient_id, `Enrolled ${full_name}`);
    res.status(201).send(recipient);
  } catch (err) {
    if (err.code === '23505') return res.status(409).send({ message: 'Email or wallet address already exists.' });
    next(err);
  }
};

module.exports.revokeRecipient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recipient = await recipientModel.find(id);
    if (!recipient) return res.status(404).send({ message: 'Recipient not found.' });

    const updated = await recipientModel.revoke(id);
    await auditLogModel.create(req.session.admin_id, 'revoke_recipient', recipient.recipient_id, `Revoked ${recipient.full_name}`);
    res.send(updated);
  } catch (err) {
    next(err);
  }
};

module.exports.reinstateRecipient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recipient = await recipientModel.find(id);
    if (!recipient) return res.status(404).send({ message: 'Recipient not found.' });

    const updated = await recipientModel.reinstate(id);
    await auditLogModel.create(req.session.admin_id, 'reinstate_recipient', recipient.recipient_id, `Reinstated ${recipient.full_name}`);
    res.send(updated);
  } catch (err) {
    next(err);
  }
};
