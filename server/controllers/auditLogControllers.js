const auditLogModel = require('../models/auditLogModel');

module.exports.listAuditLog = async (req, res, next) => {
  try {
    const { action_type } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const logs = await auditLogModel.listAll(action_type || null, limit, offset);
    res.send(logs);
  } catch (err) {
    next(err);
  }
};
