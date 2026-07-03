const pool = require('../config/db');

// Static categories for backward compatibility
const categoriesList = [
  { id: 1, name: "Jam Tangan Analog", watch_type: "analog", brand_origin: "impor", description: "Jam tangan analog merek internasional", created_at: "2026-07-03T00:00:00.000Z", total_products: 0 },
  { id: 2, name: "Jam Tangan Digital", watch_type: "digital", brand_origin: "impor", description: "Jam tangan digital merek internasional", created_at: "2026-07-03T00:00:00.000Z", total_products: 0 },
  { id: 3, name: "Smartwatch", watch_type: "smartwatch", brand_origin: "impor", description: "Smartwatch merek internasional", created_at: "2026-07-03T00:00:00.000Z", total_products: 0 }
];

// GET /api/categories
const getCategories = async (req, res) => {
  try {
    // Count active products for each category
    const result = await pool.query(
      `SELECT category_id, COUNT(*) AS cnt 
       FROM products 
       WHERE is_active = TRUE 
       GROUP BY category_id`
    );
    const counts = {};
    result.rows.forEach(row => {
      counts[row.category_id] = parseInt(row.cnt, 10);
    });

    const data = categoriesList.map(cat => ({
      ...cat,
      total_products: counts[cat.id] || 0
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('getCategories error:', err);
    return res.status(200).json({ success: true, data: categoriesList });
  }
};

// POST /api/categories
const createCategory = async (req, res) => {
  return res.status(403).json({ success: false, error: 'Modifikasi kategori tidak diperbolehkan.' });
};

// PUT /api/categories/:id
const updateCategory = async (req, res) => {
  return res.status(403).json({ success: false, error: 'Modifikasi kategori tidak diperbolehkan.' });
};

// DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
  return res.status(403).json({ success: false, error: 'Modifikasi kategori tidak diperbolehkan.' });
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
