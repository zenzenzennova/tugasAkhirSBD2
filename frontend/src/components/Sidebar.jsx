import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// kasirOnly = true → only show for kasir; ownerOnly = true → only show for owner
const navItems = [
  { label: "Transaksi", path: "/transaksi", icon: "🛒", kasirOnly: true },
  { label: "Retur", path: "/retur", icon: "↩️", kasirOnly: true },
  { label: "Dashboard", path: "/dashboard", icon: "📊", ownerOnly: true },
  { label: "Produk", path: "/produk", icon: "📦", ownerOnly: true },
  { label: "Pengguna", path: "/pengguna", icon: "👥", ownerOnly: true },
  { label: "Laporan", path: "/laporan", icon: "📋", ownerOnly: true },
];

export default function Sidebar() {
  const { user, isOwner, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const visibleItems = navItems.filter((item) => {
    if (item.ownerOnly) return isOwner;
    if (item.kasirOnly) return !isOwner;
    return true;
  });

  return (
    <div className="w-64 h-screen bg-gray-900 text-white flex flex-col fixed left-0 top-0 z-10">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🕐</span>
          <div>
            <div className="font-bold text-indigo-400 text-sm leading-tight">
              Midnight Meridian
            </div>
            <div className="text-gray-400 text-xs">Sistem Kasir</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-700 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`
                }
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="mb-3">
          <div className="text-sm font-semibold text-white truncate">
            {user?.full_name || user?.username || "Pengguna"}
          </div>
          <div className="mt-1">
            <span
              className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                isOwner
                  ? "bg-indigo-600 text-indigo-100"
                  : "bg-green-700 text-green-100"
              }`}
            >
              {isOwner ? "Owner" : "Kasir"}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
        >
          <span>🚪</span>
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}
