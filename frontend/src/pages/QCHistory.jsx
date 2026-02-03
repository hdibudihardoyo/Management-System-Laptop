import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { qcAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const QCHistory = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => { loadRecords(); }, [pagination.page, statusFilter, searchTerm]);

    const loadRecords = async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (statusFilter) params.status = statusFilter;
            if (searchTerm) params.search = searchTerm;
            const result = await qcAPI.getAll(params);
            setRecords(result.data);
            setPagination(prev => ({ ...prev, ...result.pagination }));
        } catch (err) {
            console.error(err);
        } finally { setLoading(false); }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchTerm(searchInput);
        setPagination(p => ({ ...p, page: 1 }));
    };

    const clearSearch = () => {
        setSearchInput('');
        setSearchTerm('');
        setPagination(p => ({ ...p, page: 1 }));
    };

    const handleDelete = async (id) => {
        setDeleting(true);
        try {
            await qcAPI.deleteQCRecord(id);
            setDeleteConfirm(null);
            loadRecords();
        } catch (err) {
            alert('Gagal menghapus: ' + err.message);
        } finally { setDeleting(false); }
    };

    const isLeader = user?.role === 'leader';
    const canEdit = user?.role === 'leader' || user?.role === 'staff';

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">Riwayat QC</h1>
                <p className="page-subtitle">Daftar hasil Quality Control</p>
            </header>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ maxWidth: '400px', margin: '1rem' }}>
                        <div className="card-header"><h3 className="card-title">⚠️ Konfirmasi Hapus</h3></div>
                        <p style={{ marginBottom: '1rem' }}>Apakah Anda yakin ingin menghapus QC record untuk laptop <strong>{deleteConfirm.serial_number}</strong>?</p>
                        <p style={{ color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>⚠️ Data laptop juga akan dihapus dari daftar!</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)} disabled={deleting}>Batal</button>
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleDelete(deleteConfirm.id)} disabled={deleting}>{deleting ? 'Menghapus...' : '🗑️ Hapus'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                {/* Search Box */}
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Cari serial number, model, atau nama QC..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-primary">🔍 Cari</button>
                    {searchTerm && <button type="button" className="btn btn-secondary" onClick={clearSearch}>✕ Reset</button>}
                </form>

                {/* Status Filter */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {['', 'pass', 'fail', 'pending'].map(status => (
                        <button key={status} className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => { setStatusFilter(status); setPagination(p => ({ ...p, page: 1 })); }}>
                            {status === '' ? 'Semua' : status === 'pass' ? '✅ Lulus' : status === 'fail' ? '❌ Gagal' : '⏳ Pending'}
                        </button>
                    ))}
                </div>

                {searchTerm && (
                    <div style={{ marginBottom: '1rem', padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                        Hasil pencarian untuk: <strong style={{ color: 'var(--text-primary)' }}>"{searchTerm}"</strong>
                    </div>
                )}

                {loading ? (
                    <div className="loading-screen" style={{ minHeight: '200px' }}><div className="loading-spinner"></div></div>
                ) : records.length > 0 ? (
                    <>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>Serial Number</th>
                                        <th>Model</th>
                                        <th>Status</th>
                                        <th>QC Officer</th>
                                        <th>Ruangan</th>
                                        <th>Line / Meja</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map(record => (
                                        <tr key={record.id}>
                                            <td>{new Date(record.qc_date).toLocaleString('id-ID')}</td>
                                            <td><strong>{record.serial_number}</strong></td>
                                            <td>{record.model || '-'}</td>
                                            <td><span className={`badge badge-${record.overall_status}`}>{record.overall_status === 'pass' ? 'Lulus' : record.overall_status === 'fail' ? 'Gagal' : 'Pending'}</span></td>
                                            <td>{record.qc_name || record.qc_officer || '-'}</td>
                                            <td>{record.qc_room || '-'}</td>
                                            <td>{record.qc_line && record.qc_table ? `${record.qc_line} / ${record.qc_table}` : '-'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <Link to={`/laptops/${record.laptop_id}`} className="btn btn-secondary btn-sm">👁️</Link>
                                                    {canEdit && (
                                                        <Link to={`/qc/edit/${record.id}`} className="btn btn-primary btn-sm">✏️</Link>
                                                    )}
                                                    {isLeader && (
                                                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(record)}>🗑️</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Showing {records.length} of {pagination.total} records</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page <= 1}>← Prev</button>
                                <span style={{ padding: '8px 16px' }}>Page {pagination.page} of {pagination.totalPages || 1}</span>
                                <button className="btn btn-secondary btn-sm" onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.totalPages}>Next →</button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="empty-state"><div className="empty-icon">📭</div><p>{searchTerm ? 'Tidak ada hasil ditemukan' : 'Belum ada riwayat QC'}</p></div>
                )}
            </div>
        </div>
    );
};

export default QCHistory;
