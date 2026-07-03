const pool = require("../config/db");

// GET /api/reports/daily?date=YYYY-MM-DD
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    // Default to today if not provided
    const reportDate = date || new Date().toISOString().slice(0, 10);

    // ── Summary stats ─────────────────────────────────────────────────────────
    const summaryResult = await pool.query(
      `SELECT
         COUNT(DISTINCT t.id) AS total_transactions,
         COALESCE(SUM(t.total_amount), 0) AS total_revenue,
         COALESCE(SUM(t.discount_amount), 0) AS total_discount,
         COALESCE(SUM(t.tax_amount), 0) AS total_tax,
         COALESCE(SUM(ti.quantity), 0) AS total_items_sold
       FROM transactions t
       LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
       WHERE DATE(t.created_at) = $1
         AND t.status != 'fully_returned'`,
      [reportDate],
    );

    // ── Returns on that date ──────────────────────────────────────────────────
    const returnsResult = await pool.query(
      `SELECT
         r.id,
         r.return_number,
         t.transaction_number,
         u.full_name AS processed_by_name,
         r.return_type,
         r.total_refund_amount,
         r.status,
         r.created_at
       FROM returns r
       JOIN transactions t ON r.transaction_id = t.id
       JOIN users u ON r.processed_by = u.id
       WHERE DATE(r.created_at) = $1
       ORDER BY r.created_at ASC`,
      [reportDate],
    );

    // ── Top products ──────────────────────────────────────────────────────────
    const topProductsResult = await pool.query(
      `SELECT
         ti.product_name,
         ti.product_brand,
         SUM(ti.quantity) AS total_qty_sold,
         SUM(ti.subtotal) AS total_revenue
       FROM transactions t
       JOIN transaction_items ti ON t.id = ti.transaction_id
       WHERE DATE(t.created_at) = $1
         AND t.status != 'fully_returned'
       GROUP BY ti.product_name, ti.product_brand
       ORDER BY total_qty_sold DESC
       LIMIT 10`,
      [reportDate],
    );

    // ── Stock by category (from view) ─────────────────────────────────────────
    const stockResult = await pool.query(
      "SELECT * FROM stock_by_category_view ORDER BY category_id ASC",
    );

    // ── Stock by product ──────────────────────────────────────────────────────
    const productStockResult = await pool.query(
      `SELECT
         p.id,
         p.name AS product_name,
         COALESCE(c.watch_type, '-') AS category_type,
         p.stock AS total_stock
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = TRUE
       ORDER BY c.watch_type ASC NULLS LAST, p.name ASC`,
    );

    // ── Full transaction list for that date ───────────────────────────────────
    const transactionsResult = await pool.query(
      `SELECT
         t.id,
         t.transaction_number,
         u.full_name AS cashier_name,
         t.customer_name,
         t.subtotal,
         t.discount_amount,
         t.tax_amount,
         t.total_amount,
         t.payment_amount,
         t.change_amount,
         t.status,
         t.created_at
       FROM transactions t
       JOIN users u ON t.cashier_id = u.id
       WHERE DATE(t.created_at) = $1
       ORDER BY t.created_at ASC`,
      [reportDate],
    );

    // For each transaction, fetch its items
    const transactionsWithItems = [];
    for (const tx of transactionsResult.rows) {
      const itemsResult = await pool.query(
        `SELECT ti.product_name, ti.product_brand, ti.unit_price, ti.quantity,
           ti.item_discount_percent, ti.item_discount_amount, ti.subtotal
         FROM transaction_items ti WHERE ti.transaction_id = $1 ORDER BY ti.id ASC`,
        [tx.id],
      );
      transactionsWithItems.push({ ...tx, items: itemsResult.rows });
    }

    // For each return, fetch its items detail
    const returnsWithItems = [];
    for (const ret of returnsResult.rows) {
      const retItemsResult = await pool.query(
        `SELECT ri.product_name, ri.quantity, ri.unit_price, ri.condition,
           ri.deduction_rate, ri.refund_amount, ri.notes
         FROM return_items ri WHERE ri.return_id = $1 ORDER BY ri.id ASC`,
        [ret.id],
      );
      returnsWithItems.push({ ...ret, items: retItemsResult.rows });
    }

    return res.status(200).json({
      success: true,
      data: {
        date: reportDate,
        summary: summaryResult.rows[0],
        returns: returnsWithItems,
        top_products: topProductsResult.rows,
        stock_by_category: stockResult.rows,
        stock_by_product: productStockResult.rows,
        transactions: transactionsWithItems,
      },
    });
  } catch (err) {
    console.error("getDailyReport error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Terjadi kesalahan pada server." });
  }
};

module.exports = { getDailyReport };
