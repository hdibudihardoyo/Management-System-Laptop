import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { laptopAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const LaptopDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [laptop, setLaptop] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState({ serial_number: '', model: '', brand: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => { loadLaptop(); }, [id]);

    const loadLaptop = async () => {
        try {
            const data = await laptopAPI.getById(id);
            setLaptop(data);
            setEditData({ serial_number: data.serial_number || '', model: data.model || '', brand: data.brand || '' });
        } catch (err) {
            console.error(err);
        } finally { setLoading(false); }
    };

    const canEdit = user?.role === 'admin' || user?.role === 'qc';

    const handleSave = async () => {
        if (!editData.serial_number.trim()) {
            setError('Serial number wajib diisi');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await laptopAPI.update(id, editData);
            setSuccess('Data laptop berhasil diperbarui');
            setEditing(false);
            loadLaptop();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
        } finally { setSaving(false); }
    };

    const cancelEdit = () => {
        setEditing(false);
        setEditData({ serial_number: laptop.serial_number || '', model: laptop.model || '', brand: laptop.brand || '' });
        setError('');
    };

    if (loading) return <div className="loading-screen"><div className="loading-spinner"></div></div>;
    if (!laptop) return <div className="error-message">Laptop tidak ditemukan</div>;

    return (
        <div>
            <header className="page-header">
                <Link to="/laptops" style={{ color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '0.5rem', display: 'inline-block' }}>← Kembali</Link>
                <h1 className="page-title">{laptop.serial_number}</h1>
                <p className="page-subtitle">{laptop.brand} {laptop.model}</p>
            </header>

            {error && <div className="error-message">{error}</div>}
            {success && <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>{success}</div>}

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="stat-card"><div className="stat-icon">🔖</div><div className="stat-label">Status</div><span className={`badge badge-${laptop.status}`}>{laptop.status?.replace('_', ' ')}</span></div>
                <div className="stat-card"><div className="stat-icon">📅</div><div className="stat-label">Terdaftar</div><div>{new Date(laptop.created_at).toLocaleDateString('id-ID')}</div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-label">Total QC</div><div className="stat-value">{laptop.qc_records?.length || 0}</div></div>
                <div className="stat-card"><div className="stat-icon">🔄</div><div className="stat-label">Update Terakhir</div><div>{new Date(laptop.updated_at).toLocaleDateString('id-ID')}</div></div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    {['info', 'qc_history', 'activity'].map(tab => (
                        <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab)}>
                            {tab === 'info' && '📋 Info'}
                            {tab === 'qc_history' && '✅ Riwayat QC'}
                            {tab === 'activity' && '📝 Activity Log'}
                        </button>
                    ))}
                </div>

                {activeTab === 'info' && (
                    <div>
                        {!editing ? (
                            <>
                                <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                                    <div><div className="form-label">Serial Number</div><p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{laptop.serial_number}</p></div>
                                    <div><div className="form-label">Model</div><p>{laptop.model || '-'}</p></div>
                                    <div><div className="form-label">Brand</div><p>{laptop.brand || '-'}</p></div>
                                    <div><div className="form-label">Status</div><span className={`badge badge-${laptop.status}`}>{laptop.status}</span></div>
                                </div>
                                {canEdit && (
                                    <button className="btn btn-primary" onClick={() => setEditing(true)}>✏️ Edit Data Laptop</button>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Serial Number *</label>
                                        <input type="text" className="form-input" value={editData.serial_number} onChange={(e) => setEditData({ ...editData, serial_number: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Model</label>
                                        <input type="text" className="form-input" value={editData.model} onChange={(e) => setEditData({ ...editData, model: e.target.value })} placeholder="Contoh: ThinkPad L14" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Brand</label>
                                        <input type="text" className="form-input" value={editData.brand} onChange={(e) => setEditData({ ...editData, brand: e.target.value })} placeholder="Contoh: Lenovo" />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button className="btn btn-secondary" onClick={cancelEdit} disabled={saving}>Batal</button>
                                    <button className="btn btn-success" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}</button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'qc_history' && (
                    laptop.qc_records?.length > 0 ? (
                        <div className="table-container">
                            <table className="data-table">
                                <thead><tr><th>Tanggal</th><th>QC Officer</th><th>Ruangan</th><th>Line/Meja</th><th>Status</th><th>Catatan</th></tr></thead>
                                <tbody>
                                    {laptop.qc_records.map(qc => (
                                        <tr key={qc.id}>
                                            <td>{new Date(qc.qc_date).toLocaleString('id-ID')}</td>
                                            <td>{qc.qc_name || qc.qc_officer || '-'}</td>
                                            <td>{qc.qc_room || '-'}</td>
                                            <td>{qc.qc_line && qc.qc_table ? `${qc.qc_line} / ${qc.qc_table}` : '-'}</td>
                                            <td><span className={`badge badge-${qc.overall_status}`}>{qc.overall_status}</span></td>
                                            <td>{qc.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state"><div className="empty-icon">📭</div><p>Belum ada riwayat QC</p></div>
                    )
                )}

                {activeTab === 'activity' && (
                    laptop.history?.length > 0 ? (
                        <div>
                            {laptop.history.map((h, i) => (
                                <div key={i} className="activity-item">
                                    <div className="activity-icon">📝</div>
                                    <div className="activity-content">
                                        <div className="activity-text">{h.action}</div>
                                        <div className="activity-time">{h.user_name} • {new Date(h.created_at).toLocaleString('id-ID')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state"><div className="empty-icon">📭</div><p>Belum ada activity log</p></div>
                    )
                )}
            </div>
        </div>
    );
};

export default LaptopDetail;
