import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { useAuth } from '../../auth/AuthContext';

export default function NotFoundPage() {
  const { user, getRoleHome } = useAuth();
  const homePath = user ? getRoleHome() : '/login';

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md bg-surface border border-border rounded-[8px] p-8 shadow-sm space-y-4">
        <h1 className="text-28 font-semibold text-text">404</h1>
        <h2 className="text-15 font-semibold text-text">Page not found</h2>
        <p className="text-14 text-text-muted leading-relaxed">
          The requested path does not exist on SentinelPay. Check the URL or return to your overview.
        </p>
        <div className="pt-2">
          <Link to={homePath}>
            <Button variant="primary">Return to dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
