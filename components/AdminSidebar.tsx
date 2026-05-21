"use client";

import React, { useContext, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthContext } from '../app/providers';
import { Briefcase, Building2, ChevronLeft, ChevronRight, LayoutDashboard, Menu, Users, X } from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleOpen: () => void;
  onToggleCollapsed: () => void;
}

export default function AdminSidebar({ isOpen, isCollapsed, onToggleOpen, onToggleCollapsed }: AdminSidebarProps) {
  const authContext = useContext(AuthContext as unknown as React.Context<any>);
  const { profile, impersonatedRole, setImpersonatedRole } = authContext as any;
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: '/admin', label: 'Огляд', icon: LayoutDashboard },
    { href: '/admin/accounts', label: 'Управління акаунтами', icon: Users },
    { href: '/admin/properties', label: 'Управління обʼєктами', icon: Building2 },
  ];

  React.useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

    ['/admin', '/admin/accounts', '/admin/properties'].forEach((href) => {
      router.prefetch(href);
    });
  }, [profile, router]);

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  const toggleImpersonation = () => {
    if (!setImpersonatedRole) return;
    if (impersonatedRole === 'host') setImpersonatedRole(null);
    else setImpersonatedRole('host');
  };

  const desktopSidebarClass = isOpen ? (isCollapsed ? 'lg:w-24' : 'lg:w-80') : 'lg:w-0';

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen((current) => !current)}
        className="fixed left-3 top-24 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow lg:hidden"
        aria-label="Відкрити меню адміністратора"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <button
        type="button"
        onClick={onToggleOpen}
        className="fixed left-3 top-24 z-50 hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow lg:inline-flex"
        aria-label={isOpen ? 'Приховати меню адміністратора' : 'Показати меню адміністратора'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-slate-200 bg-white pt-20 shadow-xl transition-all duration-300 ${desktopSidebarClass} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className={`flex items-center justify-between px-4 ${!isOpen ? 'lg:hidden' : ''}`}>
          <div className={isCollapsed ? 'hidden lg:block' : ''}>
            <p className="text-xs uppercase tracking-widest text-slate-400">Адмін панель</p>
            {!isCollapsed && <h3 className="mt-1 text-lg font-semibold text-slate-900">Супер-адмін</h3>}
            {!isCollapsed && <p className="mt-1 text-sm text-slate-500">{profile?.email}</p>}
          </div>

          {isOpen && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="ml-2 hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:inline-flex"
              aria-label={isCollapsed ? 'Розгорнути меню' : 'Згорнути меню'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        <nav className={`mt-6 flex flex-col gap-2 px-3 ${!isOpen ? 'lg:hidden' : ''}`}>
          {navItems.map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                } ${isCollapsed ? 'justify-center lg:px-2' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {isOpen && !isCollapsed && (
          <div className="mt-auto px-4 pb-6">
            <div className="mb-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-900">Бізнес-режим</p>
              <p className="mt-1">Надайте роль орендодавця, і користувач зможе працювати у кабінеті хоста та додавати обʼєкти.</p>
            </div>
            <button
              type="button"
              onClick={toggleImpersonation}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400"
            >
              <Briefcase className="h-4 w-4" />
              {impersonatedRole === 'host' ? 'Вийти з режиму хоста' : 'Перемкнутися як орендодавець'}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
