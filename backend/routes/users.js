const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');

router.get('/', authenticateToken, authorize('leader'), async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, username, full_name, role, email, is_active, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.get('/role/:role', authenticateToken, async (req, res) => {
    try {
        const { role } = req.params;
        const validRoles = ['leader', 'staff'];

        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Role tidak valid' });
        }

        const result = await db.query(
            'SELECT id, username, full_name, role, email FROM users WHERE role = $1 AND is_active = true ORDER BY full_name',
            [role]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get users by role error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT id, username, full_name, role, email, is_active, created_at FROM users WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.post('/', authenticateToken, authorize('leader'), async (req, res) => {
    try {
        const { username, password, full_name, role, email } = req.body;

        if (!username || !password || !full_name || !role) {
            return res.status(400).json({ error: 'Username, password, nama lengkap, dan role wajib diisi' });
        }

        const validRoles = ['leader', 'staff'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Role tidak valid (hanya leader atau staff)' });
        }

        const existingUser = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username sudah digunakan' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO users (username, password, full_name, role, email) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, username, full_name, role, email, created_at`,
            [username, hashedPassword, full_name, role, email]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.put('/:id', authenticateToken, authorize('leader'), async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, role, email, is_active } = req.body;

        const result = await db.query(
            `UPDATE users 
             SET full_name = COALESCE($1, full_name),
                 role = COALESCE($2, role),
                 email = COALESCE($3, email),
                 is_active = COALESCE($4, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING id, username, full_name, role, email, is_active`,
            [full_name, role, email, is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.put('/:id/reset-password', authenticateToken, authorize('leader'), async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const result = await db.query(
            'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username',
            [hashedPassword, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }

        res.json({ message: 'Password berhasil direset' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.delete('/:id', authenticateToken, authorize('leader'), async (req, res) => {
    try {
        const { id } = req.params;

        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Tidak dapat menghapus akun sendiri' });
        }

        const result = await db.query(
            'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }

        res.json({ message: 'User berhasil dinonaktifkan' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

module.exports = router;
