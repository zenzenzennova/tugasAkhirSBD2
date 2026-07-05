import React, { useState } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';

function formatRupiah(number) {
  const num = Number(number) || 0;
  return 'Rp ' + num.toLocaleString('id-ID');
}

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const CONDITION_OPTIONS = [
  { value: 'damaged', label: 'Rusak (Potongan 30%)' },
  { value: 'unsuitable', label: 'Tidak Sesuai (Full Refund)' },
  { value: 'other', label: 'Lainnya (Full Refund)' },
];

function getTransactionItemId(item) {
  return item?.id ?? item?.transaction_item_id ?? item?.product_id ?? null;
}

function calcItemRefund(item) {
  const base = Number(item.unit_price) * Number(item.quantity);
  if (item.condition === 'damaged') return base * 0.7;
  return base;
}

export default function Retur() {
  const [searchTrxNumber, setSearchTrxNumber] = useState('');
  const [foundTransaction, setFoundTransaction] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnType, setReturnType] = useState('refund');
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const handleSearch = async () => {
    const q = searchTrxNumber.trim();
    if (!q) {
      toast.error('Masukkan nomor transaksi terlebih dahulu.');
      return;
    }
    setSearching(true);
    setFoundTransaction(null);
    setSelectedItems([]);
    try {
      const res = await client.get('/transactions', { params: { search: q } });
      const list = res.data?.data || res.data || [];
      const transactions = Array.isArray(list) ? list : [];
      const match = transactions.find(
        (t) => t.transaction_number?.toLowerCase() === q.toLowerCase()
      );
      if (!match) {
        toast.error('Transaksi tidak ditemukan.');
      } else {
        // Fetch detail
        try {
          const transactionId = match.id || match.transaction_id;
          const detailRes = await client.get(`/transactions/${transactionId}`);
          const detail = detailRes.data?.data || detailRes.data;
          setFoundTransaction({
            ...detail,
            items: (detail?.items || []).map((item) => ({
              ...item,
              transaction_item_id: getTransactionItemId(item),
            })),
          });
          setSelectedItems([]);
        } catch {
          // Fallback: use match data
          setFoundTransaction({
            ...match,
            items: (match?.items || []).map((item) => ({
              ...item,
              transaction_item_id: getTransactionItemId(item),
            })),
          });
        }
      }
    } catch {
      toast.error('Gagal mencari transaksi.');
    } finally {
      setSearching(false);
    }
  };

  const toggleItem = (item) => {
    const id = getTransactionItemId(item);
    if (!id) {
      toast.error('Item transaksi tidak memiliki ID yang valid.');
      return;
    }
    setSelectedItems((prev) => {
      const exists = prev.find((s) => s.transaction_item_id === id);
      if (exists) {
        return prev.filter((s) => s.transaction_item_id !== id);
      }
      return [
        ...prev,
        {
          transaction_item_id: id,
          quantity: 1,
          condition: 'unsuitable',
          max_quantity: Number(item.quantity),
          product_name: item.product_name,
          unit_price: Number(item.unit_price),
        },
      ];
    });
  };

  const updateSelected = (id, field, value) => {
    setSelectedItems((prev) =>
      prev.map((s) => {
        if (s.transaction_item_id !== id) return s;
        let v = value;
        if (field === 'quantity') {
          v = Math.min(s.max_quantity, Math.max(1, Number(value) || 1));
        }
        return { ...s, [field]: v };
      })
    );
  };

  const totalEstimatedRefund = selectedItems.reduce(
    (sum, item) => sum + calcItemRefund(item),
    0
  );

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error('Pilih minimal satu item untuk diretur.');
      return;
    }
    if (!returnReason.trim()) {
      toast.error('Alasan retur wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        transaction_id: foundTransaction.id || foundTransaction.transaction_id,
        return_type: returnType,
        return_reason: returnReason.trim(),
        items: selectedItems.map((s) => ({
          transaction_item_id: s.transaction_item_id,
          quantity: s.quantity,
          condition: s.condition,
        })),
      };
      const res = await client.post('/returns', payload);
      const data = res.data?.data || res.data;
      setSuccessData(data);
      toast.success('Retur berhasil diproses!');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Gagal memproses retur.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSearchTrxNumber('');
    setFoundTransaction(null);
    setSelectedItems([]);
    setReturnReason('');
    setReturnType('refund');
    setSuccessData(null);
  };

  const trxItems = foundTransaction?.items || foundTransaction?.transaction_items || [];

  /* ── Success screen ── */
  if (successData) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-800 mb-2">Retur Berhasil Diproses!</h2>
          <div className="space-y-2 text-sm text-green-700 mt-4">
            {successData.return_number && (
              <div>
                <span className="font-medium">No. Retur:</span>{' '}
                <span className="font-mono font-bold">{successData.return_number}</span>
              </div>
            )}
            {successData.total_refund_amount !== undefined && (
              <div>
                <span className="font-medium">Total Refund:</span>{' '}
                <span className="font-bold">{formatRupiah(successData.total_refund_amount)}</span>
              </div>
            )}
            {successData.return_type && (
              <div>
                <span className="font-medium">Tipe Retur:</span>{' '}
                <span>{successData.return_type === 'refund' ? 'Pengembalian Dana' : 'Tukar Barang'}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleReset}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition"
          >
            Proses Retur Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Search Transaction */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>🔍</span> Cari Transaksi
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Masukkan nomor transaksi (contoh: TRX20260701-0001)"
            value={searchTrxNumber}
            onChange={(e) => setSearchTrxNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-2"
          >
            {searching ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Mencari...
              </>
            ) : (
              'Cari Transaksi'
            )}
          </button>
        </div>
      </div>

      {/* Transaction Details */}
      {foundTransaction && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>🧾</span> Detail Transaksi
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <div className="text-xs text-gray-500">No. Transaksi</div>
                <div className="font-mono font-bold text-indigo-700">{foundTransaction.transaction_number}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Tanggal</div>
                <div className="font-medium">{formatDateTime(foundTransaction.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Kasir</div>
                <div className="font-medium">{foundTransaction.cashier_name || foundTransaction.cashier || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total</div>
                <div className="font-bold text-gray-900">{formatRupiah(foundTransaction.total_amount)}</div>
              </div>
              {foundTransaction.customer_name && (
                <div>
                  <div className="text-xs text-gray-500">Pelanggan</div>
                  <div className="font-medium">{foundTransaction.customer_name}</div>
                </div>
              )}
            </div>

            {/* Items */}
            <h3 className="font-medium text-gray-700 text-sm mb-3">Pilih Item untuk Diretur:</h3>
            {trxItems.length === 0 ? (
              <p className="text-sm text-gray-400">Tidak ada item dalam transaksi ini.</p>
            ) : (
              <div className="space-y-3">
                {trxItems.map((item) => {
                  const sel = selectedItems.find((s) => s.transaction_item_id === item.transaction_item_id);
                  const isChecked = !!sel;
                  return (
                    <div
                      key={item.transaction_item_id}
                      className={`border rounded-xl p-4 transition-all ${
                        isChecked ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(item)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">{item.product_name}</div>
                              <div className="text-xs text-gray-500">{item.brand || item.product_brand}</div>
                            </div>
                            <div className="text-sm font-bold text-gray-900">
                              {item.quantity} x {formatRupiah(item.unit_price)}
                            </div>
                          </div>

                          {isChecked && (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-600 font-medium">Jumlah Retur</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={sel.max_quantity}
                                  value={sel.quantity}
                                  onChange={(e) =>
                                    updateSelected(item.transaction_item_id, 'quantity', e.target.value)
                                  }
                                  className="mt-1 w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 font-medium">Kondisi</label>
                                <select
                                  value={sel.condition}
                                  onChange={(e) =>
                                    updateSelected(item.transaction_item_id, 'condition', e.target.value)
                                  }
                                  className="mt-1 w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                                >
                                  {CONDITION_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="md:col-span-2 text-xs text-gray-500">
                                Estimasi refund item ini:{' '}
                                <span className="font-bold text-green-700">
                                  {formatRupiah(calcItemRefund(sel))}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Return Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>↩️</span> Form Retur
            </h2>

            <div className="space-y-4">
              {/* Return reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alasan Retur <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan alasan retur..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>

              {/* Return type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Retur</label>
                <div className="flex gap-4">
                  {[
                    { value: 'refund', label: '💵 Pengembalian Dana' },
                    { value: 'exchange', label: '🔄 Tukar Barang' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="returnType"
                        value={opt.value}
                        checked={returnType === opt.value}
                        onChange={(e) => setReturnType(e.target.value)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Total estimated refund */}
              {selectedItems.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-green-700 font-medium">Total Estimasi Refund:</span>
                  <span className="text-lg font-bold text-green-800">
                    {formatRupiah(totalEstimatedRefund)}
                  </span>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedItems.length === 0}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  '↩️ Proses Retur'
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
