import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transaksi from './pages/Transaksi';
import Retur from './pages/Retur';
import Produk from './pages/Produk';
import Pengguna from './pages/Pengguna';
import Laporan from './pages/Laporan';

function RootRedirect() {
  const { isAuthenticated, isOwner } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isOwner ? '/dashboard' : '/transaksi'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute ownerOnly>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaksi"
        element={
          <ProtectedRoute>
            <Layout><Transaksi /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/retur"
        element={
          <ProtectedRoute>
            <Layout><Retur /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/produk"
        element={
          <ProtectedRoute ownerOnly>
            <Layout><Produk /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pengguna"
        element={
          <ProtectedRoute ownerOnly>
            <Layout><Pengguna /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/laporan"
        element={
          <ProtectedRoute ownerOnly>
            <Layout><Laporan /></Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
