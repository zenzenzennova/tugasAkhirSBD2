const pool = require('../config/db');

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

    // ── Today's items sold ────────────────────────────────────────────────────
    const itemsSoldResult = await pool.query(
      `SELECT COALESCE(SUM(ti.quantity), 0) AS today_items_sold
       FROM transactions t
       JOIN transaction_items ti ON t.id = ti.transaction_id
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
         c.name AS category_name,
         c.watch_type,
         c.brand_origin
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
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

    return res.status(200).json({
      success: true,
      data: {
        today_revenue: parseFloat(revenueResult.rows[0].today_revenue),
        today_transactions: parseInt(txCountResult.rows[0].today_transactions, 10),
        today_items_sold: parseInt(itemsSoldResult.rows[0].today_items_sold, 10),
        today_returns: parseInt(returnsResult.rows[0].today_returns, 10),
        total_products: parseInt(totalProductsResult.rows[0].total_products, 10),
        low_stock_products: lowStockResult.rows,
        recent_transactions: recentTxResult.rows,
      },
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  }
};

module.exports = { getDashboard };
