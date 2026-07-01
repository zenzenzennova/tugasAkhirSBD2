# 🕐 Midnight Meridian — Sistem Informasi Kasir

Sistem POS (Point of Sale) berbasis web untuk Toko Midnight Meridian (toko jam tangan).

**Dibuat oleh:** Fatan Rizki Naufal, Iltsar Fairuz Saputra, Muhamad Ibnu Rafic, Muhammad Dzafif Fawwaz Ghazy  
**Universitas Gunadarma — Sistem Basis Data 2**

---

## 🗂️ Stack Teknologi

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 15 |
| Container | Docker + Docker Compose |
| Auth | JWT + bcryptjs |
| PDF | jsPDF + jspdf-autotable |

---

## 🚀 Cara Menjalankan (Docker — Recommended)

### Prasyarat
- Docker Desktop terinstall dan berjalan
- Port 80, 5000, 5432 tidak terpakai

### Langkah

```bash
# Clone / masuk ke direktori proyek
cd tugasAkhirSBD2

# Jalankan semua service
docker compose up --build -d

# Lihat log (opsional)
docker compose logs -f
```

Setelah selesai build (±2–3 menit):

| Service | URL |
|---------|-----|
| **Aplikasi** | http://localhost:1644 |
| Backend API | http://localhost:5000/api |
| PostgreSQL | localhost:5432 |

### Akun Default

| Role | Username | Password |
|------|----------|----------|
| **Owner** | `owner` | `admin123` |
| **Kasir** | `kasir1` | `kasir123` |

### Menghentikan

```bash
docker compose down          # stop containers
docker compose down -v       # stop + hapus database volume
```

---

## 💻 Cara Menjalankan (Development / Lokal)

### Prasyarat
- Node.js 18+
- PostgreSQL 15 terinstall & berjalan di port 5432

### 1. Setup Database

```bash
# Buat database
psql -U postgres -c "CREATE DATABASE midnight_meridian;"

# Jalankan schema + seed data
psql -U postgres -d midnight_meridian -f backend/database/init.sql
```

### 2. Jalankan Backend

```bash
cd backend
npm install
npm run seed    # Buat user default (owner & kasir1)
npm run dev     # Server berjalan di http://localhost:5000
```

### 3. Jalankan Frontend

```bash
cd frontend
npm install
npm run dev     # App berjalan di http://localhost:3000
```

---

## 📋 Fitur Sistem

### 🔐 Login & Hak Akses
- Multi-role: **Owner** (akses penuh) dan **Kasir** (transaksi saja)
- Password di-hash dengan bcryptjs (salt rounds = 10)
- Autentikasi menggunakan JWT (expired 8 jam)

### 🛍️ Transaksi Penjualan (Kasir)
- Input produk ke keranjang dengan klik
- Ubah kuantitas, hapus item
- Diskon per item dan diskon global (%)
- Perhitungan pajak (%)
- Notifikasi stok habis otomatis
- Hitung kembalian otomatis
- Data pelanggan opsional (nama + telepon)

### 🧾 Struk Otomatis
- Nomor transaksi unik (TRXyyyyMMdd-NNNN)
- Daftar produk, qty, harga, subtotal
- Diskon, pajak, total, bayar, kembalian
- Fitur cetak (window.print())

### 🔄 Return Barang
- Validasi nomor transaksi
- Pengecekan garansi produk
- Pilih kondisi: **Rusak** (potongan 30%), **Tidak Sesuai** / **Lainnya** (full refund)
- Pilih tipe retur: Refund atau Tukar Barang
- Stok otomatis bertambah kembali
- Nomor retur unik (RETyyyyMMdd-NNNN)

### 📦 Master Produk (Owner)
- CRUD produk: nama, merek, tipe, harga, stok, garansi
- Kategori: analog/digital/smartwatch × lokal/impor
- Badge stok (hijau/kuning/merah)
- Filter dan pencarian

### 📊 Laporan Harian (Owner)
- Ringkasan: total transaksi, pendapatan, barang terjual, retur
- Top produk terlaris
- Stok per kategori
- Daftar transaksi lengkap
- **Export PDF** via jsPDF

### 🗄️ Database (PostgreSQL)
- 6 tabel: users, categories, products, transactions, transaction_items, returns, return_items
- 2 view: daily_sales_view, stock_by_category_view
- Constraint: NOT NULL, UNIQUE, CHECK, FOREIGN KEY, DEFAULT
- Transaksi atomik dengan BEGIN/COMMIT/ROLLBACK
- Parameterized queries (SQL Injection prevention)

---

## 🗃️ Struktur Direktori

```
tugasAkhirSBD2/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── server.js
│   ├── package.json
│   ├── config/db.js
│   ├── middleware/auth.js & roleCheck.js
│   ├── routes/ (auth, users, categories, products, transactions, returns, reports, dashboard)
│   ├── controllers/ (matching controllers)
│   └── database/
│       ├── init.sql      ← Schema + seed categories/products
│       └── seed.js       ← Seed users dengan password ter-hash
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── src/
    │   ├── pages/ (Login, Dashboard, Transaksi, Retur, Produk, Kategori, Pengguna, Laporan)
    │   ├── components/ (Layout, Sidebar, ProtectedRoute)
    │   ├── context/AuthContext.jsx
    │   └── api/client.js
    └── ...
```
