import React, { useState } from "react";
import client from "../api/client";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatRupiah(number) {
  const num = Number(number) || 0;
  return "Rp " + num.toLocaleString("id-ID");
}

function formatTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchImageDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) return null;

  const blob = await response.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function StatCard({ icon, label, value, colorClass }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${colorClass}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function Laporan() {
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    if (!selectedDate) {
      toast.error("Pilih tanggal terlebih dahulu.");
      return;
    }
    setLoading(true);
    setReportData(null);
    try {
      const res = await client.get("/reports/daily", {
        params: { date: selectedDate },
      });
      setReportData(res.data?.data || res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memuat laporan.");
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const { summary, top_products, stock_by_product, transactions } =
      reportData;
    const logoDataUrl = await fetchImageDataUrl("/logo.jpeg");

    // Header
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "JPEG", 14, 10, 18, 18);
    }
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN HARIAN PENJUALAN", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("MIDNIGHT MERIDIAN", 105, 22, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Toko Jam Tangan Terpercaya | Jl. Karawaci No. 1, Tangerang",
      105,
      28,
      { align: "center" },
    );
    doc.text(`Tanggal: ${selectedDate}`, 14, 38);
    doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 44);

    // Summary table
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Ringkasan", 14, 54);
    autoTable(doc, {
      startY: 58,
      head: [["Keterangan", "Nilai"]],
      body: [
        ["Total Transaksi", String(summary?.total_transactions ?? 0)],
        ["Total Pendapatan", formatRupiah(summary?.total_revenue ?? 0)],
        ["Total Diskon", formatRupiah(summary?.total_discount ?? 0)],
        ["Total Pajak", formatRupiah(summary?.total_tax ?? 0)],
        ["Total Barang Terjual", String(summary?.total_items_sold ?? 0)],
        ["Total Retur", String(reportData?.returns?.length ?? 0)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [245, 247, 255] },
    });

    // Top products table
    const topY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Produk Terlaris", 14, topY);
    if (top_products && top_products.length > 0) {
      autoTable(doc, {
        startY: topY + 4,
        head: [["Nama Produk", "Merek", "Qty Terjual", "Pendapatan"]],
        body: top_products.map((p) => [
          p.product_name,
          p.product_brand || "-",
          String(p.total_qty_sold ?? 0),
          formatRupiah(p.total_revenue ?? p.revenue ?? 0),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
      });
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Tidak ada data produk terlaris.", 14, topY + 8);
    }

    // Transactions table
    const trxY = doc.lastAutoTable
      ? doc.lastAutoTable.finalY + 10
      : topY + 20;
    if (trxY > 250) doc.addPage();
    const trxStartY = trxY > 250 ? 20 : trxY;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Daftar Transaksi", 14, trxStartY);
    if (transactions && transactions.length > 0) {
      autoTable(doc, {
        startY: trxStartY + 4,
        head: [["No. Transaksi", "Waktu", "Kasir", "Items", "Total"]],
        body: transactions.map((t) => [
          t.transaction_number,
          formatTime(t.created_at),
          t.cashier_name || t.cashier || "-",
          String(t.items?.length ?? 0),
          formatRupiah(t.total_amount ?? t.total ?? 0),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
      });
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Tidak ada transaksi pada tanggal ini.", 14, trxStartY + 8);
    }

    // Stock by product table
    const stockY = doc.lastAutoTable
      ? doc.lastAutoTable.finalY + 10
      : trxStartY + 20;
    if (stockY > 250) doc.addPage();
    const stockStartY = stockY > 250 ? 20 : stockY;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Sisa Stok Produk", 14, stockStartY);
    if (stock_by_product && stock_by_product.length > 0) {
      autoTable(doc, {
        startY: stockStartY + 4,
        head: [["Nama Produk", "Kategori", "Total Stok"]],
        body: stock_by_product.map((s) => [
          s.product_name,
          s.category_type || "-",
          String(s.total_stock ?? 0),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
      });
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Tidak ada data stok produk.", 14, stockStartY + 8);
    }

    doc.save(`laporan-${selectedDate}.pdf`);
    toast.success("PDF berhasil diekspor!");
  };

  const summary = reportData?.summary;
  const topProducts = reportData?.top_products || [];
  const stockByProduct = reportData?.stock_by_product || [];
  const transactions = reportData?.transactions || [];

  return (
    <div className="p-6 space-y-6">
      {/* Report header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4">
        <img
          src="/logo.jpeg"
          alt="Midnight Meridian logo"
          className="w-16 h-16 object-contain rounded-lg border border-gray-100 bg-white"
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Laporan Harian Penjualan
          </h1>
          <p className="text-sm font-semibold text-gray-700 mt-1">
            Midnight Meridian
          </p>
          <p className="text-sm text-gray-500">
            Toko Jam Tangan Terpercaya | Jl. Karawaci No. 1, Tangerang
          </p>
        </div>
      </div>

      {/* Date picker */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pilih Tanggal
            </label>
            <input
              type="date"
              value={selectedDate}
              max={todayDate()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
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
                Memuat...
              </>
            ) : (
              "📊 Lihat Laporan"
            )}
          </button>
          {reportData && (
            <button
              onClick={exportPDF}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-2"
            >
              📄 Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Report content */}
      {reportData && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon="🧾"
              label="Total Transaksi"
              value={summary?.total_transactions ?? 0}
              colorClass="bg-indigo-100"
            />
            <StatCard
              icon="💰"
              label="Total Pendapatan"
              value={formatRupiah(summary?.total_revenue ?? 0)}
              colorClass="bg-green-100"
            />
            <StatCard
              icon="📦"
              label="Barang Terjual"
              value={summary?.total_items_sold ?? 0}
              colorClass="bg-yellow-100"
            />
            <StatCard
              icon="↩️"
              label="Total Retur"
              value={reportData?.returns?.length ?? 0}
              colorClass="bg-red-100"
            />
          </div>

          {/* Additional summary row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500">Total Diskon</div>
              <div className="text-lg font-bold text-red-600 mt-0.5">
                {formatRupiah(summary?.total_discount ?? 0)}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500">Total Pajak</div>
              <div className="text-lg font-bold text-orange-600 mt-0.5">
                {formatRupiah(summary?.total_tax ?? 0)}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500">Total Refund Retur</div>
              <div className="text-lg font-bold text-purple-600 mt-0.5">
                {formatRupiah(summary?.total_refund ?? 0)}
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                🏆 Produk Terlaris
              </h2>
            </div>
            {topProducts.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                Tidak ada data produk terlaris.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="px-6 py-3 text-left font-medium">No</th>
                      <th className="px-6 py-3 text-left font-medium">
                        Nama Produk
                      </th>
                      <th className="px-6 py-3 text-left font-medium">Merek</th>
                      <th className="px-6 py-3 text-center font-medium">
                        Qty Terjual
                      </th>
                      <th className="px-6 py-3 text-right font-medium">
                        Pendapatan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topProducts.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-500">{i + 1}</td>
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {p.product_name}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {p.product_brand || "-"}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {p.total_qty_sold ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-900">
                          {formatRupiah(p.total_revenue ?? p.revenue ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stock by Product */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                📦 Sisa Stok Produk
              </h2>
            </div>
            {stockByProduct.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                Tidak ada data stok produk.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="px-6 py-3 text-left font-medium">
                        Nama Produk
                      </th>
                      <th className="px-6 py-3 text-left font-medium">
                        Kategori
                      </th>
                      <th className="px-6 py-3 text-center font-medium">
                        Total Stok
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockByProduct.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {s.product_name}
                        </td>
                        <td className="px-6 py-3 text-gray-600 capitalize">
                          {s.category_type || "-"}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {s.total_stock ?? 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Returns Detail */}
          {reportData?.returns?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">
                  ↩️ Detail Retur Barang
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {reportData.returns.map((ret, i) => (
                  <div key={i} className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="font-mono text-sm font-semibold text-indigo-700">
                        {ret.return_number}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          ret.return_type === "refund"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {ret.return_type === "refund"
                          ? "💰 Refund"
                          : "🔄 Tukar Barang"}
                      </span>
                      <span className="text-xs text-gray-500">
                        No. Transaksi: {ret.transaction_number}
                      </span>
                      <span className="text-xs text-gray-500">
                        Diproses oleh: {ret.processed_by_name}
                      </span>
                      <span className="ml-auto text-sm font-semibold text-red-600">
                        -{formatRupiah(ret.total_refund_amount)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      Alasan: {ret.return_reason}
                    </p>
                    {ret.items && ret.items.length > 0 && (
                      <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 uppercase">
                            <th className="px-4 py-2 text-left">Barang</th>
                            <th className="px-4 py-2 text-center">Qty</th>
                            <th className="px-4 py-2 text-center">Kondisi</th>
                            <th className="px-4 py-2 text-right">
                              Harga Satuan
                            </th>
                            <th className="px-4 py-2 text-right">Potongan</th>
                            <th className="px-4 py-2 text-right">Refund</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {ret.items.map((item, j) => (
                            <tr key={j} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-medium">
                                {item.product_name}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                    item.condition === "damaged"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {item.condition === "damaged"
                                    ? "Rusak"
                                    : item.condition === "unsuitable"
                                      ? "Tdk Sesuai"
                                      : "Lainnya"}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                {formatRupiah(item.unit_price)}
                              </td>
                              <td className="px-4 py-2 text-right text-red-600">
                                {item.deduction_rate > 0
                                  ? `-${item.deduction_rate}%`
                                  : "-"}
                              </td>
                              <td className="px-4 py-2 text-right font-semibold">
                                {formatRupiah(item.refund_amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                🧾 Daftar Transaksi
              </h2>
            </div>
            {transactions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                Tidak ada transaksi pada tanggal ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="px-6 py-3 text-left font-medium">
                        No. Transaksi
                      </th>
                      <th className="px-6 py-3 text-left font-medium">Waktu</th>
                      <th className="px-6 py-3 text-left font-medium">Kasir</th>
                      <th className="px-6 py-3 text-left font-medium">
                        Pelanggan
                      </th>
                      <th className="px-6 py-3 text-center font-medium">
                        Items
                      </th>
                      <th className="px-6 py-3 text-right font-medium">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((t, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-mono text-xs font-semibold text-indigo-700">
                          {t.transaction_number}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {formatTime(t.created_at)}
                        </td>
                        <td className="px-6 py-3 text-gray-700">
                          {t.cashier_name || t.cashier || "-"}
                        </td>
                        <td className="px-6 py-3 text-gray-500">
                          {t.customer_name || "-"}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                            {t.items?.length ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-900">
                          {formatRupiah(t.total_amount ?? t.total ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!reportData && !loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📋</div>
          <div className="text-base">
            Pilih tanggal dan klik "Lihat Laporan"
          </div>
          <div className="text-sm mt-1">
            untuk melihat laporan penjualan harian.
          </div>
        </div>
      )}
    </div>
  );
}
