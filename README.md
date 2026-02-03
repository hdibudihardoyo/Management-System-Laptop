# QC Laptop Management System

Sistem manajemen Quality Control untuk laptop dengan fitur lengkap untuk monitoring, pencatatan, dan pelaporan proses QC.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)

## 📋 Fitur Utama

- ✅ **Form QC Interaktif** - Checklist hardware & software dengan status pass/fail
- 🔍 **Barcode Scanner** - Input serial number via scan
- 📊 **Dashboard** - Statistik real-time dengan chart
- 📋 **Riwayat QC** - History dengan pencarian dan filter
- ✏️ **Edit Data** - Leader & Staff bisa edit SN, model, brand
- 🗑️ **Delete** - Hanya Leader yang bisa hapus data QC
- 🌗 **Dark/Light Mode** - Toggle tema sesuai preferensi
- 📈 **Export Report** - PDF & Excel

## 🛠️ Tech Stack

### Backend
- Node.js + Express.js
- PostgreSQL
- JWT Authentication
- PDFKit & ExcelJS

### Frontend
- React 18 + Vite
- Chart.js
- html5-qrcode

## 🚀 Instalasi

### Prerequisites
- Node.js 22+
- PostgreSQL 18+

### 1. Clone Repository
```bash
git clone https://github.com/hdibudihardoyo/Management-System-Laptop.git
cd Management-System-Laptop
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Buat file `.env`:
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qc_laptop
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
```

### 3. Setup Database
```bash
# Buat database di PostgreSQL
createdb qc_laptop

# Jalankan schema
psql -d qc_laptop -f database/schema.sql

# Jalankan seeder
node seed.js
```

### 4. Setup Frontend
```bash
cd ../frontend
npm install
```

### 5. Jalankan Aplikasi
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Akses aplikasi di: http://localhost:5173

## 👤 Demo Login

| Role | Username | Password |
|------|----------|----------|
| Leader | leader | leader123 |
| Staff | staff | staff123 |

## 📁 Struktur Project

```
├── backend/
│   ├── config/          # Database config
│   ├── database/        # Schema SQL
│   ├── middleware/      # Auth & Upload
│   ├── routes/          # API Routes
│   ├── services/        # Business logic
│   └── server.js        # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── context/     # Auth context
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── App.jsx      # Main app
│   └── index.html
│
└── README.md
```

## 🔐 Role & Permission

| Fitur | Leader | Staff |
|-------|--------|-------|
| Dashboard | ✅ | ✅ |
| Form QC | ✅ | ✅ |
| Edit Laptop | ✅ | ✅ |
| Riwayat QC | ✅ | ✅ |
| Delete QC | ✅ | ❌ |
| Reports | ✅ | ✅ |

## 📄 API Endpoints

### Auth
- `POST /api/auth/login` - Login user

### Laptops
- `GET /api/laptops` - List semua laptop
- `GET /api/laptops/:id` - Detail laptop
- `POST /api/laptops` - Tambah laptop
- `PUT /api/laptops/:id` - Update laptop

### QC
- `GET /api/qc` - List QC records
- `POST /api/qc/start` - Mulai QC
- `POST /api/qc/:id/submit` - Submit QC
- `DELETE /api/qc/:id` - Hapus QC (Leader only)

### Reports
- `GET /api/reports/dashboard` - Dashboard stats
- `GET /api/reports/export/pdf` - Export PDF
- `GET /api/reports/export/excel` - Export Excel

## 👨‍💻 Author

**Hadi Budi Hardoyo**

---

⭐ Star this repo if you find it useful!
