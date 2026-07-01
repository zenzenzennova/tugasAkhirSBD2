const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

// GET /api/users
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  }
};

// POST /api/users
const createUser = async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ success: false, error: 'Username, password, full_name, dan role wajib diisi.' });
    }

    if (!['kasir', 'owner'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role harus berupa kasir atau owner.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password minimal 6 karakter.' });
    }

    // Check duplicate username
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ success: false, error: 'Username sudah digunakan.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, username, full_name, role, is_active, created_at`,
      [username, passwordHash, full_name, role]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('createUser error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: 'Username sudah digunakan.' });
    }
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  }
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, is_active, password } = req.body;

    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
    }

    if (role && !['kasir', 'owner'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role harus berupa kasir atau owner.' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (full_name !== undefined) { fields.push(`full_name = $${idx++}`); values.push(full_name); }
    if (role !== undefined) { fields.push(`role = $${idx++}`); values.push(role); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }
    if (password !== undefined) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password minimal 6 karakter.' });
      }
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      fields.push(`password_hash = $${idx++}`);
      values.push(passwordHash);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada data yang diperbarui.' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, username, full_name, role, is_active, created_at, updated_at`,
      values
    );

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  }
};

// DELETE /api/users/:id  (soft delete → is_active = false)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    if (req.user.id === userId) {
      return res.status(400).json({ success: false, error: 'Tidak dapat menonaktifkan akun Anda sendiri.' });
    }

    const existing = await pool.query('SELECT id, username FROM users WHERE id = $1', [userId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
    }

    await pool.query(
      'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: { message: `User ${existing.rows[0].username} berhasil dinonaktifkan.` },
    });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server.' });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
