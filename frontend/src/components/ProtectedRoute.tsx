import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, initDelayed } = useAuth();
  // eslint-disable-next-line no-console
  console.debug('[route] ProtectedRoute render', { loading, hasUser: !!user, initDelayed });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 text-sm space-y-3">
        <div>Loading...</div>
        {initDelayed && (
          <div className="text-red-500 font-medium text-center px-4">
            Auth is taking longer than expected. Check browser console for [auth] or [firebase] warnings.
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;