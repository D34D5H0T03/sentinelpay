import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../auth/AuthContext';

export default function AppShell() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const primaryRole = user?.roles?.[0] || 'CUSTOMER';

  return (
    <div className="min-h-screen bg-canvas flex flex-col md:flex-row text-text font-sans antialiased">
      {/* Sidebar navigation */}
      <Sidebar
        role={primaryRole}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main layout container */}
      <div className="flex-1 md:pl-[240px] flex flex-col min-h-screen min-w-0">
        <Topbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 w-full">
          <div className="max-w-[1120px] mx-0 w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
