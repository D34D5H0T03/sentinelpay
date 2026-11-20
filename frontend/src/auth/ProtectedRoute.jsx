import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Button from '../components/ui/Button';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading, getRoleHome } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = user.roles && user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-surface border border-border rounded-[8px] p-6 space-y-3">
            <h2 className="text-20 font-semibold text-text">Access restricted</h2>
            <p className="text-14 text-text-muted leading-relaxed">
              You do not have access to this page with your current role.
            </p>
            <div className="pt-2">
              <Link to={getRoleHome()}>
                <Button variant="primary">Go to your dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return children;
}
