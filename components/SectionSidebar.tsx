'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LucideIcon, Menu, X } from 'lucide-react';

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
    const handleMobileToggle = () => {
      setMobileOpen((current) => !current);
    };

    window.addEventListener('bookiteasy:sidebar-mobile-toggle', handleMobileToggle);
    return () => {
      window.removeEventListener('bookiteasy:sidebar-mobile-toggle', handleMobileToggle);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={onToggleOpen}
        className="fixed left-3 top-[4.5rem] z-50 hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow lg:inline-flex"
        aria-label={isOpen ? 'Приховати меню' : 'Показати меню'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

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
        {/* Header: show only when expanded; in collapsed state keep the expand chevron */}
        <div className={`${!isOpen ? 'lg:hidden' : ''}`}>
          {isCollapsed ? (
            <div className="hidden items-center justify-center px-2 lg:flex">
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                aria-label="Розгорнути меню"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2 px-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-slate-400">{title}</p>
                {subtitle && <p className="mt-1 truncate text-sm text-slate-500">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="hidden shrink-0 self-start rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:inline-flex"
                aria-label="Згорнути меню"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
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
