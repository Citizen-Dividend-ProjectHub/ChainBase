const fundingPoolModel = require('../models/fundingPoolModel');

module.exports.getPool = async (req, res, next) => {
  try {
    const pool = await fundingPoolModel.get();
    if (!pool) return res.status(404).send({ message: 'Funding pool not initialized.' });
    res.send(pool);
  } catch (err) {
    next(err);
  }
};

// Stub for on-chain balance sync — replace with real contract call when the
// blockchain integration is wired up.
module.exports.syncPool = async (req, res, next) => {
  try {
    // TODO: call smart contract to read on-chain USDC balance, then update
    // const onChainBalance = await contract.getBalance();
    // const updated = await fundingPoolModel.updateBalance(onChainBalance);
    // res.send(updated);

    return res.status(502).send({ message: 'Chain sync not yet implemented.' });
  } catch (err) {
    next(err);
  }
};
