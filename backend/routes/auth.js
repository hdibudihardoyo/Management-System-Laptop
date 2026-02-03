const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const historyService = require('../services/historyService');

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username dan password wajib diisi' });
        }

        const result = await db.query(
            'SELECT * FROM users WHERE username = $1 AND is_active = true',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Username atau password salah' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Username atau password salah' });
        }

        const token = generateToken(user);

        await historyService.logHistory({
            userId: user.id,
            action: `User ${user.username} logged in`,
            actionType: 'status_change',
            details: { action: 'login' },
            ipAddress: req.ip
        });

        res.json({
            message: 'Login berhasil',
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, username, full_name, role, email, created_at FROM users WHERE id = $1',
            [req.user.id]
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

router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await historyService.logHistory({
            userId: req.user.id,
            action: `User ${req.user.username} logged out`,
            actionType: 'status_change',
            details: { action: 'logout' },
            ipAddress: req.ip
        });

        res.json({ message: 'Logout berhasil' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Password lama dan baru wajib diisi' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
        }

        const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];

        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Password lama salah' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query(
            'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hashedPassword, req.user.id]
        );

        res.json({ message: 'Password berhasil diubah' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

module.exports = router;
