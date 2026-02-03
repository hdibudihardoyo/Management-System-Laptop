const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const { generatePDFReport, generateExcelReport, getReportData } = require('../services/exportService');

router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const statusStats = await db.query(`SELECT status, COUNT(*) as count FROM laptops GROUP BY status`);
        const todayStats = await db.query(`SELECT COUNT(*) as total_qc_today, SUM(CASE WHEN overall_status = 'pass' THEN 1 ELSE 0 END) as passed_today, SUM(CASE WHEN overall_status = 'fail' THEN 1 ELSE 0 END) as failed_today FROM qc_records WHERE DATE(qc_date) = CURRENT_DATE`);
        const qcByUser = await db.query(`SELECT u.full_name as user_name, COUNT(qr.id) as total_qc, SUM(CASE WHEN qr.overall_status = 'pass' THEN 1 ELSE 0 END) as passed, SUM(CASE WHEN qr.overall_status = 'fail' THEN 1 ELSE 0 END) as failed FROM qc_records qr JOIN users u ON qr.qc_user_id = u.id WHERE qr.qc_date >= CURRENT_DATE - INTERVAL '30 days' GROUP BY u.id, u.full_name ORDER BY total_qc DESC`);
        const weeklyTrend = await db.query(`SELECT DATE(qc_date) as date, COUNT(*) as total, SUM(CASE WHEN overall_status = 'pass' THEN 1 ELSE 0 END) as passed, SUM(CASE WHEN overall_status = 'fail' THEN 1 ELSE 0 END) as failed FROM qc_records WHERE qc_date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(qc_date) ORDER BY date`);
        const recentActivities = await db.query(`SELECT h.*, u.full_name as user_name, l.serial_number FROM history_logs h LEFT JOIN users u ON h.user_id = u.id LEFT JOIN laptops l ON h.laptop_id = l.id ORDER BY h.created_at DESC LIMIT 10`);

        const statusMap = {};
        statusStats.rows.forEach(row => { statusMap[row.status] = parseInt(row.count); });

        res.json({
            summary: { total_laptops: Object.values(statusMap).reduce((a, b) => a + b, 0), dalam_qc: statusMap.dalam_qc || 0, lulus_qc: statusMap.lulus_qc || 0, perlu_perbaikan: statusMap.perlu_perbaikan || 0, pending: statusMap.pending || 0 },
            today: { total_qc: parseInt(todayStats.rows[0].total_qc_today) || 0, passed: parseInt(todayStats.rows[0].passed_today) || 0, failed: parseInt(todayStats.rows[0].failed_today) || 0 },
            qc_by_user: qcByUser.rows,
            weekly_trend: weeklyTrend.rows,
            recent_activities: recentActivities.rows
        });
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

router.get('/export/pdf', authenticateToken, authorize('leader', 'staff'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ error: 'Tanggal awal dan akhir wajib diisi' });

        const data = await getReportData(startDate, endDate);
        const pdfBuffer = await generatePDFReport(data);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=laporan-qc-${startDate}-${endDate}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Export PDF error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat generate PDF' });
    }
});

router.get('/export/excel', authenticateToken, authorize('leader', 'staff'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ error: 'Tanggal awal dan akhir wajib diisi' });

        const data = await getReportData(startDate, endDate);
        const excelBuffer = await generateExcelReport(data);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=laporan-qc-${startDate}-${endDate}.xlsx`);
        res.send(excelBuffer);
    } catch (error) {
        console.error('Export Excel error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat generate Excel' });
    }
});

router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 50, laptopId, userId, actionType, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT h.*, u.full_name as user_name, l.serial_number FROM history_logs h LEFT JOIN users u ON h.user_id = u.id LEFT JOIN laptops l ON h.laptop_id = l.id WHERE 1=1`;
        const values = [];
        let paramCount = 0;

        if (laptopId) { paramCount++; query += ` AND h.laptop_id = $${paramCount}`; values.push(laptopId); }
        if (userId) { paramCount++; query += ` AND h.user_id = $${paramCount}`; values.push(userId); }
        if (actionType) { paramCount++; query += ` AND h.action_type = $${paramCount}`; values.push(actionType); }
        if (startDate) { paramCount++; query += ` AND h.created_at >= $${paramCount}`; values.push(startDate); }
        if (endDate) { paramCount++; query += ` AND h.created_at <= $${paramCount}`; values.push(endDate); }

        query += ` ORDER BY h.created_at DESC`;
        paramCount++; query += ` LIMIT $${paramCount}`; values.push(parseInt(limit));
        paramCount++; query += ` OFFSET $${paramCount}`; values.push(parseInt(offset));

        const result = await db.query(query, values);
        res.json({ data: result.rows, pagination: { page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

module.exports = router;
