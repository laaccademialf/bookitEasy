'use client';

import React, { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const desktopPadding = !isSidebarOpen ? 'lg:pl-0' : isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72';

  useEffect(() => {
    const width = !isSidebarOpen ? 0 : isSidebarCollapsed ? 80 : 288;
    window.dispatchEvent(new CustomEvent('bookiteasy:layout-sidebar-width', { detail: { width } }));

    return () => {
      window.dispatchEvent(new CustomEvent('bookiteasy:layout-sidebar-width', { detail: { width: 0 } }));
    };
  }, [isSidebarCollapsed, isSidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminSidebar
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onToggleOpen={() => setIsSidebarOpen((current) => !current)}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />
      <div className={`transition-all duration-300 ${desktopPadding}`}>
        <main>{children}</main>
      </div>
    </div>
  );
}
