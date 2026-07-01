import React, { useEffect, useState, useCallback } from "react";
import client from "../api/client";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  username: "",
  full_name: "",
  role: "kasir",
  password: "",
  confirm_password: "",
};

export default function Pengguna() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get("/users");
      setUsers(res.data?.data || res.data || []);
    } catch {
      toast.error("Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openAddModal = () => {
    setIsEdit(false);
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setIsEdit(true);
    setEditId(u.id);
    setForm({
      username: u.username || "",
      full_name: u.full_name || "",
      role: u.role || "kasir",
      password: "",
      confirm_password: "",
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
    if (!form.username.trim() || !form.full_name.trim()) {
      toast.error("Username dan nama lengkap wajib diisi.");
      return;
    }
    if (!isEdit && !form.password) {
      toast.error("Password wajib diisi untuk pengguna baru.");
      return;
    }
    if (form.password && form.password !== form.confirm_password) {
      toast.error("Password dan konfirmasi password tidak cocok.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        full_name: form.full_name.trim(),
        role: form.role,
      };
      if (form.password) payload.password = form.password;

      if (isEdit) {
        await client.put(`/users/${editId}`, payload);
        toast.success("Pengguna berhasil diperbarui!");
      } else {
        await client.post("/users", payload);
        toast.success("Pengguna berhasil ditambahkan!");
      }
      closeModal();
      await fetchUsers();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Gagal menyimpan pengguna.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (u) => {
    if (u.id === currentUser?.id) return;
    const newStatus = u.is_active ? false : true;
    try {
      await client.put(`/users/${u.id}`, { is_active: newStatus });
      toast.success(
        newStatus ? "Pengguna diaktifkan." : "Pengguna dinonaktifkan.",
      );
      await fetchUsers();
    } catch {
      toast.error("Gagal mengubah status pengguna.");
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="p-6">
      {/* Top bar */}
      <div className="flex justify-end mb-6">
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
        >
          + Tambah Pengguna
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
            Memuat pengguna...
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">👥</div>
            <div>Belum ada pengguna.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase">
                  <th className="px-6 py-3 text-left font-medium">Username</th>
                  <th className="px-6 py-3 text-left font-medium">
                    Nama Lengkap
                  </th>
                  <th className="px-6 py-3 text-center font-medium">Role</th>
                  <th className="px-6 py-3 text-center font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Dibuat</th>
                  <th className="px-6 py-3 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-3 font-mono text-sm font-medium text-gray-900">
                        {u.username}
                      </td>
                      <td className="px-6 py-3 text-gray-700">{u.full_name}</td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            u.role === "owner"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {u.role === "owner" ? "Owner" : "Kasir"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                            u.is_active !== false
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {u.is_active !== false ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium px-3 py-1.5 rounded-lg transition"
                          >
                            Edit
                          </button>
                          <button
                            disabled={isSelf}
                            onClick={() => handleToggleStatus(u)}
                            title={
                              isSelf
                                ? "Tidak dapat menonaktifkan akun sendiri"
                                : ""
                            }
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                              isSelf
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : u.is_active !== false
                                  ? "bg-red-100 hover:bg-red-200 text-red-700"
                                  : "bg-green-100 hover:bg-green-200 text-green-700"
                            }`}
                          >
                            {u.is_active !== false ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                {isEdit ? "Edit Pengguna" : "Tambah Pengguna Baru"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  placeholder="Contoh: kasir01"
                  autoFocus
                  disabled={isEdit}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="kasir">Kasir</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {!isEdit && <span className="text-red-500">*</span>}
                </label>
                {isEdit && (
                  <p className="text-xs text-gray-500 mb-1">
                    Kosongkan jika tidak ingin mengubah password.
                  </p>
                )}
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder={isEdit ? "(Tidak diubah)" : "Masukkan password"}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {form.password && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Konfirmasi Password
                  </label>
                  <input
                    type="password"
                    value={form.confirm_password}
                    onChange={(e) =>
                      handleChange("confirm_password", e.target.value)
                    }
                    placeholder="Ulangi password"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {form.confirm_password &&
                    form.password !== form.confirm_password && (
                      <p className="text-xs text-red-500 mt-1">
                        Password tidak cocok.
                      </p>
                    )}
                </div>
              )}

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
                    "Tambah Pengguna"
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
