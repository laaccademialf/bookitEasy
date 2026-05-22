'use client';

import React, { useState } from 'react';
import HostSidebar from '../../components/HostSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const desktopPadding = !isSidebarOpen ? 'lg:pl-0' : isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72';

  return (
    <div className="min-h-screen">
      <HostSidebar
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
