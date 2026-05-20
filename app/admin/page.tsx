'use client';

import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthContext } from '../providers';
import { fetchUsers, type UserProfile, updateUserRole } from '../../lib/auth';

export default function AdminPage() {
  const { profile, loading } = useContext(AuthContext);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await fetchUsers();
      setUsers(data);
    };

    if (profile?.role === 'admin') {
      load();
    }
  }, [profile]);

  const handleRoleChange = async (uid: string, role: UserProfile['role']) => {
    setStatus('Оновлення...');
    await updateUserRole(uid, role);
    setUsers((current) => current.map((user) => (user.uid === uid ? { ...user, role } : user)));
    setStatus('Роль оновлено');
    setTimeout(() => setStatus(''), 2000);
  };

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
          <p className="mt-4 max-w-2xl text-slate-300">
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
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-500">Панель супер-адміна</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Глобальний моніторинг та керування</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Список користувачів, контроль ролей та загальна аналітика. Супер-адмін може переводити клієнта на роль орендодавця та керувати ролями.
          </p>
          {status && <p className="mt-4 text-slate-200">{status}</p>}
        </div>

        <div className="space-y-6">
          {users.map((user) => (
            <div key={user.uid} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-400">{user.email}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{user.name}</p>
                  <p className="mt-1 text-sm text-slate-500">Роль: {user.role}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['client', 'host', 'admin'] as UserProfile['role'][]).map((roleOption) => (
                    <button
                      key={roleOption}
                      type="button"
                      disabled={user.role === roleOption}
                      onClick={() => handleRoleChange(user.uid, roleOption)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        user.role === roleOption
                          ? 'bg-slate-700 text-slate-200'
                          : 'bg-sky-500 text-white hover:bg-sky-400'
                      }`}
                    >
                      {roleOption}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
