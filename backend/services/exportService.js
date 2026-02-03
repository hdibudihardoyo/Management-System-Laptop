const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const db = require('../config/database');

const generatePDFReport = async (data, options = {}) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(20).font('Helvetica-Bold').text('LAPORAN QUALITY CONTROL LAPTOP', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica').text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, { align: 'center' });
        doc.moveDown(2);

        if (data.summary) {
            doc.fontSize(14).font('Helvetica-Bold').text('RINGKASAN');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Total QC: ${data.summary.total || 0}`);
            doc.text(`Lulus QC: ${data.summary.passed || 0}`);
            doc.text(`Perlu Perbaikan: ${data.summary.needsRepair || 0}`);
            doc.text(`Dalam Perbaikan: ${data.summary.inRepair || 0}`);
            doc.moveDown(2);
        }

        if (data.records && data.records.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('DETAIL QC RECORDS');
            doc.moveDown(0.5);

            const tableTop = doc.y;
            const colWidths = [80, 100, 80, 100, 80];
            const headers = ['Serial Number', 'Model', 'Status', 'QC Officer', 'Tanggal'];

            doc.fontSize(9).font('Helvetica-Bold');
            let x = 50;
            headers.forEach((header, i) => {
                doc.text(header, x, tableTop, { width: colWidths[i] });
                x += colWidths[i];
            });

            doc.moveDown();

            doc.font('Helvetica');
            data.records.forEach((record, index) => {
                if (doc.y > 700) {
                    doc.addPage();
                }

                x = 50;
                const y = doc.y;
                const row = [
                    record.serial_number || '-',
                    record.model || '-',
                    record.status || '-',
                    record.qc_officer || '-',
                    record.qc_date ? new Date(record.qc_date).toLocaleDateString('id-ID') : '-'
                ];

                row.forEach((cell, i) => {
                    doc.text(cell, x, y, { width: colWidths[i] });
                    x += colWidths[i];
                });
                doc.moveDown(0.5);
            });
        }

        doc.moveDown(2);
        doc.fontSize(8).text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, { align: 'right' });

        doc.end();
    });
};

const generateExcelReport = async (data, options = {}) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'QC Laptop System';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Ringkasan');
    summarySheet.columns = [
        { header: 'Kategori', key: 'category', width: 25 },
        { header: 'Jumlah', key: 'count', width: 15 }
    ];

    if (data.summary) {
        summarySheet.addRow({ category: 'Total QC', count: data.summary.total || 0 });
        summarySheet.addRow({ category: 'Lulus QC', count: data.summary.passed || 0 });
        summarySheet.addRow({ category: 'Perlu Perbaikan', count: data.summary.needsRepair || 0 });
        summarySheet.addRow({ category: 'Dalam Perbaikan', count: data.summary.inRepair || 0 });
    }

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };
    summarySheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    const detailSheet = workbook.addWorksheet('Detail QC');
    detailSheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Serial Number', key: 'serial_number', width: 20 },
        { header: 'Model', key: 'model', width: 20 },
        { header: 'Brand', key: 'brand', width: 15 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'QC Officer', key: 'qc_officer', width: 20 },
        { header: 'Tanggal QC', key: 'qc_date', width: 15 },
        { header: 'Catatan', key: 'notes', width: 30 }
    ];

    if (data.records) {
        data.records.forEach((record, index) => {
            detailSheet.addRow({
                no: index + 1,
                serial_number: record.serial_number || '-',
                model: record.model || '-',
                brand: record.brand || '-',
                status: record.status || '-',
                qc_officer: record.qc_officer || '-',
                qc_date: record.qc_date ? new Date(record.qc_date).toLocaleDateString('id-ID') : '-',
                notes: record.notes || '-'
            });
        });
    }

    detailSheet.getRow(1).font = { bold: true };
    detailSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };
    detailSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    [summarySheet, detailSheet].forEach(sheet => {
        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });
    });

    return await workbook.xlsx.writeBuffer();
};

const getReportData = async (startDate, endDate) => {
    const summaryQuery = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'lulus_qc' THEN 1 ELSE 0 END) as passed,
            SUM(CASE WHEN status = 'perlu_perbaikan' THEN 1 ELSE 0 END) as needs_repair,
            SUM(CASE WHEN status = 'dalam_perbaikan' THEN 1 ELSE 0 END) as in_repair
        FROM laptops
        WHERE updated_at BETWEEN $1 AND $2
    `;

    const summaryResult = await db.query(summaryQuery, [startDate, endDate]);

    const recordsQuery = `
        SELECT 
            l.serial_number,
            l.model,
            l.brand,
            l.status,
            qr.notes,
            qr.qc_date,
            u.full_name as qc_officer
        FROM laptops l
        LEFT JOIN qc_records qr ON l.id = qr.laptop_id
        LEFT JOIN users u ON qr.qc_user_id = u.id
        WHERE l.updated_at BETWEEN $1 AND $2
        ORDER BY qr.qc_date DESC
    `;

    const recordsResult = await db.query(recordsQuery, [startDate, endDate]);

    return {
        summary: {
            total: parseInt(summaryResult.rows[0].total) || 0,
            passed: parseInt(summaryResult.rows[0].passed) || 0,
            needsRepair: parseInt(summaryResult.rows[0].needs_repair) || 0,
            inRepair: parseInt(summaryResult.rows[0].in_repair) || 0
        },
        records: recordsResult.rows
    };
};

module.exports = {
    generatePDFReport,
    generateExcelReport,
    getReportData
};
