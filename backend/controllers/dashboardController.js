const pool = require('../config/db');

// Static category mappings for backward compatibility
const staticCategories = {
  1: { category_name: "Jam Tangan Analog", watch_type: "analog", brand_origin: "impor" },
  2: { category_name: "Jam Tangan Digital", watch_type: "digital", brand_origin: "impor" },
  3: { category_name: "Smartwatch", watch_type: "smartwatch", brand_origin: "impor" }
};

const mapProductCategory = (prod) => {
  const cat = staticCategories[prod.category_id] || { category_name: "-", watch_type: null, brand_origin: null };
  return {
    ...prod,
    category_name: cat.category_name,
    watch_type: cat.watch_type,
    brand_origin: cat.brand_origin
  };
};

// GET /api/dashboard
const getDashboard = async (req, res) => {
  try {
    // ── Today's revenue ───────────────────────────────────────────────────────
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS today_revenue
       FROM transactions
       WHERE DATE(created_at) = CURRENT_DATE
         AND status != 'fully_returned'`
    );

    // ── Today's transaction count ─────────────────────────────────────────────
    const txCountResult = await pool.query(
      `SELECT COUNT(*) AS today_transactions
       FROM transactions
       WHERE DATE(created_at) = CURRENT_DATE`
    );

    // ── Today's items sold (JSONB array parsing) ──────────────────────────────
    const itemsSoldResult = await pool.query(
      `SELECT COALESCE(SUM((item->>'quantity')::int), 0) AS today_items_sold
       FROM transactions t,
            jsonb_array_elements(t.items) AS item
       WHERE DATE(t.created_at) = CURRENT_DATE
         AND t.status != 'fully_returned'`
    );

    // ── Today's returns ───────────────────────────────────────────────────────
    const returnsResult = await pool.query(
      `SELECT COUNT(*) AS today_returns
       FROM returns
       WHERE DATE(created_at) = CURRENT_DATE`
    );

    // ── Total active products ─────────────────────────────────────────────────
    const totalProductsResult = await pool.query(
      `SELECT COUNT(*) AS total_products FROM products WHERE is_active = TRUE`
    );

    // ── Low stock products (stock <= 5) ───────────────────────────────────────
    const lowStockResult = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.brand,
         p.model_type,
         p.stock,
         p.price,
         p.category_id
       FROM products p
       WHERE p.stock <= 5 AND p.is_active = TRUE
       ORDER BY p.stock ASC`
    );

    // ── Recent transactions (last 5) ──────────────────────────────────────────
    const recentTxResult = await pool.query(
      `SELECT
         t.id,
         t.transaction_number,
         u.full_name AS cashier_name,
         t.customer_name,
         t.total_amount,
         t.payment_amount,
         t.change_amount,
         t.status,
         t.created_at
       FROM transactions t
       JOIN users u ON t.cashier_id = u.id
       ORDER BY t.created_at DESC
       LIMIT 5`
    );

    const mappedLowStock = lowStockResult.rows.map(mapProductCategory);

    return res.status(200).json({
      success: true,
      data: {
        today_revenue: parseFloat(revenueResult.rows[0].today_revenue),
        today_transactions: parseInt(txCountResult.rows[0].today_transactions, 10),
        today_items_sold: parseInt(itemsSoldResult.rows[0].today_items_sold, 10),
        today_returns: parseInt(returnsResult.rows[0].today_returns, 10),
        total_products: parseInt(totalProductsResult.rows[0].total_products, 10),
        low_stock_products: mappedLowStock,
        recent_transactions: recentTxResult.rows,
      },
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  }
};

module.exports = { getDashboard };
