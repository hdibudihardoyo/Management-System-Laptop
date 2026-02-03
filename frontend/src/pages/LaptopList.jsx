import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { laptopAPI } from '../services/api';

const LaptopList = () => {
    const [laptops, setLaptops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    useEffect(() => { loadLaptops(); }, [pagination.page, statusFilter]);

    const loadLaptops = async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (statusFilter) params.status = statusFilter;
            if (search) params.search = search;
            const result = await laptopAPI.getAll(params);
            setLaptops(result.data);
            setPagination(prev => ({ ...prev, ...result.pagination }));
        } catch (err) {
            console.error(err);
        } finally { setLoading(false); }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        loadLaptops();
    };

    const statusOptions = ['pending', 'dalam_qc', 'lulus_qc', 'perlu_perbaikan', 'dalam_perbaikan'];

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">Daftar Laptop</h1>
                <p className="page-subtitle">Manajemen dan tracking laptop</p>
            </header>

            <div className="card">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <input type="text" className="form-input" style={{ flex: 1, minWidth: '200px' }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari serial number, model, atau brand..." />
                    <select className="form-input" style={{ width: '180px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">Semua Status</option>
                        {statusOptions.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary">🔍 Cari</button>
                </form>

                {loading ? (
                    <div className="loading-screen" style={{ minHeight: '200px' }}><div className="loading-spinner"></div></div>
                ) : laptops.length > 0 ? (
                    <>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Serial Number</th>
                                        <th>Model</th>
                                        <th>Brand</th>
                                        <th>Status</th>
                                        <th>Last QC</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {laptops.map(laptop => (
                                        <tr key={laptop.id}>
                                            <td><strong>{laptop.serial_number}</strong></td>
                                            <td>{laptop.model || '-'}</td>
                                            <td>{laptop.brand || '-'}</td>
                                            <td><span className={`badge badge-${laptop.status}`}>{laptop.status?.replace('_', ' ')}</span></td>
                                            <td>{laptop.last_qc_date ? new Date(laptop.last_qc_date).toLocaleDateString('id-ID') : '-'}</td>
                                            <td><Link to={`/laptops/${laptop.id}`} className="btn btn-secondary btn-sm">Detail</Link></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Showing {laptops.length} of {pagination.total} laptops</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page <= 1}>← Prev</button>
                                <span style={{ padding: '8px 16px' }}>Page {pagination.page} of {pagination.totalPages}</span>
                                <button className="btn btn-secondary btn-sm" onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.totalPages}>Next →</button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="empty-state"><div className="empty-icon">📭</div><p>Tidak ada laptop ditemukan</p></div>
                )}
            </div>
        </div>
    );
};

export default LaptopList;
