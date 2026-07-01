const pool = require('../config/db');

// GET /api/returns
const getReturns = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const countResult = await pool.query('SELECT COUNT(*) AS total FROM returns');
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await pool.query(
      `SELECT
         r.id,
         r.return_number,
         r.transaction_id,
         t.transaction_number,
         r.processed_by,
         u.full_name AS processed_by_name,
         r.return_reason,
         r.return_type,
         r.total_refund_amount,
         r.status,
         r.notes,
         r.created_at
       FROM returns r
       JOIN transactions t ON r.transaction_id = t.id
       JOIN users u ON r.processed_by = u.id
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit, 10), offset]
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
    console.error('getReturns error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  }
};

// GET /api/returns/:id
const getReturnById = async (req, res) => {
  try {
    const { id } = req.params;

    const retResult = await pool.query(
      `SELECT
         r.id,
         r.return_number,
         r.transaction_id,
         t.transaction_number,
         r.processed_by,
         u.full_name AS processed_by_name,
         r.return_reason,
         r.return_type,
         r.total_refund_amount,
         r.status,
         r.notes,
         r.created_at
       FROM returns r
       JOIN transactions t ON r.transaction_id = t.id
       JOIN users u ON r.processed_by = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (retResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Data retur tidak ditemukan.' });
    }

    const itemsResult = await pool.query(
      `SELECT
         ri.id,
         ri.transaction_item_id,
         ri.product_id,
         ri.product_name,
         ri.quantity,
         ri.unit_price,
         ri.condition,
         ri.deduction_rate,
         ri.refund_amount,
         ri.notes
       FROM return_items ri
       WHERE ri.return_id = $1
       ORDER BY ri.id ASC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...retResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (err) {
    console.error('getReturnById error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  }
};

// POST /api/returns
const createReturn = async (req, res) => {
  const client = await pool.connect();
  try {
    const { transaction_id, return_reason, return_type, items, notes } = req.body;

    // ── Validate input ────────────────────────────────────────────────────────
    if (!transaction_id) {
      return res.status(400).json({ success: false, error: 'transaction_id wajib diisi.' });
    }
    if (!return_reason) {
      return res.status(400).json({ success: false, error: 'Alasan retur wajib diisi.' });
    }
    if (!return_type || !['refund', 'exchange'].includes(return_type)) {
      return res.status(400).json({ success: false, error: 'return_type harus refund atau exchange.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items retur tidak boleh kosong.' });
    }

    // ── Validate transaction ──────────────────────────────────────────────────
    const txResult = await pool.query(
      'SELECT id, status FROM transactions WHERE id = $1',
      [transaction_id]
    );

    if (txResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Transaksi tidak ditemukan.' });
    }

    const transaction = txResult.rows[0];
    if (!['completed', 'partially_returned'].includes(transaction.status)) {
      return res.status(400).json({
        success: false,
        error: `Transaksi dengan status "${transaction.status}" tidak dapat diretur.`,
      });
    }

    // ── Validate & enrich return items ────────────────────────────────────────
    const enrichedItems = [];

    for (const item of items) {
      const { transaction_item_id, quantity, condition, notes: itemNotes } = item;

      if (!transaction_item_id || !quantity || !condition) {
        return res.status(400).json({
          success: false,
          error: 'Setiap item retur harus memiliki transaction_item_id, quantity, dan condition.',
        });
      }

      if (!['damaged', 'unsuitable', 'other'].includes(condition)) {
        return res.status(400).json({
          success: false,
          error: 'condition harus damaged, unsuitable, atau other.',
        });
      }

      const qty = parseInt(quantity, 10);
      if (qty <= 0) {
        return res.status(400).json({ success: false, error: 'Jumlah item retur harus lebih dari 0.' });
      }

      // Validate transaction_item belongs to this transaction
      const tiResult = await pool.query(
        `SELECT ti.id, ti.product_id, ti.product_name, ti.unit_price, ti.quantity AS original_quantity
         FROM transaction_items ti
         WHERE ti.id = $1 AND ti.transaction_id = $2`,
        [transaction_item_id, transaction_id]
      );

      if (tiResult.rowCount === 0) {
        return res.status(400).json({
          success: false,
          error: `Transaction item ID ${transaction_item_id} tidak ditemukan dalam transaksi ini.`,
        });
      }

      const ti = tiResult.rows[0];

      if (qty > ti.original_quantity) {
        return res.status(400).json({
          success: false,
          error: `Jumlah retur (${qty}) melebihi jumlah pembelian asli (${ti.original_quantity}) untuk produk "${ti.product_name}".`,
        });
      }

      // Calculate refund based on condition
      let deductionRate = 0;
      let refundMultiplier = 1.0;

      if (condition === 'damaged') {
        deductionRate = 30;
        refundMultiplier = 0.70;
      }
      // 'unsuitable' and 'other' → 0% deduction, full refund

      const refundAmount = parseFloat(ti.unit_price) * qty * refundMultiplier;

      enrichedItems.push({
        transaction_item_id: ti.id,
        product_id: ti.product_id,
        product_name: ti.product_name,
        quantity: qty,
        unit_price: parseFloat(ti.unit_price),
        condition,
        deduction_rate: deductionRate,
        refund_amount: refundAmount,
        notes: itemNotes || null,
      });
    }

    const totalRefund = enrichedItems.reduce((sum, i) => sum + i.refund_amount, 0);

    // ── Generate return number ────────────────────────────────────────────────
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countResult = await pool.query(
      `SELECT COUNT(*) AS cnt FROM returns WHERE DATE(created_at) = CURRENT_DATE`
    );
    const sequence = parseInt(countResult.rows[0].cnt, 10) + 1;
    const returnNumber = `RET${dateStr}-${String(sequence).padStart(4, '0')}`;

    // ── Database transaction ──────────────────────────────────────────────────
    await client.query('BEGIN');

    const retInsert = await client.query(
      `INSERT INTO returns
         (return_number, transaction_id, processed_by, return_reason,
          return_type, total_refund_amount, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7)
       RETURNING *`,
      [
        returnNumber,
        transaction_id,
        req.user.id,
        return_reason,
        return_type,
        totalRefund,
        notes || null,
      ]
    );

    const returnId = retInsert.rows[0].id;
    const insertedItems = [];

    for (const item of enrichedItems) {
      const riInsert = await client.query(
        `INSERT INTO return_items
           (return_id, transaction_item_id, product_id, product_name,
            quantity, unit_price, condition, deduction_rate, refund_amount, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          returnId,
          item.transaction_item_id,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.condition,
          item.deduction_rate,
          item.refund_amount,
          item.notes,
        ]
      );
      insertedItems.push(riInsert.rows[0]);

      // Return stock to inventory if product still exists
      if (item.product_id) {
        await client.query(
          'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    // ── Determine new transaction status ──────────────────────────────────────
    // Get all transaction items quantities
    const allTxItems = await client.query(
      'SELECT id, quantity FROM transaction_items WHERE transaction_id = $1',
      [transaction_id]
    );

    // Sum all returned quantities per transaction_item across all returns (including new ones)
    const allReturnedItems = await client.query(
      `SELECT ri.transaction_item_id, SUM(ri.quantity) AS returned_qty
       FROM return_items ri
       JOIN returns r ON ri.return_id = r.id
       WHERE r.transaction_id = $1 AND r.status = 'approved'
       GROUP BY ri.transaction_item_id`,
      [transaction_id]
    );

    const returnedMap = {};
    for (const row of allReturnedItems.rows) {
      returnedMap[row.transaction_item_id] = parseInt(row.returned_qty, 10);
    }

    const fullyReturned = allTxItems.rows.every((ti) => {
      const returned = returnedMap[ti.id] || 0;
      return returned >= parseInt(ti.quantity, 10);
    });

    const newStatus = fullyReturned ? 'fully_returned' : 'partially_returned';
    await client.query(
      'UPDATE transactions SET status = $1 WHERE id = $2',
      [newStatus, transaction_id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: {
        ...retInsert.rows[0],
        items: insertedItems,
        transaction_status: newStatus,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createReturn error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  } finally {
    client.release();
  }
};

module.exports = { getReturns, getReturnById, createReturn };
