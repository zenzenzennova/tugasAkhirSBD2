const router = require('express').Router();
const { getDailyReport } = require('../controllers/reportController');
const auth = require('../middleware/auth');
const { requireOwner } = require('../middleware/roleCheck');

router.get('/daily', auth, requireOwner, getDailyReport);

module.exports = router;
