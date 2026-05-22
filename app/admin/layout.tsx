'use client';

import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const desktopPadding = !isSidebarOpen ? 'lg:pl-0' : isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-80';

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
