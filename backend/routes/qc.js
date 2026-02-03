const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const historyService = require('../services/historyService');
const upload = require('../middleware/upload');

const DEFAULT_HARDWARE_ITEMS = [
    'Periksa kondisi fisik produk', 'Baut terpasang rapi, kencang, dan tidak cacat',
    'Tombol dan lampu power berfungsi dengan baik', 'LCD tidak cacat, redup, atau blur',
    'Speaker berfungsi dengan suara jernih', 'SIM terpasang dan terbaca', 'PIN sesuai dengan label',
    'Port USB berfungsi baik', 'Port Type-C berfungsi baik', 'Port HDMI berfungsi baik',
    'Keyboard dan Touchpad berfungsi baik', 'Kamera berfungsi dengan baik', 'WiFi dan Bluetooth berfungsi'
];

const DEFAULT_SOFTWARE_ITEMS = ['Windows sudah aktivasi', 'Semua driver terinstall dengan benar', 'Dokumentasi unit'];

// Get all QC records
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, startDate, endDate, qcUserId, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT qr.*, l.serial_number, l.model, l.brand, l.status as laptop_status, u.full_name as qc_officer FROM qc_records qr JOIN laptops l ON qr.laptop_id = l.id LEFT JOIN users u ON qr.qc_user_id = u.id WHERE 1=1`;
        const values = [];
        let paramCount = 0;

        if (search) { paramCount++; query += ` AND (l.serial_number ILIKE $${paramCount} OR l.model ILIKE $${paramCount} OR qr.qc_name ILIKE $${paramCount})`; values.push(`%${search}%`); }
        if (status) { paramCount++; query += ` AND qr.overall_status = $${paramCount}`; values.push(status); }
        if (startDate) { paramCount++; query += ` AND qr.qc_date >= $${paramCount}`; values.push(startDate); }
        if (endDate) { paramCount++; query += ` AND qr.qc_date <= $${paramCount}`; values.push(endDate); }
        if (qcUserId) { paramCount++; query += ` AND qr.qc_user_id = $${paramCount}`; values.push(qcUserId); }

        query += ` ORDER BY qr.qc_date DESC`;
        paramCount++; query += ` LIMIT $${paramCount}`; values.push(parseInt(limit));
        paramCount++; query += ` OFFSET $${paramCount}`; values.push(parseInt(offset));

        const result = await db.query(query, values);

        let countQuery = `SELECT COUNT(*) FROM qc_records qr JOIN laptops l ON qr.laptop_id = l.id WHERE 1=1`;
        const countValues = [];
        let countParamCount = 0;
        if (search) { countParamCount++; countQuery += ` AND (l.serial_number ILIKE $${countParamCount} OR l.model ILIKE $${countParamCount} OR qr.qc_name ILIKE $${countParamCount})`; countValues.push(`%${search}%`); }
        if (status) { countParamCount++; countQuery += ` AND qr.overall_status = $${countParamCount}`; countValues.push(status); }

        const countResult = await db.query(countQuery, countValues);

        res.json({ data: result.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countResult.rows[0].count), totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit) } });
    } catch (error) {
        console.error('Get QC records error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Get checklist template
router.get('/checklist-template', authenticateToken, (req, res) => {
    res.json({ hardware: DEFAULT_HARDWARE_ITEMS, software: DEFAULT_SOFTWARE_ITEMS });
});

// Get single QC record
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const qcResult = await db.query(`SELECT qr.*, l.serial_number, l.model, l.brand, u.full_name as qc_officer FROM qc_records qr JOIN laptops l ON qr.laptop_id = l.id LEFT JOIN users u ON qr.qc_user_id = u.id WHERE qr.id = $1`, [id]);
        if (qcResult.rows.length === 0) return res.status(404).json({ error: 'QC record tidak ditemukan' });

        const checklistResult = await db.query('SELECT * FROM qc_checklist_items WHERE qc_record_id = $1 ORDER BY category, id', [id]);
        const attachmentsResult = await db.query('SELECT * FROM attachments WHERE qc_record_id = $1', [id]);

        res.json({ ...qcResult.rows[0], checklist_items: checklistResult.rows, attachments: attachmentsResult.rows });
    } catch (error) {
        console.error('Get QC record error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Start new QC
router.post('/start', authenticateToken, authorize('staff', 'leader'), async (req, res) => {
    try {
        const { serial_number, model, brand } = req.body;
        if (!serial_number) return res.status(400).json({ error: 'Serial number wajib diisi' });

        let laptopResult = await db.query('SELECT * FROM laptops WHERE serial_number = $1', [serial_number]);
        let laptop;
        let isNewLaptop = false;

        if (laptopResult.rows.length === 0) {
            const newLaptopResult = await db.query(`INSERT INTO laptops (serial_number, model, brand, status) VALUES ($1, $2, $3, 'dalam_qc') RETURNING *`, [serial_number, model, brand]);
            laptop = newLaptopResult.rows[0];
            isNewLaptop = true;
        } else {
            laptop = laptopResult.rows[0];
            await db.query("UPDATE laptops SET status = 'dalam_qc', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [laptop.id]);
        }

        const qcResult = await db.query(`INSERT INTO qc_records (laptop_id, qc_user_id, overall_status) VALUES ($1, $2, 'pending') RETURNING *`, [laptop.id, req.user.id]);
        const qcRecord = qcResult.rows[0];

        for (const item of DEFAULT_HARDWARE_ITEMS) { await db.query(`INSERT INTO qc_checklist_items (qc_record_id, category, item_name, status) VALUES ($1, 'hardware', $2, 'pending')`, [qcRecord.id, item]); }
        for (const item of DEFAULT_SOFTWARE_ITEMS) { await db.query(`INSERT INTO qc_checklist_items (qc_record_id, category, item_name, status) VALUES ($1, 'software', $2, 'pending')`, [qcRecord.id, item]); }

        await historyService.logHistory({ laptopId: laptop.id, userId: req.user.id, action: `QC dimulai oleh ${req.user.full_name}`, actionType: 'qc_start', previousStatus: laptop.status, newStatus: 'dalam_qc', details: { qc_record_id: qcRecord.id, is_new_laptop: isNewLaptop }, ipAddress: req.ip });

        const checklistResult = await db.query('SELECT * FROM qc_checklist_items WHERE qc_record_id = $1 ORDER BY category, id', [qcRecord.id]);

        res.status(201).json({ message: 'QC berhasil dimulai', laptop: { ...laptop, status: 'dalam_qc' }, qc_record: qcRecord, checklist_items: checklistResult.rows, is_new_laptop: isNewLaptop });
    } catch (error) {
        console.error('Start QC error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Update checklist item
router.put('/checklist/:itemId', authenticateToken, authorize('staff', 'leader'), async (req, res) => {
    try {
        const { itemId } = req.params;
        const { is_checked, status, notes } = req.body;

        const result = await db.query(`UPDATE qc_checklist_items SET is_checked = COALESCE($1, is_checked), status = COALESCE($2, status), notes = COALESCE($3, notes) WHERE id = $4 RETURNING *`, [is_checked, status, notes, itemId]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Checklist item tidak ditemukan' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update checklist item error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Submit QC (new or edit)
router.post('/:id/submit', authenticateToken, authorize('staff', 'leader'), async (req, res) => {
    try {
        const { id } = req.params;
        const { qc_name, qc_room, qc_line, qc_table, notes, checklist_items } = req.body;

        if (!qc_name || !qc_room || !qc_line || !qc_table) {
            return res.status(400).json({ error: 'Nama, Ruangan, Line, dan Meja wajib diisi' });
        }

        const qcResult = await db.query(`SELECT qr.*, l.id as laptop_id, l.status as current_status FROM qc_records qr JOIN laptops l ON qr.laptop_id = l.id WHERE qr.id = $1`, [id]);
        if (qcResult.rows.length === 0) return res.status(404).json({ error: 'QC record tidak ditemukan' });

        const qcRecord = qcResult.rows[0];

        // Update checklist items
        if (checklist_items && Array.isArray(checklist_items)) {
            for (const item of checklist_items) {
                if (item.id) {
                    await db.query(`UPDATE qc_checklist_items SET is_checked = $1, status = $2, notes = $3 WHERE id = $4 AND qc_record_id = $5`,
                        [item.is_checked || false, item.status || 'pending', item.notes || null, item.id, id]);
                }
            }
        }

        const failedItems = await db.query(`SELECT COUNT(*) FROM qc_checklist_items WHERE qc_record_id = $1 AND status = 'fail'`, [id]);
        const hasFailures = parseInt(failedItems.rows[0].count) > 0;
        const overallStatus = hasFailures ? 'fail' : 'pass';
        const laptopStatus = hasFailures ? 'perlu_perbaikan' : 'lulus_qc';

        // Update QC record with officer info
        await db.query(
            `UPDATE qc_records SET qc_name = $1, qc_room = $2, qc_line = $3, qc_table = $4, notes = $5, overall_status = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7`,
            [qc_name, qc_room, qc_line, qc_table, notes || null, overallStatus, id]
        );

        // Update laptop status
        await db.query('UPDATE laptops SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [laptopStatus, qcRecord.laptop_id]);

        const isEdit = qcRecord.overall_status !== 'pending';
        await historyService.logHistory({
            laptopId: qcRecord.laptop_id,
            userId: req.user.id,
            action: `QC ${isEdit ? 'diedit' : 'selesai'} - ${overallStatus === 'pass' ? 'LULUS' : 'PERLU PERBAIKAN'}`,
            actionType: isEdit ? 'qc_edit' : 'qc_complete',
            previousStatus: qcRecord.current_status,
            newStatus: laptopStatus,
            details: { qc_record_id: id, overall_status: overallStatus, failed_items_count: parseInt(failedItems.rows[0].count), qc_name, qc_room, qc_line, qc_table },
            ipAddress: req.ip
        });

        res.json({ message: `QC berhasil ${isEdit ? 'diedit' : 'diselesaikan'}`, overall_status: overallStatus, laptop_status: laptopStatus, has_failures: hasFailures });
    } catch (error) {
        console.error('Submit QC error:', error);
        // Check if it's a column missing error
        if (error.message && error.message.includes('column')) {
            return res.status(500).json({ error: 'Database perlu diupdate. Jalankan schema.sql untuk menambahkan kolom baru.' });
        }
        res.status(500).json({ error: 'Terjadi kesalahan server: ' + error.message });
    }
});

// Edit existing QC record (load for editing)
router.get('/:id/edit', authenticateToken, authorize('staff', 'leader'), async (req, res) => {
    try {
        const { id } = req.params;
        const qcResult = await db.query(`SELECT qr.*, l.serial_number, l.model, l.brand, l.id as laptop_id FROM qc_records qr JOIN laptops l ON qr.laptop_id = l.id WHERE qr.id = $1`, [id]);

        if (qcResult.rows.length === 0) return res.status(404).json({ error: 'QC record tidak ditemukan' });

        const checklistResult = await db.query('SELECT * FROM qc_checklist_items WHERE qc_record_id = $1 ORDER BY category, id', [id]);
        const attachmentsResult = await db.query('SELECT * FROM attachments WHERE qc_record_id = $1', [id]);

        res.json({ ...qcResult.rows[0], checklist_items: checklistResult.rows, attachments: attachmentsResult.rows });
    } catch (error) {
        console.error('Get QC for edit error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Upload attachments
router.post('/:id/attachments', authenticateToken, authorize('staff', 'leader'), upload.array('photos', 5), async (req, res) => {
    try {
        const { id } = req.params;
        const { description } = req.body;
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Tidak ada file yang diupload' });

        const attachments = [];
        for (const file of req.files) {
            const result = await db.query(`INSERT INTO attachments (qc_record_id, file_name, file_path, file_type, file_size, description, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [id, file.originalname, file.path, file.mimetype, file.size, description, req.user.id]);
            attachments.push(result.rows[0]);
        }

        res.status(201).json({ message: 'File berhasil diupload', attachments });
    } catch (error) {
        console.error('Upload attachment error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Delete attachment
router.delete('/attachments/:attachmentId', authenticateToken, authorize('staff', 'leader'), async (req, res) => {
    try {
        const { attachmentId } = req.params;
        const result = await db.query('DELETE FROM attachments WHERE id = $1 RETURNING *', [attachmentId]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Attachment tidak ditemukan' });
        res.json({ message: 'Attachment berhasil dihapus' });
    } catch (error) {
        console.error('Delete attachment error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Delete QC record - ADMIN ONLY
router.delete('/:id', authenticateToken, authorize('leader'), async (req, res) => {
    try {
        const { id } = req.params;

        // Get QC record info first for logging
        const qcResult = await db.query(`SELECT qr.*, l.serial_number, l.id as laptop_id FROM qc_records qr JOIN laptops l ON qr.laptop_id = l.id WHERE qr.id = $1`, [id]);

        if (qcResult.rows.length === 0) {
            return res.status(404).json({ error: 'QC record tidak ditemukan' });
        }

        const qcRecord = qcResult.rows[0];

        // Delete related checklist items first
        await db.query('DELETE FROM qc_checklist_items WHERE qc_record_id = $1', [id]);

        // Delete related attachments
        await db.query('DELETE FROM attachments WHERE qc_record_id = $1', [id]);

        // Delete the QC record
        await db.query('DELETE FROM qc_records WHERE id = $1', [id]);

        // Check if there are other QC records for this laptop
        const remainingQC = await db.query('SELECT id FROM qc_records WHERE laptop_id = $1', [qcRecord.laptop_id]);

        if (remainingQC.rows.length === 0) {
            // No more QC records - delete history logs and laptop entry
            await db.query('DELETE FROM history_logs WHERE laptop_id = $1', [qcRecord.laptop_id]);
            await db.query('DELETE FROM laptops WHERE id = $1', [qcRecord.laptop_id]);
        }

        res.json({ message: 'QC record dan data terkait berhasil dihapus' });
    } catch (error) {
        console.error('Delete QC record error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

module.exports = router;
