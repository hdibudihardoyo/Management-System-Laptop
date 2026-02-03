import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QCForm from './pages/QCForm';
import LaptopList from './pages/LaptopList';
import LaptopDetail from './pages/LaptopDetail';
import QCHistory from './pages/QCHistory';
import Reports from './pages/Reports';

const ProtectedRoute = ({ children, roles }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) return <div className="loading-screen"><div className="loading-spinner"></div></div>;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;

    return children;
};

function AppRoutes() {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="qc" element={<ProtectedRoute roles={['leader', 'staff']}><QCForm /></ProtectedRoute>} />
                <Route path="qc/edit/:id" element={<ProtectedRoute roles={['leader', 'staff']}><QCForm /></ProtectedRoute>} />
                <Route path="laptops" element={<LaptopList />} />
                <Route path="laptops/:id" element={<LaptopDetail />} />
                <Route path="qc-history" element={<QCHistory />} />
                <Route path="reports" element={<ProtectedRoute roles={['leader', 'staff']}><Reports /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
