'use client';

import React, { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '../app/providers';
import SectionSidebar, { SectionSidebarItem } from './SectionSidebar';
import { Briefcase, Building2, LayoutDashboard, Users } from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleOpen: () => void;
  onToggleCollapsed: () => void;
}

const NAV: SectionSidebarItem[] = [
  { href: '/admin', label: 'Огляд', icon: LayoutDashboard, exact: true },
  { href: '/admin/accounts', label: 'Управління акаунтами', icon: Users },
  { href: '/admin/properties', label: 'Управління обʼєктами', icon: Building2 },
];

export default function AdminSidebar(props: AdminSidebarProps) {
  const authContext = useContext(AuthContext as unknown as React.Context<any>);
  const { profile, impersonatedRole, setImpersonatedRole } = (authContext || {}) as any;
  const router = useRouter();

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;
    NAV.forEach((item) => router.prefetch(item.href));
  }, [profile, router]);

  if (!profile || profile.role !== 'admin') return null;

  const toggleImpersonation = () => {
    if (!setImpersonatedRole) return;
    setImpersonatedRole(impersonatedRole === 'host' ? null : 'host');
  };

  const footer = (
    <>
      <div className="mb-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-900">Бізнес-режим</p>
        <p className="mt-1">
          Надайте роль орендодавця, і користувач зможе працювати у кабінеті хоста та додавати обʼєкти.
        </p>
      </div>
      <button
        type="button"
        onClick={toggleImpersonation}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400"
      >
        <Briefcase className="h-4 w-4" />
        {impersonatedRole === 'host' ? 'Вийти з режиму хоста' : 'Перемкнутися як орендодавець'}
      </button>
    </>
  );

  return (
    <SectionSidebar
      {...props}
      ariaLabel="Меню адміністратора"
      title="Супер-адмін"
      subtitle={profile?.email}
      navItems={NAV}
      footer={footer}
    />
  );
}
