const administratorModel = require('../models/administratorModel');
const recipientModel = require('../models/recipientModel');

const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;

module.exports.recipientRegister = async (req, res, next) => {
  try {
    const { full_name, recipient_email, password, wallet_address } = req.body;
    if (!full_name || !recipient_email || !password || !wallet_address) {
      return res.status(400).send({ message: 'full_name, recipient_email, password, and wallet_address are required.' });
    }
    if (!WALLET_RE.test(wallet_address)) {
      return res.status(400).send({ message: 'Invalid wallet address format.' });
    }
    const existing = await recipientModel.findByEmail(recipient_email);
    if (existing) return res.status(409).send({ message: 'Email or wallet address already exists.' });

    const recipient = await recipientModel.create(full_name, password, recipient_email, wallet_address);
    req.session.recipient_id = recipient.recipient_id;
    res.status(201).send(recipient);
  } catch (err) {
    if (err.code === '23505') return res.status(409).send({ message: 'Email or wallet address already exists.' });
    next(err);
  }
};

module.exports.recipientLogin = async (req, res, next) => {
  try {
    const { recipient_email, password } = req.body;
    if (!recipient_email || !password) {
      return res.status(400).send({ message: 'recipient_email and password are required.' });
    }
    const recipient = await recipientModel.validatePassword(recipient_email, password);
    if (!recipient) return res.status(401).send({ message: 'Invalid credentials.' });
    req.session.recipient_id = recipient.recipient_id;
    res.send({ recipient_id: recipient.recipient_id, full_name: recipient.full_name });
  } catch (err) {
    next(err);
  }
};

module.exports.adminLogin = async (req, res, next) => {
  try {
    const { administrator_name, password } = req.body;
    if (!administrator_name || !password) {
      return res.status(400).send({ message: 'administrator_name and password are required.' });
    }
    const admin = await administratorModel.validatePassword(administrator_name, password);
    if (!admin) return res.status(401).send({ message: 'Invalid credentials.' });
    req.session.admin_id = admin.administrator_id;
    res.send({ administrator_id: admin.administrator_id, administrator_name: admin.administrator_name });
  } catch (err) {
    next(err);
  }
};

module.exports.getMe = async (req, res, next) => {
  try {
    if (req.session.admin_id) {
      const admin = await administratorModel.find(req.session.admin_id);
      return res.json({ role: 'admin', ...admin });
    }
    if (req.session.recipient_id) {
      const recipient = await recipientModel.find(req.session.recipient_id);
      return res.json({ role: 'recipient', ...recipient });
    }
    res.json(null);
  } catch (err) {
    next(err);
  }
};

module.exports.logout = (req, res) => {
  req.session = null;
  res.send({ message: 'Logged out.' });
};
