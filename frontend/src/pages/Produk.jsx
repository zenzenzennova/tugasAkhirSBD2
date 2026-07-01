import React, { useEffect, useState, useCallback } from "react";
import client from "../api/client";
import toast from "react-hot-toast";

function formatRupiah(number) {
  const num = Number(number) || 0;
  return "Rp " + num.toLocaleString("id-ID");
}

const emptyForm = {
  name: "",
  brand: "",
  model_type: "",
  category_id: "",
  price: "",
  stock: "",
  warranty_months: "",
  discount_percent: 0,
};

export default function Produk() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        client.get("/products"),
        client.get("/categories"),
      ]);
      setProducts(prodRes.data?.data || prodRes.data || []);
      setCategories(catRes.data?.data || catRes.data || []);
    } catch {
      toast.error("Gagal memuat data produk.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.model_type?.toLowerCase().includes(q);
    const matchCat =
      !filterCategory || String(p.category_id) === String(filterCategory);
    return matchSearch && matchCat;
  });

  const openAddModal = () => {
    setIsEdit(false);
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setIsEdit(true);
    setEditId(product.id);
    setForm({
      name: product.name || "",
      brand: product.brand || "",
      model_type: product.model_type || "",
      category_id: product.category_id ? String(product.category_id) : "",
      price: product.price ?? "",
      stock: product.stock ?? "",
      warranty_months: product.warranty_months ?? "",
      discount_percent: product.discount_percent ?? 0,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyForm);
  };

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.brand.trim() || !form.price || !form.stock) {
      toast.error("Nama, merek, harga, dan stok wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        model_type: form.model_type.trim() || null,
        category_id: form.category_id ? Number(form.category_id) : null,
        price: Number(form.price),
        stock: Number(form.stock),
        warranty_months:
          form.warranty_months !== "" ? Number(form.warranty_months) : 0,
        discount_percent: Number(form.discount_percent) || 0,
      };
      if (isEdit) {
        await client.put(`/products/${editId}`, payload);
        toast.success("Produk berhasil diperbarui!");
      } else {
        await client.post("/products", payload);
        toast.success("Produk berhasil ditambahkan!");
      }
      closeModal();
      await fetchData();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Gagal menyimpan produk.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.is_active ? false : true;
    try {
      await client.put(`/products/${product.id}`, { is_active: newStatus });
      toast.success(newStatus ? "Produk diaktifkan." : "Produk dinonaktifkan.");
      await fetchData();
    } catch {
      toast.error("Gagal mengubah status produk.");
    }
  };

  return (
    <div className="p-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Cari produk (nama / merek / model)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-2"
        >
          + Tambah Produk
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            <svg
              className="animate-spin h-5 w-5 mr-2"
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
            Memuat produk...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📦</div>
            <div>Tidak ada produk ditemukan.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase">
                  <th className="px-6 py-3 text-left font-medium w-8">No</th>
                  <th className="px-6 py-3 text-left font-medium">
                    Nama Produk
                  </th>
                  <th className="px-6 py-3 text-left font-medium">Merek</th>
                  <th className="px-6 py-3 text-left font-medium">Model</th>
                  <th className="px-6 py-3 text-left font-medium">Kategori</th>
                  <th className="px-6 py-3 text-right font-medium">Harga</th>
                  <th className="px-6 py-3 text-center font-medium">Stok</th>
                  <th className="px-6 py-3 text-center font-medium">Garansi</th>
                  <th className="px-6 py-3 text-center font-medium">Status</th>
                  <th className="px-6 py-3 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {p.name}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{p.brand}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {p.model_type || "-"}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {p.category_name || "-"}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">
                      {p.discount_percent > 0 ? (
                        <div>
                          <div className="text-xs line-through text-gray-400">
                            {formatRupiah(p.price)}
                          </div>
                          <div className="text-red-600">
                            {formatRupiah(
                              p.price * (1 - p.discount_percent / 100),
                            )}
                          </div>
                          <div className="text-xs text-red-500 font-semibold">
                            -{p.discount_percent}%
                          </div>
                        </div>
                      ) : (
                        formatRupiah(p.price)
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                          p.stock === 0
                            ? "bg-red-100 text-red-700"
                            : p.stock <= 5
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center text-gray-600">
                      {p.warranty_months != null
                        ? `${p.warranty_months} bln`
                        : "-"}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                          p.is_active !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.is_active !== false ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium px-3 py-1.5 rounded-lg transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                            p.is_active !== false
                              ? "bg-red-100 hover:bg-red-200 text-red-700"
                              : "bg-green-100 hover:bg-green-200 text-green-700"
                          }`}
                        >
                          {p.is_active !== false ? "Nonaktifkan" : "Aktifkan"}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">
                {isEdit ? "Edit Produk" : "Tambah Produk Baru"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Produk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Contoh: Automatic Pro X1"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Merek <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => handleChange("brand", e.target.value)}
                    placeholder="Contoh: Seiko"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipe / Model
                  </label>
                  <input
                    type="text"
                    value={form.model_type}
                    onChange={(e) => handleChange("model_type", e.target.value)}
                    placeholder="Contoh: SRPD21K1"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={form.category_id}
                    onChange={(e) =>
                      handleChange("category_id", e.target.value)
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Harga (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => handleChange("price", e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stok <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => handleChange("stock", e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Garansi (bulan)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.warranty_months}
                    onChange={(e) =>
                      handleChange("warranty_months", e.target.value)
                    }
                    placeholder="12"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diskon (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.discount_percent}
                    onChange={(e) =>
                      handleChange(
                        "discount_percent",
                        Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                      )
                    }
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {form.discount_percent > 0 && form.price && (
                    <p className="text-xs text-green-600 mt-1">
                      Harga setelah diskon:{" "}
                      {formatRupiah(
                        Number(form.price) *
                          (1 - Number(form.discount_percent) / 100),
                      )}
                    </p>
                  )}
                </div>
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
                      Menyimpan...
                    </>
                  ) : isEdit ? (
                    "Simpan Perubahan"
                  ) : (
                    "Tambah Produk"
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
