import { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { reportAPI } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const data = await reportAPI.getDashboard();
            setDashboardData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-screen"><div className="loading-spinner"></div></div>;
    if (error) return <div className="error-message">{error}</div>;

    const statusChartData = {
        labels: ['Pending', 'Dalam QC', 'Lulus QC', 'Perlu Perbaikan'],
        datasets: [{
            data: [
                dashboardData?.summary?.pending || 0,
                dashboardData?.summary?.dalam_qc || 0,
                dashboardData?.summary?.lulus_qc || 0,
                dashboardData?.summary?.perlu_perbaikan || 0
            ],
            backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
            borderWidth: 0
        }]
    };

    const trendData = {
        labels: dashboardData?.weekly_trend?.map(d => new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short' })) || [],
        datasets: [
            { label: 'Lulus', data: dashboardData?.weekly_trend?.map(d => d.passed) || [], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
            { label: 'Gagal', data: dashboardData?.weekly_trend?.map(d => d.failed) || [], borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#9ca3af' } } },
        scales: { x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#9ca3af' } }, y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#9ca3af' } } }
    };

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Overview Quality Control Laptop</p>
            </header>

            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon">💻</div><div className="stat-value">{dashboardData?.summary?.total_laptops || 0}</div><div className="stat-label">Total Laptop</div></div>
                <div className="stat-card success"><div className="stat-icon">✅</div><div className="stat-value">{dashboardData?.today?.passed || 0}</div><div className="stat-label">Lulus Hari Ini</div></div>
                <div className="stat-card danger"><div className="stat-icon">❌</div><div className="stat-value">{dashboardData?.today?.failed || 0}</div><div className="stat-label">Gagal Hari Ini</div></div>
                <div className="stat-card info"><div className="stat-icon">📋</div><div className="stat-value">{dashboardData?.today?.total_qc || 0}</div><div className="stat-label">Total QC Hari Ini</div></div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-header"><h3 className="card-title">📊 Status Laptop</h3></div>
                    <div style={{ height: '300px' }}><Doughnut data={statusChartData} options={{ ...chartOptions, cutout: '60%' }} /></div>
                </div>
                <div className="card">
                    <div className="card-header"><h3 className="card-title">📈 Trend Mingguan</h3></div>
                    <div style={{ height: '300px' }}><Line data={trendData} options={chartOptions} /></div>
                </div>
            </div>

            <div className="card">
                <div className="card-header"><h3 className="card-title">🕐 Aktivitas Terbaru</h3></div>
                {dashboardData?.recent_activities?.length > 0 ? (
                    <div>
                        {dashboardData.recent_activities.map((activity, index) => (
                            <div key={index} className="activity-item">
                                <div className="activity-icon">📝</div>
                                <div className="activity-content">
                                    <div className="activity-text"><strong>{activity.serial_number || 'N/A'}</strong> - {activity.action}</div>
                                    <div className="activity-time">{activity.user_name} • {new Date(activity.created_at).toLocaleString('id-ID')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state"><div className="empty-icon">📭</div><p>Belum ada aktivitas</p></div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
