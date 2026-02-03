import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { qcAPI, laptopAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const QCForm = () => {
    const { id: editId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(editId ? 'loading' : 'search');
    const [serialNumber, setSerialNumber] = useState('');
    const [model, setModel] = useState('');
    const [brand, setBrand] = useState('');
    const [laptop, setLaptop] = useState(null);
    const [qcRecord, setQcRecord] = useState(null);
    const [checklistItems, setChecklistItems] = useState([]);
    const [notes, setNotes] = useState('');
    const [qcName, setQcName] = useState('');
    const [qcRoom, setQcRoom] = useState('');
    const [qcLine, setQcLine] = useState('');
    const [qcTable, setQcTable] = useState('');
    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const scannerRef = useRef(null);

    useEffect(() => {
        if (editId) {
            loadQCForEdit(editId);
        }
    }, [editId]);

    const loadQCForEdit = async (id) => {
        try {
            const data = await qcAPI.getForEdit(id);
            setLaptop({ id: data.laptop_id, serial_number: data.serial_number, model: data.model, brand: data.brand });
            setQcRecord({ id: data.id });
            setChecklistItems(data.checklist_items || []);
            setNotes(data.notes || '');
            setQcName(data.qc_name || '');
            setQcRoom(data.qc_room || '');
            setQcLine(data.qc_line || '');
            setQcTable(data.qc_table || '');
            setSerialNumber(data.serial_number);
            setStep('checklist');
        } catch (err) {
            setError('Gagal memuat data QC: ' + err.message);
            setStep('search');
        }
    };

    const startScanner = async () => {
        setScanning(true);
        try {
            scannerRef.current = new Html5Qrcode('qr-reader');
            await scannerRef.current.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, () => { });
        } catch (err) {
            setError('Gagal mengakses kamera: ' + err.message);
            setScanning(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            await scannerRef.current.stop();
            scannerRef.current = null;
        }
        setScanning(false);
    };

    const onScanSuccess = (decodedText) => {
        setSerialNumber(decodedText);
        stopScanner();
    };

    const searchLaptop = async () => {
        if (!serialNumber.trim()) { setError('Serial number wajib diisi'); return; }
        setLoading(true);
        setError('');
        try {
            const result = await laptopAPI.searchBySerial(serialNumber);
            if (result.found) { setLaptop(result); setModel(result.model || ''); setBrand(result.brand || ''); }
        } catch (err) {
            setLaptop(null);
        } finally { setLoading(false); }
    };

    const startQC = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await qcAPI.startQC({ serial_number: serialNumber, model, brand });
            setLaptop(result.laptop);
            setQcRecord(result.qc_record);
            setChecklistItems(result.checklist_items);
            setStep('checklist');
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    const updateChecklistStatus = (id, status) => {
        setChecklistItems(items => items.map(item => item.id === id ? { ...item, status, is_checked: status === 'pass' } : item));
    };

    const proceedToInfo = () => {
        const incomplete = checklistItems.filter(item => item.status === 'pending');
        if (incomplete.length > 0) { setError(`Masih ada ${incomplete.length} item yang belum dicek`); return; }
        setStep('info');
    };

    const submitQC = async () => {
        if (!qcName || !qcRoom || !qcLine || !qcTable) { setError('Nama, Ruangan, Line, dan Meja wajib diisi'); return; }
        setLoading(true);
        setError('');
        try {
            const result = await qcAPI.submitQC(qcRecord.id, {
                qc_name: qcName,
                qc_room: qcRoom,
                qc_line: qcLine,
                qc_table: qcTable,
                notes,
                checklist_items: checklistItems
            });

            if (result.has_failures) {
                setSuccess('⚠️ QC Selesai - Laptop PERLU PERBAIKAN. Beberapa item tidak lolos pemeriksaan.');
            } else {
                setSuccess('✅ QC Berhasil! Laptop telah LULUS Quality Control.');
            }

            setTimeout(() => {
                navigate('/qc-history');
            }, 2000);
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    const resetForm = () => {
        setStep('search');
        setSerialNumber('');
        setModel('');
        setBrand('');
        setLaptop(null);
        setQcRecord(null);
        setChecklistItems([]);
        setNotes('');
        setQcName('');
        setQcRoom('');
        setQcLine('');
        setQcTable('');
    };

    const hardwareItems = checklistItems.filter(item => item.category === 'hardware');
    const softwareItems = checklistItems.filter(item => item.category === 'software');

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">{editId ? 'Edit QC' : 'Form QC'}</h1>
                <p className="page-subtitle">{editId ? `Edit data QC - ${serialNumber}` : 'Quality Control Laptop'}</p>
            </header>

            {error && <div className="error-message">{error}</div>}
            {success && <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>{success}</div>}

            {step === 'loading' && (
                <div className="loading-screen" style={{ minHeight: '200px' }}><div className="loading-spinner"></div></div>
            )}

            {step === 'search' && (
                <div className="card">
                    <div className="card-header"><h3 className="card-title">🔍 Cari / Scan Laptop</h3></div>

                    {scanning ? (
                        <div className="scanner-container">
                            <div id="qr-reader" style={{ width: '100%' }}></div>
                            <button className="btn btn-danger" style={{ width: '100%', marginTop: '1rem' }} onClick={stopScanner}>Stop Scanner</button>
                        </div>
                    ) : (
                        <>
                            <div className="search-box">
                                <input type="text" className="form-input" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Masukkan Serial Number" />
                                <button className="btn btn-secondary" onClick={searchLaptop} disabled={loading}>{loading ? '...' : '🔎'}</button>
                                <button className="btn btn-primary" onClick={startScanner}>📷 Scan</button>
                            </div>

                            {laptop && (
                                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                                    <p><strong>SN:</strong> {laptop.serial_number}</p>
                                    <p><strong>Model:</strong> {laptop.model || '-'}</p>
                                    <p><strong>Brand:</strong> {laptop.brand || '-'}</p>
                                    <p><strong>Status:</strong> <span className={`badge badge-${laptop.status}`}>{laptop.status}</span></p>
                                </div>
                            )}

                            {!laptop && serialNumber && (
                                <div className="grid-2" style={{ marginBottom: '1rem' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">Model</label>
                                        <input type="text" className="form-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Contoh: ThinkPad L14" />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">Brand</label>
                                        <input type="text" className="form-input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Contoh: Lenovo" />
                                    </div>
                                </div>
                            )}

                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={startQC} disabled={loading || !serialNumber}>
                                {loading ? 'Memulai...' : '▶️ Mulai QC'}
                            </button>
                        </>
                    )}
                </div>
            )}

            {step === 'checklist' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">✅ Checklist QC - {laptop?.serial_number}</h3>
                        <span className="badge badge-dalam_qc">{editId ? 'Edit Mode' : 'Dalam QC'}</span>
                    </div>

                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>🔧 Hardware Check</h4>
                    {hardwareItems.map(item => (
                        <div key={item.id} className={`checklist-item ${item.status}`}>
                            <div className={`checklist-checkbox ${item.is_checked ? 'checked' : ''}`}></div>
                            <span className="checklist-text">{item.item_name}</span>
                            <div className="checklist-status">
                                <button className={`status-btn pass ${item.status === 'pass' ? 'active' : ''}`} onClick={() => updateChecklistStatus(item.id, 'pass')}>✓ OK</button>
                                <button className={`status-btn fail ${item.status === 'fail' ? 'active' : ''}`} onClick={() => updateChecklistStatus(item.id, 'fail')}>✗ NG</button>
                            </div>
                        </div>
                    ))}

                    <h4 style={{ margin: '1.5rem 0 1rem', color: 'var(--text-secondary)' }}>💾 Software Check</h4>
                    {softwareItems.map(item => (
                        <div key={item.id} className={`checklist-item ${item.status}`}>
                            <div className={`checklist-checkbox ${item.is_checked ? 'checked' : ''}`}></div>
                            <span className="checklist-text">{item.item_name}</span>
                            <div className="checklist-status">
                                <button className={`status-btn pass ${item.status === 'pass' ? 'active' : ''}`} onClick={() => updateChecklistStatus(item.id, 'pass')}>✓ OK</button>
                                <button className={`status-btn fail ${item.status === 'fail' ? 'active' : ''}`} onClick={() => updateChecklistStatus(item.id, 'fail')}>✗ NG</button>
                            </div>
                        </div>
                    ))}

                    <div className="form-group" style={{ marginTop: '1.5rem' }}>
                        <label className="form-label">Catatan (opsional)</label>
                        <textarea className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan..." />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-secondary" onClick={() => editId ? navigate('/qc-history') : resetForm()}>Batal</button>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={proceedToInfo}>Lanjut ke Info QC →</button>
                    </div>
                </div>
            )}

            {step === 'info' && (
                <div className="card">
                    <div className="card-header"><h3 className="card-title">📝 Informasi QC Officer</h3></div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Nama QC Officer *</label>
                            <input type="text" className="form-input" value={qcName} onChange={(e) => setQcName(e.target.value)} placeholder="Nama lengkap" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ruangan *</label>
                            <input type="text" className="form-input" value={qcRoom} onChange={(e) => setQcRoom(e.target.value)} placeholder="Contoh: Ruang QC 1" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Line *</label>
                            <input type="text" className="form-input" value={qcLine} onChange={(e) => setQcLine(e.target.value)} placeholder="Contoh: Line A" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Meja *</label>
                            <input type="text" className="form-input" value={qcTable} onChange={(e) => setQcTable(e.target.value)} placeholder="Contoh: Meja 5" />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button className="btn btn-secondary" onClick={() => setStep('checklist')}>← Kembali</button>
                        <button className="btn btn-success" style={{ flex: 1 }} onClick={submitQC} disabled={loading}>{loading ? 'Menyimpan...' : `✅ ${editId ? 'Simpan Perubahan' : 'Submit QC'}`}</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QCForm;
