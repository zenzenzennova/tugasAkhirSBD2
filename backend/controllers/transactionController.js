const pool = require("../config/db");

// GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const { date, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions = [];
    const values = [];
    let idx = 1;

    if (date) {
      conditions.push(`DATE(t.created_at) = $${idx++}`);
      values.push(date);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM transactions t ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0].total, 10);

    values.push(parseInt(limit, 10));
    values.push(offset);

    const result = await pool.query(
      `SELECT
         t.id,
         t.transaction_number,
         t.cashier_id,
         u.full_name AS cashier_name,
         t.customer_name,
         t.subtotal,
         t.discount_percent,
         t.discount_amount,
         t.tax_percent,
         t.tax_amount,
         t.total_amount,
         t.payment_amount,
         t.change_amount,
         t.status,
         t.notes,
         t.created_at
       FROM transactions t
       JOIN users u ON t.cashier_id = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      values,
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total_pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error("getTransactions error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Terjadi kesalahan pada server." });
  }
};

// GET /api/transactions/:id
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const txResult = await pool.query(
      `SELECT
         t.id,
         t.transaction_number,
         t.cashier_id,
         u.full_name AS cashier_name,
         t.customer_name,
         t.subtotal,
         t.discount_percent,
         t.discount_amount,
         t.tax_percent,
         t.tax_amount,
         t.total_amount,
         t.payment_amount,
         t.change_amount,
         t.status,
         t.notes,
         t.created_at
       FROM transactions t
       JOIN users u ON t.cashier_id = u.id
       WHERE t.id = $1`,
      [id],
    );

    if (txResult.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Transaksi tidak ditemukan." });
    }

    const itemsResult = await pool.query(
      `SELECT
         ti.id,
         ti.product_id,
         ti.product_name,
         ti.product_brand,
         ti.unit_price,
         ti.quantity,
         ti.item_discount_percent,
         ti.item_discount_amount,
         ti.subtotal
       FROM transaction_items ti
       WHERE ti.transaction_id = $1
       ORDER BY ti.id ASC`,
      [id],
    );

    return res.status(200).json({
      success: true,
      data: {
        ...txResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (err) {
    console.error("getTransactionById error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Terjadi kesalahan pada server." });
  }
};

// POST /api/transactions
const createTransaction = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customer_name,
      items,
      tax_percent = 0,
      payment_amount,
      notes,
    } = req.body;
    const discount_percent = 0; // discount is product-level, not transaction-level

    // ── Validate input ────────────────────────────────────────────────────────
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Items tidak boleh kosong." });
    }

    if (payment_amount === undefined || payment_amount === null) {
      return res
        .status(400)
        .json({ success: false, error: "Jumlah pembayaran wajib diisi." });
    }

    const discountPct = parseFloat(discount_percent) || 0;
    const taxPct = parseFloat(tax_percent) || 0;
    const paymentAmt = parseFloat(payment_amount);

    if (discountPct < 0 || discountPct > 100) {
      return res.status(400).json({
        success: false,
        error: "Persentase diskon harus antara 0 dan 100.",
      });
    }
    if (taxPct < 0 || taxPct > 100) {
      return res.status(400).json({
        success: false,
        error: "Persentase pajak harus antara 0 dan 100.",
      });
    }

    // ── Validate & enrich each item ───────────────────────────────────────────
    const enrichedItems = [];
    for (const item of items) {
      const { product_id, quantity, item_discount_percent = 0 } = item;

      if (!product_id || !quantity || parseInt(quantity, 10) <= 0) {
        return res.status(400).json({
          success: false,
          error:
            "Setiap item harus memiliki product_id dan quantity yang valid.",
        });
      }

      const qty = parseInt(quantity, 10);

      const productResult = await pool.query(
        "SELECT id, name, brand, price, discount_percent, stock FROM products WHERE id = $1 AND is_active = TRUE",
        [product_id],
      );

      if (productResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: `Produk dengan ID ${product_id} tidak ditemukan atau tidak aktif.`,
        });
      }

      const product = productResult.rows[0];

      if (product.stock < qty) {
        return res.status(400).json({
          success: false,
          error: `Stok produk "${product.name}" tidak mencukupi. Stok tersedia: ${product.stock}, diminta: ${qty}.`,
        });
      }

      // Use product's own discount_percent, ignoring any per-item override from request
      const productDiscount = parseFloat(product.discount_percent) || 0;
      const base = parseFloat(product.price) * qty;
      const itemDiscAmount = base * (productDiscount / 100);
      const itemSubtotal = base - itemDiscAmount;
      const itemDiscPct = productDiscount;

      enrichedItems.push({
        product_id: product.id,
        product_name: product.name,
        product_brand: product.brand,
        unit_price: parseFloat(product.price),
        quantity: qty,
        item_discount_percent: productDiscount,
        item_discount_amount: itemDiscAmount,
        subtotal: itemSubtotal,
      });
    }

    // ── Calculate totals ──────────────────────────────────────────────────────
    const cartSubtotal = enrichedItems.reduce((sum, i) => sum + i.subtotal, 0);
    const globalDiscountAmount = cartSubtotal * (discountPct / 100);
    const afterDiscount = cartSubtotal - globalDiscountAmount;
    const taxAmount = afterDiscount * (taxPct / 100);
    const totalAmount = afterDiscount + taxAmount;

    if (paymentAmt < totalAmount) {
      return res.status(400).json({
        success: false,
        error: `Jumlah pembayaran (${paymentAmt}) kurang dari total transaksi (${totalAmount.toFixed(2)}).`,
      });
    }

    const changeAmount = paymentAmt - totalAmount;

    // ── Generate transaction number ────────────────────────────────────────────
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    const countResult = await pool.query(
      `SELECT COUNT(*) AS cnt FROM transactions WHERE DATE(created_at) = CURRENT_DATE`,
    );
    const sequence = parseInt(countResult.rows[0].cnt, 10) + 1;
    const transactionNumber = `TRX${dateStr}-${String(sequence).padStart(4, "0")}`;

    // ── Database transaction ──────────────────────────────────────────────────
    await client.query("BEGIN");

    const txInsert = await client.query(
      `INSERT INTO transactions
         (transaction_number, cashier_id, customer_name,
          subtotal, discount_percent, discount_amount, tax_percent, tax_amount,
          total_amount, payment_amount, change_amount, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed', $12)
       RETURNING *`,
      [
        transactionNumber,
        req.user.id,
        customer_name || null,
        cartSubtotal,
        discountPct,
        globalDiscountAmount,
        taxPct,
        taxAmount,
        totalAmount,
        paymentAmt,
        changeAmount,
        notes || null,
      ],
    );

    const transactionId = txInsert.rows[0].id;
    const insertedItems = [];

    for (const item of enrichedItems) {
      const itemInsert = await client.query(
        `INSERT INTO transaction_items
           (transaction_id, product_id, product_name, product_brand,
            unit_price, quantity, item_discount_percent, item_discount_amount, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          transactionId,
          item.product_id,
          item.product_name,
          item.product_brand,
          item.unit_price,
          item.quantity,
          item.item_discount_percent,
          item.item_discount_amount,
          item.subtotal,
        ],
      );
      insertedItems.push(itemInsert.rows[0]);

      await client.query(
        "UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2",
        [item.quantity, item.product_id],
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      data: {
        ...txInsert.rows[0],
        items: insertedItems,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createTransaction error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Terjadi kesalahan pada server." });
  } finally {
    client.release();
  }
};

// GET /api/transactions/:id/receipt
const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const txResult = await pool.query(
      `SELECT
         t.id,
         t.transaction_number,
         t.cashier_id,
         u.full_name AS cashier_name,
         t.customer_name,
         t.subtotal,
         t.discount_percent,
         t.discount_amount,
         t.tax_percent,
         t.tax_amount,
         t.total_amount,
         t.payment_amount,
         t.change_amount,
         t.status,
         t.notes,
         t.created_at
       FROM transactions t
       JOIN users u ON t.cashier_id = u.id
       WHERE t.id = $1`,
      [id],
    );

    if (txResult.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Transaksi tidak ditemukan." });
    }

    const itemsResult = await pool.query(
      `SELECT
         ti.id,
         ti.product_id,
         ti.product_name,
         ti.product_brand,
         ti.unit_price,
         ti.quantity,
         ti.item_discount_percent,
         ti.item_discount_amount,
         ti.subtotal
       FROM transaction_items ti
       WHERE ti.transaction_id = $1
       ORDER BY ti.id ASC`,
      [id],
    );

    const transaction = txResult.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        store_name: "Sistem Kasir Midnight Meridian",
        receipt: {
          transaction_number: transaction.transaction_number,
          date: transaction.created_at,
          cashier: transaction.cashier_name,
          customer_name: transaction.customer_name,
          items: itemsResult.rows,
          subtotal: transaction.subtotal,
          discount_percent: transaction.discount_percent,
          discount_amount: transaction.discount_amount,
          tax_percent: transaction.tax_percent,
          tax_amount: transaction.tax_amount,
          total_amount: transaction.total_amount,
          payment_amount: transaction.payment_amount,
          change_amount: transaction.change_amount,
          notes: transaction.notes,
          status: transaction.status,
        },
      },
    });
  } catch (err) {
    console.error("getReceipt error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Terjadi kesalahan pada server." });
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  getReceipt,
};
