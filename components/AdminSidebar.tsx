"use client";

import React, { useContext, useState } from 'react';
import Link from 'next/link';
import { AuthContext } from '../app/providers';

export default function AdminSidebar() {
  const authContext = useContext(AuthContext as unknown as React.Context<any>);
  const { profile, impersonatedRole, setImpersonatedRole } = authContext as any;
  const [collapsed, setCollapsed] = useState(false);

  // Only show sidebar if user is admin
  if (!profile || profile.role !== 'admin') {
    return null;
  }

  const toggleImpersonation = () => {
    if (!setImpersonatedRole) return;
    if (impersonatedRole === 'host') setImpersonatedRole(null);
    else setImpersonatedRole('host');
  };

  return (
    <aside className={`fixed left-6 top-24 z-40 transition-all ${collapsed ? 'w-20' : 'w-72'}`}>
      <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Адмін панель</p>
            {!collapsed && <h3 className="mt-1 text-lg font-semibold text-slate-900">Супер-адмін</h3>}
            {!collapsed && <p className="mt-1 text-sm text-slate-500">{profile?.email}</p>}
          </div>
          <div className="ml-2">
            <button onClick={() => setCollapsed((s) => !s)} className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100">
              {collapsed ? '➡' : '⬅'}
            </button>
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-2">
          <Link href="/admin" className={`rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 ${collapsed ? 'text-center' : ''}`}>Керування користувачами</Link>
          <Link href="/admin/properties" className={`rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 ${collapsed ? 'text-center' : ''}`}>Керування об'єктами</Link>
        </nav>

        {!collapsed && (
          <div className="mt-4">
            <button
              type="button"
              onClick={toggleImpersonation}
              className="w-full rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400"
            >
              {impersonatedRole === 'host' ? 'Вийти з режиму хоста' : 'Перемкнутися як орендодавець'}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
