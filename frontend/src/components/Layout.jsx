import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', icon: '📊', label: 'Dashboard' },
        { path: '/qc', icon: '✅', label: 'Form QC', roles: ['leader', 'staff'] },
        { path: '/laptops', icon: '💻', label: 'Laptops' },
        { path: '/qc-history', icon: '📋', label: 'Riwayat QC' },
        { path: '/reports', icon: '📈', label: 'Reports', roles: ['leader', 'staff'] }
    ];

    const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(user?.role));

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">🔍</div>
                    <h1>QC Laptop</h1>
                </div>

                <nav className="sidebar-nav">
                    {filteredNavItems.map(item => (
                        <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-text">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-user">
                    <button className="theme-toggle" onClick={toggleTheme}>
                        <span className="theme-toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
                        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>

                    <div className="user-info">
                        <div className="user-avatar">{user?.full_name?.charAt(0) || 'U'}</div>
                        <div>
                            <div className="user-name">{user?.full_name}</div>
                            <div className="user-role">@{user?.username}</div>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <span>🚪</span> Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
