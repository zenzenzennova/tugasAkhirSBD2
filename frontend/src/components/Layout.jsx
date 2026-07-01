import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/transaksi': 'Transaksi',
  '/retur': 'Retur Barang',
  '/produk': 'Manajemen Produk',
  '/kategori': 'Manajemen Kategori',
  '/pengguna': 'Manajemen Pengguna',
  '/laporan': 'Laporan Harian',
};

export default function Layout({ children }) {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Midnight Meridian';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen overflow-hidden">
        {/* Top header bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center flex-shrink-0 no-print">
          <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
