const pool = require('../config/db');

// GET /api/categories
const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         c.id,
         c.name,
         c.watch_type,
         c.brand_origin,
         c.description,
         c.created_at,
         COUNT(p.id) AS total_products
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
       GROUP BY c.id, c.name, c.watch_type, c.brand_origin, c.description, c.created_at
       ORDER BY c.id ASC`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getCategories error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  }
};

// POST /api/categories
const createCategory = async (req, res) => {
  try {
    const { name, watch_type, brand_origin, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Nama kategori wajib diisi.' });
    }

    if (watch_type && !['analog', 'digital', 'smartwatch'].includes(watch_type)) {
      return res.status(400).json({ success: false, error: 'watch_type harus analog, digital, atau smartwatch.' });
    }

    if (brand_origin && !['lokal', 'impor'].includes(brand_origin)) {
      return res.status(400).json({ success: false, error: 'brand_origin harus lokal atau impor.' });
    }

    const result = await pool.query(
      `INSERT INTO categories (name, watch_type, brand_origin, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, watch_type || null, brand_origin || null, description || null]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('createCategory error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  }
};

// PUT /api/categories/:id
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, watch_type, brand_origin, description } = req.body;

    const existing = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Kategori tidak ditemukan.' });
    }

    if (watch_type && !['analog', 'digital', 'smartwatch'].includes(watch_type)) {
      return res.status(400).json({ success: false, error: 'watch_type harus analog, digital, atau smartwatch.' });
    }

    if (brand_origin && !['lokal', 'impor'].includes(brand_origin)) {
      return res.status(400).json({ success: false, error: 'brand_origin harus lokal atau impor.' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (watch_type !== undefined) { fields.push(`watch_type = $${idx++}`); values.push(watch_type); }
    if (brand_origin !== undefined) { fields.push(`brand_origin = $${idx++}`); values.push(brand_origin); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada data yang diperbarui.' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('updateCategory error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  }
};

// DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id, name FROM categories WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Kategori tidak ditemukan.' });
    }

    // Check for active products in this category
    const activeProducts = await pool.query(
      'SELECT COUNT(*) AS cnt FROM products WHERE category_id = $1 AND is_active = TRUE',
      [id]
    );

    if (parseInt(activeProducts.rows[0].cnt, 10) > 0) {
      return res.status(400).json({
        success: false,
        error: `Tidak dapat menghapus kategori. Masih ada ${activeProducts.rows[0].cnt} produk aktif dalam kategori ini.`,
      });
    }

    await pool.query('DELETE FROM categories WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      data: { message: `Kategori "${existing.rows[0].name}" berhasil dihapus.` },
    });
  } catch (err) {
    console.error('deleteCategory error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
