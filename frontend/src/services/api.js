const API_BASE = 'http://localhost:3001/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (response) => {
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || 'Request failed');
    }
    return response.json();
};

export const authAPI = {
    login: async (username, password) => {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
        });
        return handleResponse(response);
    },
    me: async () => {
        const response = await fetch(`${API_BASE}/auth/me`, { headers: { ...getAuthHeader() } });
        return handleResponse(response);
    },
    logout: async () => {
        const response = await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { ...getAuthHeader() } });
        return handleResponse(response);
    }
};

export const laptopAPI = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE}/laptops?${query}`, { headers: { ...getAuthHeader() } });
        return handleResponse(response);
    },
    getById: async (id) => {
        const response = await fetch(`${API_BASE}/laptops/${id}`, { headers: { ...getAuthHeader() } });
        return handleResponse(response);
    },
    searchBySerial: async (serialNumber) => {
        const response = await fetch(`${API_BASE}/laptops/search/${encodeURIComponent(serialNumber)}`, { headers: { ...getAuthHeader() } });
        return handleResponse(response);
    },
    create: async (data) => {
        const response = await fetch(`${API_BASE}/laptops`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(data)
        });
        return handleResponse(response);
    },
    update: async (id, data) => {
        const response = await fetch(`${API_BASE}/laptops/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(data)
        });
        return handleResponse(response);
    }
};

export const qcAPI = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE}/qc?${query}`, { headers: { ...getAuthHeader() } });
        return handleResponse(response);
    },
    getById: async (id) => {
        const response = await fetch(`${API_BASE}/qc/${id}`, { headers: { ...getAuthHeader() } });
        return handleResponse(response);
    },
    getForEdit: async (id) => {
        const response = await fetch(`${API_BASE}/qc/${id}/edit`, { headers: { ...getAuthHeader() } });
        return handleResponse(response);
    },
    getChecklistTemplate: async () => {
        const response = await fetch(`${API_BASE}/qc/checklist-template`, { headers: { ...getAuthHeader() } });
        return handleResponse(response);
    },
    startQC: async (data) => {
        const response = await fetch(`${API_BASE}/qc/start`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(data)
        });
        return handleResponse(response);
    },
    updateChecklistItem: async (itemId, data) => {
        const response = await fetch(`${API_BASE}/qc/checklist/${itemId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(data)
        });
        return handleResponse(response);
    },
    submitQC: async (id, data) => {
        const response = await fetch(`${API_BASE}/qc/${id}/submit`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(data)
        });
        return handleResponse(response);
    },
    uploadAttachments: async (id, formData) => {
        const response = await fetch(`${API_BASE}/qc/${id}/attachments`, {
            method: 'POST', headers: { ...getAuthHeader() }, body: formData
        });
        return handleResponse(response);
    },
    deleteAttachment: async (attachmentId) => {
        const response = await fetch(`${API_BASE}/qc/attachments/${attachmentId}`, {
            method: 'DELETE', headers: { ...getAuthHeader() }
        });
        return handleResponse(response);
    },
    deleteQCRecord: async (id) => {
        const response = await fetch(`${API_BASE}/qc/${id}`, {
            method: 'DELETE', headers: { ...getAuthHeader() }
        });
        return handleResponse(response);
    }
};

export const reportAPI = {
    getDashboard: async () => {
        const response = await fetch(`${API_BASE}/reports/dashboard`, { headers: { ...getAuthHeader() } });
        return handleResponse(response);
    },
    exportPDF: async (startDate, endDate) => {
        const response = await fetch(`${API_BASE}/reports/export/pdf?startDate=${startDate}&endDate=${endDate}`, { headers: { ...getAuthHeader() } });
        if (!response.ok) throw new Error('Export failed');
        return response.blob();
    },
    exportExcel: async (startDate, endDate) => {
        const response = await fetch(`${API_BASE}/reports/export/excel?startDate=${startDate}&endDate=${endDate}`, { headers: { ...getAuthHeader() } });
        if (!response.ok) throw new Error('Export failed');
        return response.blob();
    }
};
