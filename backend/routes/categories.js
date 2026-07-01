const router = require('express').Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const auth = require('../middleware/auth');
const { requireOwner } = require('../middleware/roleCheck');

router.get('/', auth, getCategories);
router.post('/', auth, requireOwner, createCategory);
router.put('/:id', auth, requireOwner, updateCategory);
router.delete('/:id', auth, requireOwner, deleteCategory);

module.exports = router;
