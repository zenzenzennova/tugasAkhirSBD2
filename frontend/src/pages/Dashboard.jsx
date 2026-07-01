import React, { useEffect, useState } from "react";
import client from "../api/client";
import toast from "react-hot-toast";

function formatRupiah(number) {
  const num = Number(number) || 0;
  return "Rp " + num.toLocaleString("id-ID");
}

function StatCard({ icon, label, value, colorClass }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${colorClass}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await client.get("/dashboard");
      setData(res.data.data);
    } catch {
      toast.error("Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          Memuat dashboard...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-gray-500 text-center">Data tidak tersedia.</div>
    );
  }

  const {
    today_revenue,
    today_transactions,
    today_items_sold,
    today_returns,
    total_products,
    low_stock_products,
    recent_transactions,
  } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon="💰"
          label="Pendapatan Hari Ini"
          value={formatRupiah(today_revenue ?? 0)}
          colorClass="bg-green-100"
        />
        <StatCard
          icon="🧾"
          label="Transaksi Hari Ini"
          value={today_transactions ?? 0}
          colorClass="bg-indigo-100"
        />
        <StatCard
          icon="📦"
          label="Barang Terjual"
          value={today_items_sold ?? 0}
          colorClass="bg-yellow-100"
        />
        <StatCard
          icon="🏷️"
          label="Total Produk"
          value={total_products ?? 0}
          colorClass="bg-purple-100"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <h2 className="font-semibold text-gray-800">Stok Menipis</h2>
            {low_stock_products?.length > 0 && (
              <span className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {low_stock_products.length} produk
              </span>
            )}
          </div>
          {!low_stock_products || low_stock_products.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              Semua stok dalam kondisi baik ✅
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="px-6 py-3 text-left font-medium">Produk</th>
                    <th className="px-6 py-3 text-left font-medium">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-center font-medium">Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {low_stock_products.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="font-medium text-gray-900">
                          {p.name}
                        </div>
                        <div className="text-gray-500 text-xs">{p.brand}</div>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {p.category_name || "-"}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                            p.stock === 0
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {p.stock === 0 ? "HABIS" : p.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-lg">🧾</span>
            <h2 className="font-semibold text-gray-800">Transaksi Terbaru</h2>
          </div>
          {!recent_transactions || recent_transactions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              Belum ada transaksi hari ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="px-6 py-3 text-left font-medium">
                      No. Transaksi
                    </th>
                    <th className="px-6 py-3 text-left font-medium">Kasir</th>
                    <th className="px-6 py-3 text-right font-medium">Total</th>
                    <th className="px-6 py-3 text-left font-medium">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recent_transactions.map((t, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono text-xs text-indigo-700 font-medium">
                        {t.transaction_number}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {t.cashier_name || t.cashier}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900">
                        {formatRupiah(t.total_amount ?? t.total)}
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {t.created_at
                          ? new Date(t.created_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
