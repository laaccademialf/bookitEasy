'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';

export interface SectionSidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface SectionSidebarProps {
  title: string;
  subtitle?: string;
  navItems: SectionSidebarItem[];
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleOpen: () => void;
  onToggleCollapsed: () => void;
  footer?: React.ReactNode;
  ariaLabel?: string;
}

export default function SectionSidebar({
  title,
  subtitle,
  navItems,
  isOpen,
  isCollapsed,
  onToggleOpen,
  onToggleCollapsed,
  footer,
  ariaLabel = 'Бокова панель',
}: SectionSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const desktopSidebarClass = isOpen ? (isCollapsed ? 'lg:w-20' : 'lg:w-72') : 'lg:w-0';

  useEffect(() => {
    const handleToggle = () => {
      if (window.innerWidth >= 1024) {
        onToggleOpen();
      } else {
        setMobileOpen((current) => !current);
      }
    };

    const handleCollapse = () => {
      if (window.innerWidth >= 1024 && isOpen) {
        onToggleCollapsed();
      }
    };

    const handleCloseMobile = () => {
      setMobileOpen(false);
    };

    window.addEventListener('bookiteasy:sidebar-toggle', handleToggle);
    window.addEventListener('bookiteasy:sidebar-collapse-toggle', handleCollapse);
    window.addEventListener('bookiteasy:sidebar-mobile-close', handleCloseMobile);

    return () => {
      window.removeEventListener('bookiteasy:sidebar-toggle', handleToggle);
      window.removeEventListener('bookiteasy:sidebar-collapse-toggle', handleCollapse);
      window.removeEventListener('bookiteasy:sidebar-mobile-close', handleCloseMobile);
    };
  }, [isOpen, onToggleCollapsed, onToggleOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        aria-label={ariaLabel}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white pt-20 shadow-xl transition-all duration-300 ${desktopSidebarClass} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Header: show only when expanded */}
        <div className={`${!isOpen ? 'lg:hidden' : ''}`}>
          {!isCollapsed && (
            <div className="flex items-start justify-between gap-2 px-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-slate-400">{title}</p>
                {subtitle && <p className="mt-1 truncate text-sm text-slate-500">{subtitle}</p>}
              </div>
            </div>
          )}
        </div>

        <nav className={`mt-6 flex flex-col gap-1.5 px-3 ${!isOpen ? 'lg:hidden' : ''}`}>
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                } ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={isCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {footer && isOpen && !isCollapsed && (
          <div className="mt-auto px-4 pb-6">{footer}</div>
        )}
      </aside>
    </>
  );
}
