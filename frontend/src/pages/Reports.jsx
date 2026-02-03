import { useState } from 'react';
import { reportAPI } from '../services/api';

const Reports = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const exportReport = async (format) => {
        if (!startDate || !endDate) { setError('Pilih tanggal awal dan akhir'); return; }
        setLoading(true);
        setError('');

        try {
            let blob;
            let filename;

            if (format === 'pdf') {
                blob = await reportAPI.exportPDF(startDate, endDate);
                filename = `laporan-qc-${startDate}-${endDate}.pdf`;
            } else {
                blob = await reportAPI.exportExcel(startDate, endDate);
                filename = `laporan-qc-${startDate}-${endDate}.xlsx`;
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Gagal mengexport laporan: ' + err.message);
        } finally { setLoading(false); }
    };

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">Reports</h1>
                <p className="page-subtitle">Export laporan QC</p>
            </header>

            <div className="card">
                <div className="card-header"><h3 className="card-title">📊 Export Laporan</h3></div>

                {error && <div className="error-message">{error}</div>}

                <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Tanggal Awal</label>
                        <input type="date" className="form-input" value={startDate || thirtyDaysAgo} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Tanggal Akhir</label>
                        <input type="date" className="form-input" value={endDate || today} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-danger" onClick={() => exportReport('pdf')} disabled={loading} style={{ flex: 1 }}>
                        {loading ? 'Generating...' : '📄 Export PDF'}
                    </button>
                    <button className="btn btn-success" onClick={() => exportReport('excel')} disabled={loading} style={{ flex: 1 }}>
                        {loading ? 'Generating...' : '📊 Export Excel'}
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="card-header"><h3 className="card-title">ℹ️ Informasi</h3></div>
                <ul style={{ color: 'var(--text-secondary)', lineHeight: '2' }}>
                    <li>Laporan PDF berisi ringkasan dan daftar QC dalam rentang tanggal yang dipilih</li>
                    <li>Laporan Excel memiliki 2 sheet: Ringkasan dan Detail QC</li>
                    <li>Data yang diexport termasuk: Serial Number, Model, Brand, Status, QC Officer, Tanggal QC</li>
                </ul>
            </div>
        </div>
    );
};

export default Reports;
