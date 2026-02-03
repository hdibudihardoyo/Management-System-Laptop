const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const historyService = require('../services/historyService');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT l.*, qr.overall_status as last_qc_status, qr.qc_date as last_qc_date, u.full_name as last_qc_officer
            FROM laptops l
            LEFT JOIN LATERAL (SELECT * FROM qc_records WHERE laptop_id = l.id ORDER BY qc_date DESC LIMIT 1) qr ON true
            LEFT JOIN users u ON qr.qc_user_id = u.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        if (status) {
            paramCount++;
            query += ` AND l.status = $${paramCount}`;
            values.push(status);
        }

        if (search) {
            paramCount++;
            query += ` AND (l.serial_number ILIKE $${paramCount} OR l.model ILIKE $${paramCount} OR l.brand ILIKE $${paramCount})`;
            values.push(`%${search}%`);
        }

        const validSortColumns = ['serial_number', 'model', 'brand', 'status', 'created_at', 'updated_at'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY l.${sortColumn} ${order}`;

        paramCount++;
        query += ` LIMIT $${paramCount}`;
        values.push(parseInt(limit));

        paramCount++;
        query += ` OFFSET $${paramCount}`;
        values.push(parseInt(offset));

        const result = await db.query(query, values);

        let countQuery = 'SELECT COUNT(*) FROM laptops WHERE 1=1';
        const countValues = [];
        let countParamCount = 0;

        if (status) {
            countParamCount++;
            countQuery += ` AND status = $${countParamCount}`;
            countValues.push(status);
        }

        if (search) {
            countParamCount++;
            countQuery += ` AND (serial_number ILIKE $${countParamCount} OR model ILIKE $${countParamCount} OR brand ILIKE $${countParamCount})`;
            countValues.push(`%${search}%`);
        }

        const countResult = await db.query(countQuery, countValues);
        const totalCount = parseInt(countResult.rows[0].count);

        res.json({
            data: result.rows,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: totalCount, totalPages: Math.ceil(totalCount / limit) }
        });
    } catch (error) {
        console.error('Get laptops error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.get('/search/:serialNumber', authenticateToken, async (req, res) => {
    try {
        const { serialNumber } = req.params;
        const result = await db.query(
            `SELECT l.*, json_agg(json_build_object('id', qr.id, 'qc_date', qr.qc_date, 'overall_status', qr.overall_status, 'notes', qr.notes, 'qc_officer', u.full_name) ORDER BY qr.qc_date DESC) FILTER (WHERE qr.id IS NOT NULL) as qc_history
            FROM laptops l LEFT JOIN qc_records qr ON l.id = qr.laptop_id LEFT JOIN users u ON qr.qc_user_id = u.id WHERE l.serial_number = $1 GROUP BY l.id`,
            [serialNumber]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Laptop tidak ditemukan', serial_number: serialNumber, found: false });
        }

        res.json({ ...result.rows[0], found: true });
    } catch (error) {
        console.error('Search laptop error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const laptopResult = await db.query('SELECT * FROM laptops WHERE id = $1', [id]);

        if (laptopResult.rows.length === 0) {
            return res.status(404).json({ error: 'Laptop tidak ditemukan' });
        }

        const qcResult = await db.query(`SELECT qr.*, u.full_name as qc_officer FROM qc_records qr LEFT JOIN users u ON qr.qc_user_id = u.id WHERE qr.laptop_id = $1 ORDER BY qr.qc_date DESC`, [id]);
        const assignmentResult = await db.query(`SELECT a.*, ab.full_name as assigned_by_name, at.full_name as assigned_to_name FROM assignments a LEFT JOIN users ab ON a.assigned_by = ab.id LEFT JOIN users at ON a.assigned_to = at.id WHERE a.laptop_id = $1 ORDER BY a.assigned_at DESC`, [id]);
        const historyResult = await db.query(`SELECT h.*, u.full_name as user_name FROM history_logs h LEFT JOIN users u ON h.user_id = u.id WHERE h.laptop_id = $1 ORDER BY h.created_at DESC LIMIT 50`, [id]);

        res.json({ ...laptopResult.rows[0], qc_records: qcResult.rows, assignments: assignmentResult.rows, history: historyResult.rows });
    } catch (error) {
        console.error('Get laptop error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.post('/', authenticateToken, authorize('leader', 'staff'), async (req, res) => {
    try {
        const { serial_number, model, brand, specifications } = req.body;

        if (!serial_number) {
            return res.status(400).json({ error: 'Serial number wajib diisi' });
        }

        const existing = await db.query('SELECT id FROM laptops WHERE serial_number = $1', [serial_number]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Serial number sudah terdaftar' });
        }

        const result = await db.query(
            `INSERT INTO laptops (serial_number, model, brand, specifications, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
            [serial_number, model, brand, specifications ? JSON.stringify(specifications) : null]
        );

        await historyService.logHistory({ laptopId: result.rows[0].id, userId: req.user.id, action: `Laptop baru didaftarkan: ${serial_number}`, actionType: 'status_change', newStatus: 'pending', details: { serial_number, model, brand }, ipAddress: req.ip });

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create laptop error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.put('/:id', authenticateToken, authorize('leader', 'staff'), async (req, res) => {
    try {
        const { id } = req.params;
        const { serial_number, model, brand, specifications, status } = req.body;

        const currentLaptop = await db.query('SELECT * FROM laptops WHERE id = $1', [id]);
        if (currentLaptop.rows.length === 0) {
            return res.status(404).json({ error: 'Laptop tidak ditemukan' });
        }

        // Check if serial_number is being changed and if new one already exists
        if (serial_number && serial_number !== currentLaptop.rows[0].serial_number) {
            const existing = await db.query('SELECT id FROM laptops WHERE serial_number = $1 AND id != $2', [serial_number, id]);
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Serial number sudah digunakan laptop lain' });
            }
        }

        const result = await db.query(
            `UPDATE laptops SET 
                serial_number = COALESCE($1, serial_number),
                model = COALESCE($2, model), 
                brand = COALESCE($3, brand), 
                specifications = COALESCE($4, specifications), 
                status = COALESCE($5, status), 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $6 RETURNING *`,
            [serial_number, model, brand, specifications ? JSON.stringify(specifications) : null, status, id]
        );

        // Log changes
        const changes = [];
        if (serial_number && serial_number !== currentLaptop.rows[0].serial_number) changes.push(`SN: ${currentLaptop.rows[0].serial_number} → ${serial_number}`);
        if (model && model !== currentLaptop.rows[0].model) changes.push(`Model: ${currentLaptop.rows[0].model || '-'} → ${model}`);
        if (brand && brand !== currentLaptop.rows[0].brand) changes.push(`Brand: ${currentLaptop.rows[0].brand || '-'} → ${brand}`);
        if (status && status !== currentLaptop.rows[0].status) changes.push(`Status: ${currentLaptop.rows[0].status} → ${status}`);

        if (changes.length > 0) {
            await historyService.logHistory({
                laptopId: id,
                userId: req.user.id,
                action: `Data laptop diubah: ${changes.join(', ')}`,
                actionType: 'status_change',
                previousStatus: currentLaptop.rows[0].status,
                newStatus: status || currentLaptop.rows[0].status,
                details: { old: { serial_number: currentLaptop.rows[0].serial_number, model: currentLaptop.rows[0].model, brand: currentLaptop.rows[0].brand }, new: { serial_number, model, brand } },
                ipAddress: req.ip
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update laptop error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.get('/:id/history', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const history = await historyService.getLaptopHistory(id, parseInt(limit), parseInt(offset));
        res.json(history);
    } catch (error) {
        console.error('Get laptop history error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

module.exports = router;
