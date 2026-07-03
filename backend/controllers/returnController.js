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
         r.transaction_id,
         r.return_number,
         t.transaction_number,
         r.processed_by,
         u.full_name AS processed_by_name,
         r.return_reason,
         r.return_type,
         r.total_refund_amount,
         r.status,
         r.notes,
         r.items,
         r.created_at
       FROM returns r
       JOIN transactions t ON r.transaction_id = t.id
       JOIN users u ON r.processed_by = u.id
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit, 10), offset]
    );

    // Map rows to include 'id' for frontend compatibility if needed
    const data = result.rows.map(row => ({
      ...row,
      id: `${row.transaction_id}_${row.return_number}` // Synthetic ID for UI keying
    }));

    return res.status(200).json({
      success: true,
      data,
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

// GET /api/returns/:syntheticId or /api/returns/:transactionId/:returnNumber
const getReturnById = async (req, res) => {
  try {
    const { id } = req.params;

    let transaction_id;
    let return_number;

    if (id.includes('_')) {
      const parts = id.split('_');
      transaction_id = parseInt(parts[0], 10);
      return_number = parts.slice(1).join('_');
    } else {
      // Fallback
      transaction_id = parseInt(id, 10);
    }

    let query = `
      SELECT
        r.transaction_id,
        r.return_number,
        t.transaction_number,
        r.processed_by,
        u.full_name AS processed_by_name,
        r.return_reason,
        r.return_type,
        r.total_refund_amount,
        r.status,
        r.notes,
        r.items,
        r.created_at
      FROM returns r
      JOIN transactions t ON r.transaction_id = t.id
      JOIN users u ON r.processed_by = u.id
    `;
    let params = [];

    if (return_number) {
      query += ` WHERE r.transaction_id = $1 AND r.return_number = $2`;
      params = [transaction_id, return_number];
    } else {
      query += ` WHERE r.transaction_id = $1 LIMIT 1`;
      params = [transaction_id];
    }

    const retResult = await pool.query(query, params);

    if (retResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Data retur tidak ditemukan.' });
    }

    const row = retResult.rows[0];
    const data = {
      ...row,
      id: `${row.transaction_id}_${row.return_number}`,
      // Map returned items to have transaction_item_id and id for compatibility
      items: (row.items || []).map(item => ({
        ...item,
        id: item.product_id,
        transaction_item_id: item.product_id
      }))
    };

    return res.status(200).json({
      success: true,
      data
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
      'SELECT id, status, items FROM transactions WHERE id = $1',
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

    const txItems = transaction.items || [];

    // Query existing approved returns to verify quantity limits
    const existingReturnsResult = await pool.query(
      `SELECT items FROM returns WHERE transaction_id = $1 AND status = 'approved'`,
      [transaction_id]
    );

    const returnedQuantities = {}; // product_id -> quantity
    for (const rRow of existingReturnsResult.rows) {
      const rItems = rRow.items || [];
      for (const rItem of rItems) {
        returnedQuantities[rItem.product_id] = (returnedQuantities[rItem.product_id] || 0) + parseInt(rItem.quantity, 10);
      }
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

      // Find the purchased item in the transaction items array
      const productId = parseInt(transaction_item_id, 10);
      const txItem = txItems.find(tItem => tItem.product_id === productId);

      if (!txItem) {
        return res.status(400).json({
          success: false,
          error: `Produk dengan ID ${productId} tidak ditemukan dalam transaksi ini.`,
        });
      }

      const previouslyReturned = returnedQuantities[productId] || 0;
      if (qty + previouslyReturned > txItem.quantity) {
        return res.status(400).json({
          success: false,
          error: `Jumlah retur (${qty + previouslyReturned}) melebihi jumlah pembelian asli (${txItem.quantity}) untuk produk "${txItem.product_name}".`,
        });
      }

      // Calculate refund based on condition
      let deductionRate = 0;
      let refundMultiplier = 1.0;

      if (condition === 'damaged') {
        deductionRate = 30;
        refundMultiplier = 0.70;
      }

      const refundAmount = parseFloat(txItem.unit_price) * qty * refundMultiplier;

      enrichedItems.push({
        product_id: txItem.product_id,
        product_name: txItem.product_name,
        quantity: qty,
        unit_price: parseFloat(txItem.unit_price),
        condition,
        deduction_rate: deductionRate,
        refund_amount: refundAmount,
        notes: itemNotes || null,
      });

      // Update the returned quantities map for checks during this transaction run
      returnedQuantities[productId] = previouslyReturned + qty;
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
         (transaction_id, return_number, processed_by, return_reason,
          return_type, total_refund_amount, status, notes, items)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7, $8)
       RETURNING *`,
      [
        transaction_id,
        returnNumber,
        req.user.id,
        return_reason,
        return_type,
        totalRefund,
        notes || null,
        JSON.stringify(enrichedItems)
      ]
    );

    // Return stock to inventory
    for (const item of enrichedItems) {
      if (item.product_id) {
        await client.query(
          'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    // ── Determine new transaction status ──────────────────────────────────────
    const fullyReturned = txItems.every(tItem => {
      const returned = returnedQuantities[tItem.product_id] || 0;
      return returned >= tItem.quantity;
    });

    const newStatus = fullyReturned ? 'fully_returned' : 'partially_returned';
    await client.query(
      'UPDATE transactions SET status = $1 WHERE id = $2',
      [newStatus, transaction_id]
    );

    await client.query('COMMIT');

    const resultRow = retInsert.rows[0];
    const responseData = {
      ...resultRow,
      id: `${resultRow.transaction_id}_${resultRow.return_number}`,
      items: enrichedItems.map(item => ({
        ...item,
        id: item.product_id,
        transaction_item_id: item.product_id
      })),
      transaction_status: newStatus
    };

    return res.status(201).json({
      success: true,
      data: responseData
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
