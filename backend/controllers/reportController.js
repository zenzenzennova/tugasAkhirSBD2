const pool = require("../config/db");

const staticCategories = {
  1: { name: "Jam Tangan Analog", watch_type: "analog" },
  2: { name: "Jam Tangan Digital", watch_type: "digital" },
  3: { name: "Smartwatch", watch_type: "smartwatch" }
};

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
         (
           SELECT COALESCE(SUM(quantity), 0)
           FROM sales_report_view
           WHERE DATE(transaction_date) = $1
             AND transaction_status != 'fully_returned'
         ) AS total_items_sold
       FROM transactions t
       WHERE DATE(t.created_at) = $1
         AND t.status != 'fully_returned'`,
      [reportDate],
    );

    // ── Returns on that date ──────────────────────────────────────────────────
    const returnsResult = await pool.query(
      `SELECT
         r.transaction_id,
         r.return_number,
         t.transaction_number,
         u.full_name AS processed_by_name,
         r.return_type,
         r.total_refund_amount,
         r.status,
         r.items,
         r.created_at
       FROM returns r
       JOIN transactions t ON r.transaction_id = t.id
       JOIN users u ON r.processed_by = u.id
       WHERE DATE(r.created_at) = $1
       ORDER BY r.created_at ASC`,
      [reportDate],
    );

    const returnsWithItems = returnsResult.rows.map(row => ({
      ...row,
      id: `${row.transaction_id}_${row.return_number}`,
      items: (row.items || []).map(item => ({
        ...item,
        id: item.product_id,
        transaction_item_id: item.product_id
      }))
    }));

    // ── Top products ──────────────────────────────────────────────────────────
    const topProductsResult = await pool.query(
      `SELECT
         product_name,
         product_brand,
         SUM(quantity) AS total_qty_sold,
         SUM(item_subtotal) AS total_revenue
       FROM sales_report_view
       WHERE DATE(transaction_date) = $1
         AND transaction_status != 'fully_returned'
       GROUP BY product_name, product_brand
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
         p.category_id,
         p.stock AS total_stock
       FROM products p
       WHERE p.is_active = TRUE
       ORDER BY p.category_id ASC, p.name ASC`,
    );

    const mappedProductStock = productStockResult.rows.map(p => ({
      id: p.id,
      product_name: p.product_name,
      category_type: (staticCategories[p.category_id]?.watch_type || '-'),
      total_stock: p.total_stock
    }));

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
         t.items,
         t.created_at
       FROM transactions t
       JOIN users u ON t.cashier_id = u.id
       WHERE DATE(t.created_at) = $1
       ORDER BY t.created_at ASC`,
      [reportDate],
    );

    const transactionsWithItems = transactionsResult.rows.map(tx => ({
      ...tx,
      items: (tx.items || []).map(item => ({
        ...item,
        id: item.product_id,
        transaction_item_id: item.product_id
      }))
    }));

    return res.status(200).json({
      success: true,
      data: {
        date: reportDate,
        summary: summaryResult.rows[0] || {
          total_transactions: 0,
          total_revenue: 0,
          total_discount: 0,
          total_tax: 0,
          total_items_sold: 0
        },
        returns: returnsWithItems,
        top_products: topProductsResult.rows,
        stock_by_category: stockResult.rows,
        stock_by_product: mappedProductStock,
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
