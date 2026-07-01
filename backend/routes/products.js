const router = require('express').Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
} = require('../controllers/productController');
const auth = require('../middleware/auth');
const { requireOwner } = require('../middleware/roleCheck');

router.get('/', auth, getProducts);
router.get('/:id', auth, getProductById);
router.post('/', auth, requireOwner, createProduct);
router.put('/:id', auth, requireOwner, updateProduct);
router.delete('/:id', auth, requireOwner, deleteProduct);
router.patch('/:id/stock', auth, requireOwner, updateStock);

module.exports = router;
