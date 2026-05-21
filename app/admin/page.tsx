'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthContext } from '../providers';
import { fetchUsers, type UserProfile, updateUserRole, createUserDoc } from '../../lib/auth';

export default function AdminPage() {
  const authContext = useContext(AuthContext as unknown as React.Context<any>);
  const { profile, loading, impersonatedRole } = authContext as any;
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ uid: '', email: '', name: '', role: 'client' as UserProfile['role'] });

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

  const handleCreateUser = async () => {
    if (!newUser.uid) {
      setStatus('Вкажіть UID існуючого Auth-користувача');
      return;
    }

    try {
      setCreating(true);
      await createUserDoc(newUser.uid, newUser.email, newUser.name, newUser.role);
      setStatus('Документ користувача створено');
      setUsers((curr) => [...curr, { uid: newUser.uid, email: newUser.email, name: newUser.name, role: newUser.role, hostUsername: '', createdAt: new Date() }]);
      setNewUser({ uid: '', email: '', name: '', role: 'client' });
    } catch (err) {
      console.error(err);
      setStatus('Помилка при створенні документа');
    } finally {
      setCreating(false);
      setTimeout(() => setStatus(''), 2500);
    }
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
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">Створити документ користувача</h3>
            <p className="mt-2 text-sm text-slate-500">Щоб створити акаунт повністю — спочатку додайте Auth-користувача у Firebase Console, потім вставте його UID тут для створення Firestore-документа.</p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input value={newUser.uid} onChange={(e) => setNewUser({ ...newUser, uid: e.target.value })} placeholder="UID (з Auth)" className="rounded-md border px-3 py-2" />
              <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="email" className="rounded-md border px-3 py-2" />
              <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="name" className="rounded-md border px-3 py-2" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserProfile['role'] })} className="rounded-md border px-3 py-2">
                <option value="client">client</option>
                <option value="host">host</option>
                <option value="admin">admin</option>
              </select>
              <button onClick={handleCreateUser} disabled={creating} className="rounded-full bg-sky-600 px-4 py-2 text-white">
                {creating ? 'Створення…' : 'Створити документ'}
              </button>
            </div>
          </div>

          {impersonatedRole && (
            <div className="rounded-[1rem] border border-amber-200 bg-amber-50 p-4 text-amber-700">Ви тимчасово увімкнули роль: {impersonatedRole}</div>
          )}
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
