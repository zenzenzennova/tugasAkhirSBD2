const router = require('express').Router();
const { getReturns, getReturnById, createReturn } = require('../controllers/returnController');
const auth = require('../middleware/auth');

router.get('/', auth, getReturns);
router.get('/:id', auth, getReturnById);
router.post('/', auth, createReturn);

module.exports = router;
