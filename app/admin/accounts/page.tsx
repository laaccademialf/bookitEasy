'use client';

import Link from 'next/link';
import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../providers';
import {
  createUserByAdmin,
  fetchUsers,
  sendUserPasswordReset,
  type UserProfile,
  updateUserProfileData,
} from '../../../lib/auth';
import { KeyRound, Plus, X } from 'lucide-react';

const emptyForm = {
  email: '',
  password: '',
  name: '',
  role: 'client' as UserProfile['role'],
  hostUsername: '',
};

function buildHostUsername(email: string) {
  const localPart = email.split('@')[0] || 'host';
  return localPart.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

export default function AdminAccountsPage() {
  const authContext = useContext(AuthContext as unknown as React.Context<any>);
  const { profile, loading } = authContext as any;
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [resettingUid, setResettingUid] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const load = async () => {
      try {
        const data = await fetchUsers();
        setUsers(data);
        setLoadError('');
      } catch {
        setUsers([]);
        setLoadError('Немає доступу до списку акаунтів. Перевірте налаштування доступу.');
      }
    };

    load();
  }, [profile]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      return (
        user.email.toLowerCase().includes(q) ||
        user.name.toLowerCase().includes(q) ||
        user.uid.toLowerCase().includes(q) ||
        (user.hostUsername || '').toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  const clearStatus = () => {
    setTimeout(() => setStatus(''), 2200);
  };

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.name) {
      setStatus('Заповніть імʼя, email і пароль');
      clearStatus();
      return;
    }

    if (form.password.length < 6) {
      setStatus('Пароль має містити щонайменше 6 символів');
      clearStatus();
      return;
    }

    try {
      setCreating(true);
      const hostUsername = form.role === 'host' ? form.hostUsername || buildHostUsername(form.email) : '';
      const createdUser = await createUserByAdmin({
        email: form.email,
        password: form.password,
        name: form.name,
        role: form.role,
        hostUsername,
      });

      setUsers((current) => [
        {
          uid: createdUser.uid,
          email: createdUser.email,
          name: createdUser.name,
          role: createdUser.role,
          hostUsername: createdUser.hostUsername,
          createdAt: new Date(),
        },
        ...current,
      ]);

      setForm(emptyForm);
      setCreateModalOpen(false);
      setStatus('Акаунт додано');
    } catch (error) {
      const code = (error as any)?.code ? String((error as any).code) : '';
      if (code === 'auth/email-already-in-use') {
        setStatus('Користувач з таким email вже існує');
      } else if (code === 'auth/weak-password') {
        setStatus('Слабкий пароль. Мінімум 6 символів');
      } else {
        setStatus('Не вдалося створити акаунт. Перевірте налаштування доступу і дані форми.');
      }
    } finally {
      setCreating(false);
      clearStatus();
    }
  };

  const handleFieldChange = (uid: string, field: 'name' | 'email' | 'hostUsername', value: string) => {
    setUsers((current) =>
      current.map((user) => (user.uid === uid ? { ...user, [field]: value } : user)),
    );
  };

  const handleRoleChange = (uid: string, role: UserProfile['role']) => {
    setUsers((current) =>
      current.map((user) => {
        if (user.uid !== uid) return user;
        const fallbackHostUsername = role === 'host' ? user.hostUsername || buildHostUsername(user.email) : '';
        return {
          ...user,
          role,
          hostUsername: fallbackHostUsername,
        };
      }),
    );
  };

  const handleSaveUser = async (user: UserProfile) => {
    try {
      setSavingUid(user.uid);
      await updateUserProfileData(user.uid, {
        email: user.email,
        name: user.name,
        role: user.role,
        hostUsername: user.role === 'host' ? user.hostUsername || buildHostUsername(user.email) : '',
      });
      setStatus(`Збережено: ${user.email}`);
    } catch (error) {
      console.error(error);
      setStatus(`Помилка збереження: ${user.email}`);
    } finally {
      setSavingUid(null);
      clearStatus();
    }
  };

  const handleResetPassword = async (user: UserProfile) => {
    try {
      setResettingUid(user.uid);
      await sendUserPasswordReset(user.email);
      setStatus(`Лист для зміни пароля надіслано: ${user.email}`);
    } catch {
      setStatus(`Не вдалося надіслати лист для зміни пароля: ${user.email}`);
    } finally {
      setResettingUid(null);
      clearStatus();
    }
  };

  if (loading) {
    return <p className="p-8 text-slate-600">Завантаження...</p>;
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Доступ заборонено</h1>
          <p className="mt-4 text-slate-600">Сторінка доступна лише адміністратору.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Увійти
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="w-full border-y border-slate-200 bg-white/90 px-6 py-7 lg:px-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-500">Управління акаунтами</p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-900">Створення, редагування і ролі</h1>
            <p className="mt-3 max-w-3xl text-slate-600">
              Видавайте роль орендодавця, надсилайте запит на зміну пароля та відкривайте швидке посилання на обʼєкти хоста.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            <Plus className="h-4 w-4" /> Створити акаунт
          </button>
        </div>
        {loadError && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{loadError}</p>}
        {status && <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{status}</p>}
      </section>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-md">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Список акаунтів</h2>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Пошук по email / імені / UID"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none md:max-w-xs"
              />
            </div>

            <div className="mt-5 space-y-4">
              {filteredUsers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Користувачів не знайдено</p>
              ) : (
                filteredUsers.map((user) => (
                  <article key={user.uid} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 lg:grid-cols-5">
                      <input
                        value={user.name}
                        onChange={(event) => handleFieldChange(user.uid, 'name', event.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      />
                      <input
                        value={user.email}
                        onChange={(event) => handleFieldChange(user.uid, 'email', event.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      />
                      <select
                        value={user.role}
                        onChange={(event) => handleRoleChange(user.uid, event.target.value as UserProfile['role'])}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      >
                        <option value="client">Клієнт</option>
                        <option value="host">Орендодавець</option>
                        <option value="admin">Адміністратор</option>
                      </select>
                      {user.role === 'host' ? (
                        <input
                          value={user.hostUsername || ''}
                          onChange={(event) => handleFieldChange(user.uid, 'hostUsername', event.target.value)}
                          placeholder="host username"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                        />
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500">host username не потрібен</div>
                      )}

                      {user.role === 'host' && user.hostUsername ? (
                        <Link
                          href={`/host/${user.hostUsername}`}
                          target="_blank"
                          className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
                        >
                          /host/{user.hostUsername}
                        </Link>
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500">
                          Публічне посилання доступне для ролі host
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <p className="text-xs text-slate-500">UID: {user.uid}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResetPassword(user)}
                          disabled={resettingUid === user.uid}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <KeyRound className="h-4 w-4" />
                          {resettingUid === user.uid ? 'Надсилання...' : 'Змінити пароль'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveUser(user)}
                          disabled={savingUid === user.uid}
                          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {savingUid === user.uid ? 'Збереження...' : 'Зберегти'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 px-4" onClick={() => setCreateModalOpen(false)}>
          <div
            className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Створити новий акаунт</h2>
                <p className="mt-2 text-sm text-slate-600">Вкажіть ПІБ, email і пароль. Система сама створить Auth-користувача та профіль.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-full border border-slate-300 p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Закрити модальне вікно"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="Email"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-sky-400"
              />
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Пароль"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-sky-400"
              />
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Імʼя"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-sky-400"
              />
              <select
                value={form.role}
                onChange={(event) => {
                  const nextRole = event.target.value as UserProfile['role'];
                  setForm({
                    ...form,
                    role: nextRole,
                    hostUsername:
                      nextRole === 'host' ? form.hostUsername || buildHostUsername(form.email) : '',
                  });
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-sky-400"
              >
                <option value="client">Клієнт</option>
                <option value="host">Орендодавець</option>
                <option value="admin">Адміністратор</option>
              </select>
              {form.role === 'host' && (
                <input
                  value={form.hostUsername}
                  onChange={(event) => setForm({ ...form, hostUsername: event.target.value })}
                  placeholder="username орендодавця (для /host/[username])"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-sky-400"
                />
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? 'Створення...' : 'Створити акаунт'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
