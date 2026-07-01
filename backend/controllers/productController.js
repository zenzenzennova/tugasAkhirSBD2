const pool = require("../config/db");

// GET /api/products
const getProducts = async (req, res) => {
  try {
    const { search, category_id, watch_type, brand_origin } = req.query;

    const conditions = ["p.is_active = TRUE"];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.brand ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    if (category_id) {
      conditions.push(`p.category_id = $${idx++}`);
      values.push(parseInt(category_id, 10));
    }

    if (watch_type) {
      conditions.push(`c.watch_type = $${idx++}`);
      values.push(watch_type);
    }

    if (brand_origin) {
      conditions.push(`c.brand_origin = $${idx++}`);
      values.push(brand_origin);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.brand,
         p.model_type,
         p.price,
         p.discount_percent,
         p.stock,
         p.warranty_months,
         p.category_id,
         p.is_active,
         p.created_at,
         p.updated_at,
         c.name AS category_name,
         c.watch_type,
         c.brand_origin
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereClause}
       ORDER BY p.name ASC`,
      values,
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error("getProducts error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Terjadi kesalahan pada server." });
  }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.brand,
         p.model_type,
         p.price,
         p.stock,
         p.warranty_months,
         p.category_id,
         p.is_active,
         p.created_at,
         p.updated_at,
         c.name AS category_name,
         c.watch_type,
         c.brand_origin
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1 AND p.is_active = TRUE`,
      [id],
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Produk tidak ditemukan." });
    }

    const product = result.rows[0];
    product.low_stock = product.stock <= 5;

    return res.status(200).json({ success: true, data: product });
  } catch (err) {
    console.error("getProductById error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Terjadi kesalahan pada server." });
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  try {
    const {
      name,
      brand,
      model_type,
      price,
      stock,
      warranty_months,
      category_id,
      discount_percent,
    } = req.body;

    if (!name || !brand || price === undefined) {
      return res.status(400).json({
        success: false,
        error: "Nama, brand, dan harga produk wajib diisi.",
      });
    }

    if (parseFloat(price) <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Harga harus lebih dari 0." });
    }

    if (stock !== undefined && parseInt(stock, 10) < 0) {
      return res
        .status(400)
        .json({ success: false, error: "Stok tidak boleh negatif." });
    }

    const discPct = parseFloat(discount_percent) || 0;
    if (discPct < 0 || discPct > 100) {
      return res.status(400).json({
        success: false,
        error: "Persentase diskon harus antara 0 dan 100.",
      });
    }

    const result = await pool.query(
      `INSERT INTO products (name, brand, model_type, price, discount_percent, stock, warranty_months, category_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING *`,
      [
        name,
        brand,
        model_type || null,
        parseFloat(price),
        discPct,
        parseInt(stock, 10) || 0,
        parseInt(warranty_months, 10) || 0,
        category_id ? parseInt(category_id, 10) : null,
      ],
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("createProduct error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Terjadi kesalahan pada server." });
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      brand,
      model_type,
      price,
      stock,
      warranty_months,
      category_id,
      discount_percent,
      is_active,
    } = req.body;

    const existing = await pool.query(
      "SELECT id FROM products WHERE id = $1 AND is_active = TRUE",
      [id],
    );
    if (existing.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Produk tidak ditemukan." });
    }

    if (price !== undefined && parseFloat(price) <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Harga harus lebih dari 0." });
    }

    if (stock !== undefined && parseInt(stock, 10) < 0) {
      return res
        .status(400)
        .json({ success: false, error: "Stok tidak boleh negatif." });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (brand !== undefined) {
      fields.push(`brand = $${idx++}`);
      values.push(brand);
    }
    if (model_type !== undefined) {
      fields.push(`model_type = $${idx++}`);
      values.push(model_type);
    }
    if (price !== undefined) {
      fields.push(`price = $${idx++}`);
      values.push(parseFloat(price));
    }
    if (stock !== undefined) {
      fields.push(`stock = $${idx++}`);
      values.push(parseInt(stock, 10));
    }
    if (warranty_months !== undefined) {
      fields.push(`warranty_months = $${idx++}`);
      values.push(parseInt(warranty_months, 10));
    }
    if (category_id !== undefined) {
      fields.push(`category_id = $${idx++}`);
      values.push(category_id ? parseInt(category_id, 10) : null);
    }
    if (discount_percent !== undefined) {
      const dp = parseFloat(discount_percent) || 0;
      fields.push(`discount_percent = $${idx++}`);
      values.push(Math.min(100, Math.max(0, dp)));
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(Boolean(is_active));
    }

    if (fields.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Tidak ada data yang diperbarui." });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE products SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("updateProduct error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Terjadi kesalahan pada server." });
  }
};

// DELETE /api/products/:id  (soft delete)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT id, name FROM products WHERE id = $1 AND is_active = TRUE",
      [id],
    );
    if (existing.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Produk tidak ditemukan." });
    }

    await pool.query(
      "UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1",
      [id],
    );

    return res.status(200).json({
      success: true,
      data: {
        message: `Produk "${existing.rows[0].name}" berhasil dinonaktifkan.`,
      },
    });
  } catch (err) {
    console.error("deleteProduct error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Terjadi kesalahan pada server." });
  }
};

// PATCH /api/products/:id/stock
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock === null) {
      return res
        .status(400)
        .json({ success: false, error: "Nilai stok wajib diisi." });
    }

    const newStock = parseInt(stock, 10);
    if (isNaN(newStock) || newStock < 0) {
      return res.status(400).json({
        success: false,
        error: "Stok harus berupa angka non-negatif.",
      });
    }

    const existing = await pool.query(
      "SELECT id, name FROM products WHERE id = $1 AND is_active = TRUE",
      [id],
    );
    if (existing.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Produk tidak ditemukan." });
    }

    const result = await pool.query(
      "UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [newStock, id],
    );

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("updateStock error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Terjadi kesalahan pada server." });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
};
