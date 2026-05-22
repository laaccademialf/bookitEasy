'use client';

import React, { useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AuthContext } from '../providers';
import { fetchUsers, type UserProfile } from '../../lib/auth';
import { getPublicProperties } from '../../lib/properties';
import { Building2, Users } from 'lucide-react';
import { PageBanner } from '../../components/PageBanner';

export default function AdminPage() {
  const authContext = useContext(AuthContext as unknown as React.Context<any>);
  const { profile, loading } = authContext as any;
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [propertiesCount, setPropertiesCount] = useState(0);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [loadedUsers, loadedProperties] = await Promise.all([fetchUsers(), getPublicProperties()]);
        setUsers(loadedUsers);
        setPropertiesCount(loadedProperties.length);
        setLoadError('');
      } catch {
        setUsers([]);
        setPropertiesCount(0);
        setLoadError('Немає доступу до частини адмін-даних. Перевірте налаштування доступу.');
      }
    };

    if (profile?.role === 'admin') {
      load();
    }
  }, [profile]);

  const hostCount = useMemo(() => users.filter((user) => user.role === 'host').length, [users]);
  const adminCount = useMemo(() => users.filter((user) => user.role === 'admin').length, [users]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12 lg:px-10">
          <p className="text-slate-600">Завантаження профілю...</p>
        </div>
      </main>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-12 lg:px-10 text-center">
          <h1 className="text-4xl font-semibold text-slate-900">Доступ заборонено</h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Для доступу до адмін-панелі потрібен супер-адмінський акаунт.
          </p>
          <Link href="/login" className="mt-8 inline-flex rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-400">
            Увійти
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PageBanner title="Кабінет адміністратора" />
      <div className="w-full px-4 py-8 sm:px-6 lg:px-6">
        {loadError && <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{loadError}</p>}

        <div className="grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Всього акаунтів</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{users.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Орендодавці</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{hostCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Адміни</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{adminCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Обʼєкти в системі</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{propertiesCount}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Link href="/admin/accounts" className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-md transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg">
            <div className="inline-flex rounded-xl bg-sky-100 p-3 text-sky-600">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">Управління акаунтами</h2>
            <p className="mt-2 text-slate-600">Створення, редагування та призначення ролей, включно з роллю орендодавця.</p>
          </Link>

          <Link href="/admin/properties" className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-md transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg">
            <div className="inline-flex rounded-xl bg-emerald-100 p-3 text-emerald-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">Управління обʼєктами</h2>
            <p className="mt-2 text-slate-600">Перегляд усіх обʼєктів у системі з деталями власників та характеристиками.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
