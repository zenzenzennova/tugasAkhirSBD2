import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, ownerOnly = false }) {
  const { isAuthenticated, isOwner, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Memuat...</div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (ownerOnly && !isOwner) return <Navigate to="/transaksi" replace />;
  return children;
}
