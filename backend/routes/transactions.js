const router = require('express').Router();
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  getReceipt,
} = require('../controllers/transactionController');
const auth = require('../middleware/auth');

router.get('/', auth, getTransactions);
router.get('/:id/receipt', auth, getReceipt);
router.get('/:id', auth, getTransactionById);
router.post('/', auth, createTransaction);

module.exports = router;
