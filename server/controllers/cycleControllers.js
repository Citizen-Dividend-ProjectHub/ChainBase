const disbursementCycleModel = require('../models/disbursementCycleModel');
const disbursementModel = require('../models/disbursementModel');
const recipientModel = require('../models/recipientModel');
const fundingPoolModel = require('../models/fundingPoolModel');
const auditLogModel = require('../models/auditLogModel');

const VALID_STATUSES = new Set(['pending', 'processing', 'completed', 'failed']);

module.exports.listCycles = async (req, res, next) => {
  try {
    const { status } = req.query;
    if (status && !VALID_STATUSES.has(status)) {
      return res.status(400).send({ message: 'Invalid status filter.' });
    }
    const cycles = await disbursementCycleModel.listAll(status || null);
    res.send(cycles);
  } catch (err) {
    next(err);
  }
};

module.exports.getCycle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cycle = await disbursementCycleModel.find(id);
    if (!cycle) return res.status(404).send({ message: 'Cycle not found.' });

    const disbursements = await disbursementModel.listByCycle(id);
    res.send({ ...cycle, disbursements });
  } catch (err) {
    next(err);
  }
};

module.exports.createCycle = async (req, res, next) => {
  try {
    const { scheduled_date, amount_per_recipient } = req.body;
    if (!scheduled_date || !amount_per_recipient) {
      return res.status(400).send({ message: 'scheduled_date and amount_per_recipient are required.' });
    }
    // Snapshot current eligible recipient count
    const eligible = await recipientModel.listEligible();
    const cycle = await disbursementCycleModel.create(scheduled_date, amount_per_recipient, eligible.length);
    res.status(201).send(cycle);
  } catch (err) {
    next(err);
  }
};

module.exports.triggerCycle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cycle = await disbursementCycleModel.find(id);
    if (!cycle) return res.status(404).send({ message: 'Cycle not found.' });
    if (cycle.status !== 'pending') {
      return res.status(409).send({ message: 'Cycle is not in pending status.' });
    }

    const eligible = await recipientModel.listEligible();
    const totalCost = eligible.length * Number(cycle.amount_per_recipient);
    const pool = await fundingPoolModel.get();
    if (!pool || Number(pool.balance) < totalCost) {
      return res.status(409).send({ message: 'Insufficient funds in the funding pool.' });
    }

    // Mark cycle as processing
    const triggered = await disbursementCycleModel.trigger(id, req.session.admin_id, eligible.length);

    // Create a disbursement record for each eligible recipient
    await disbursementModel.createBatch(id, eligible, cycle.amount_per_recipient);

    await auditLogModel.create(
      req.session.admin_id,
      'trigger_disbursement',
      null,
      `Triggered cycle ${id} for ${eligible.length} recipients at ${cycle.amount_per_recipient} each`
    );

    // 202 Accepted — on-chain execution is async; poll GET /api/cycles/:id for status
    res.status(202).send(triggered);
  } catch (err) {
    next(err);
  }
};
