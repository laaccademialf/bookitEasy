'use client';

import React, { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '../app/providers';
import SectionSidebar, { SectionSidebarItem } from './SectionSidebar';
import { Boxes, Building2, CalendarDays, LayoutDashboard, LineChart, Sparkles } from 'lucide-react';

interface HostSidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleOpen: () => void;
  onToggleCollapsed: () => void;
}

const NAV: SectionSidebarItem[] = [
  { href: '/dashboard', label: 'Огляд', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/properties', label: 'Мої обʼєкти', icon: Building2 },
  { href: '/dashboard/calendar', label: 'Календар', icon: CalendarDays },
  { href: '/dashboard/cleaning', label: 'Прибирання', icon: Sparkles },
  { href: '/dashboard/finances', label: 'Фінансові звіти', icon: LineChart },
  { href: '/dashboard/inventory', label: 'Інвентаризація', icon: Boxes },
];

export default function HostSidebar(props: HostSidebarProps) {
  const authContext = useContext(AuthContext as unknown as React.Context<any>);
  const { profile, impersonatedRole } = (authContext || {}) as any;
  const router = useRouter();

  useEffect(() => {
    NAV.forEach((item) => router.prefetch(item.href));
  }, [router]);

  const isHost = profile?.role === 'host' || impersonatedRole === 'host';
  if (!isHost) return null;

  return (
    <SectionSidebar
      {...props}
      ariaLabel="Меню орендодавця"
      title="Орендодавець"
      subtitle={profile?.email}
      navItems={NAV}
    />
  );
}
