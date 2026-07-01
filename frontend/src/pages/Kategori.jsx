import React, { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';

const emptyForm = {
  category_name: '',
  watch_type: 'analog',
  brand_origin: 'lokal',
  description: '',
};

const WATCH_TYPES = [
  { value: 'analog', label: 'Analog' },
  { value: 'digital', label: 'Digital' },
  { value: 'smartwatch', label: 'Smartwatch' },
];

const BRAND_ORIGINS = [
  { value: 'lokal', label: 'Lokal' },
  { value: 'impor', label: 'Impor' },
];

export default function Kategori() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/categories');
      setCategories(res.data?.data || res.data || []);
    } catch {
      toast.error('Gagal memuat data kategori.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openAddModal = () => {
    setIsEdit(false);
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    setIsEdit(true);
    setEditId(cat.category_id);
    setForm({
      category_name: cat.category_name || '',
      watch_type: cat.watch_type || 'analog',
      brand_origin: cat.brand_origin || 'lokal',
      description: cat.description || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyForm);
  };

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_name.trim()) {
      toast.error('Nama kategori wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category_name: form.category_name.trim(),
        watch_type: form.watch_type,
        brand_origin: form.brand_origin,
        description: form.description.trim() || null,
      };
      if (isEdit) {
        await client.put(`/categories/${editId}`, payload);
        toast.success('Kategori berhasil diperbarui!');
      } else {
        await client.post('/categories', payload);
        toast.success('Kategori berhasil ditambahkan!');
      }
      closeModal();
      await fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan kategori.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Hapus kategori "${cat.category_name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await client.delete(`/categories/${cat.category_id}`);
      toast.success('Kategori berhasil dihapus!');
      await fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus kategori. Mungkin masih ada produk terkait.');
    }
  };

  return (
    <div className="p-6">
      {/* Top bar */}
      <div className="flex justify-end mb-6">
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
        >
          + Tambah Kategori
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Memuat kategori...
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">🏷️</div>
            <div>Belum ada kategori.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase">
                  <th className="px-6 py-3 text-left font-medium">Nama Kategori</th>
                  <th className="px-6 py-3 text-left font-medium">Tipe Jam</th>
                  <th className="px-6 py-3 text-left font-medium">Asal Merek</th>
                  <th className="px-6 py-3 text-left font-medium">Deskripsi</th>
                  <th className="px-6 py-3 text-center font-medium">Jumlah Produk</th>
                  <th className="px-6 py-3 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.category_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{cat.category_name}</td>
                    <td className="px-6 py-3">
                      <span className="capitalize text-gray-700">
                        {cat.watch_type || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="capitalize text-gray-700">
                        {cat.brand_origin || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500 max-w-xs truncate">
                      {cat.description || '-'}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {cat.product_count ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium px-3 py-1.5 rounded-lg transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 font-medium px-3 py-1.5 rounded-lg transition"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">
                {isEdit ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.category_name}
                  onChange={(e) => handleChange('category_name', e.target.value)}
                  placeholder="Contoh: Jam Tangan Sport"
                  autoFocus
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Jam</label>
                  <select
                    value={form.watch_type}
                    onChange={(e) => handleChange('watch_type', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {WATCH_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asal Merek</label>
                  <select
                    value={form.brand_origin}
                    onChange={(e) => handleChange('brand_origin', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {BRAND_ORIGINS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Deskripsi kategori (opsional)..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Menyimpan...
                    </>
                  ) : isEdit ? (
                    'Simpan Perubahan'
                  ) : (
                    'Tambah Kategori'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
