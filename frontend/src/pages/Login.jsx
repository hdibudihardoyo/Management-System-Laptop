import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await login(username, password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon">🔍</div>
                    <h2 className="login-title">QC Laptop System</h2>
                    <p className="login-subtitle">Quality Control Management</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input type="text" className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan username" required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password" required />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Memproses...' : 'Login'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Demo Login:</p>
                    <p><strong>Leader:</strong> leader / leader123</p>
                    <p><strong>Staff:</strong> staff / staff123</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
