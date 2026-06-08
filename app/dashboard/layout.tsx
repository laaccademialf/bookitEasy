'use client';

import React, { useContext, useEffect, useRef, useState } from 'react';
import HostSidebar from '../../components/HostSidebar';
import { AuthContext } from '../providers';
import { syncReservedDatesForHost } from '../../lib/bookings';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const didSyncRef = useRef<string | null>(null);

  const desktopPadding = !isSidebarOpen ? 'lg:pl-0' : isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72';

  useEffect(() => {
    const width = !isSidebarOpen ? 0 : isSidebarCollapsed ? 80 : 288;
    window.dispatchEvent(new CustomEvent('bookiteasy:layout-sidebar-width', { detail: { width } }));

    return () => {
      window.dispatchEvent(new CustomEvent('bookiteasy:layout-sidebar-width', { detail: { width: 0 } }));
    };
  }, [isSidebarCollapsed, isSidebarOpen]);

  useEffect(() => {
    if (!profile?.uid || profile.role !== 'host') {
      return;
    }

    if (didSyncRef.current === profile.uid) {
      return;
    }

    didSyncRef.current = profile.uid;
    syncReservedDatesForHost(profile.uid).catch(() => {
      didSyncRef.current = null;
    });
  }, [profile]);

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
