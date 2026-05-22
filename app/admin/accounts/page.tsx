'use client';

import Link from 'next/link';
import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../providers';
import {
  createUserByAdmin,
  ensureSecureHostPublicKey,
  fetchUsers,
  generateHostPublicKey,
  isSecureHostPublicKey,
  sendUserPasswordReset,
  type UserProfile,
  updateUserProfileData,
} from '../../../lib/auth';
import { KeyRound, Plus, RefreshCw, X } from 'lucide-react';
import { PageBanner } from '../../../components/PageBanner';

const emptyForm = {
  email: '',
  password: '',
  name: '',
  role: 'client' as UserProfile['role'],
  hostUsername: '',
};

function nextMonthDateString() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
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
        const normalizedUsers = data.map((user) => {
          if (user.role !== 'host') return user;

          const safeHostUsername = ensureSecureHostPublicKey(user.hostUsername);
          return {
            ...user,
            hostUsername: safeHostUsername,
            subscriptionPlan: user.subscriptionPlan || 'starter',
            subscriptionStatus: user.subscriptionStatus || 'active',
            subscriptionRenewAt: user.subscriptionRenewAt || nextMonthDateString(),
          };
        });

        setUsers(normalizedUsers);
        setLoadError('');

        const usersToMigrate = normalizedUsers.filter(
          (user, index) => user.role === 'host' && user.hostUsername !== data[index].hostUsername,
        );

        if (usersToMigrate.length > 0) {
          await Promise.allSettled(
            usersToMigrate.map((user) =>
              updateUserProfileData(user.uid, {
                email: user.email,
                name: user.name,
                role: user.role,
                hostUsername: user.hostUsername,
              }),
            ),
          );
        }
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
      const hostUsername = form.role === 'host' ? ensureSecureHostPublicKey(form.hostUsername) : '';
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
          subscriptionPlan: createdUser.role === 'host' ? 'starter' : undefined,
          subscriptionStatus: createdUser.role === 'host' ? 'active' : undefined,
          subscriptionRenewAt: createdUser.role === 'host' ? nextMonthDateString() : undefined,
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

  const handleFieldChange = (uid: string, field: 'name' | 'email', value: string) => {
    setUsers((current) =>
      current.map((user) => (user.uid === uid ? { ...user, [field]: value } : user)),
    );
  };

  const handleRoleChange = (uid: string, role: UserProfile['role']) => {
    setUsers((current) =>
      current.map((user) => {
        if (user.uid !== uid) return user;
        const fallbackHostUsername = role === 'host' ? ensureSecureHostPublicKey(user.hostUsername) : '';
        return {
          ...user,
          role,
          hostUsername: fallbackHostUsername,
          subscriptionPlan: role === 'host' ? user.subscriptionPlan || 'starter' : undefined,
          subscriptionStatus: role === 'host' ? user.subscriptionStatus || 'active' : undefined,
          subscriptionRenewAt: role === 'host' ? user.subscriptionRenewAt || nextMonthDateString() : undefined,
        };
      }),
    );
  };

  const handleSubscriptionChange = (
    uid: string,
    field: 'subscriptionPlan' | 'subscriptionStatus' | 'subscriptionRenewAt',
    value: string,
  ) => {
    setUsers((current) =>
      current.map((user) => {
        if (user.uid !== uid) return user;
        return {
          ...user,
          [field]: value,
        };
      }),
    );
  };

  const handleRegenerateHostKey = (uid: string) => {
    setUsers((current) =>
      current.map((user) => (user.uid === uid ? { ...user, hostUsername: generateHostPublicKey() } : user)),
    );
  };

  const handleSaveUser = async (user: UserProfile) => {
    const safeHostUsername = user.role === 'host' ? ensureSecureHostPublicKey(user.hostUsername) : '';

    try {
      setSavingUid(user.uid);
      await updateUserProfileData(user.uid, {
        email: user.email,
        name: user.name,
        role: user.role,
        hostUsername: safeHostUsername,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionRenewAt: user.subscriptionRenewAt,
      });
      setUsers((current) =>
        current.map((item) => (item.uid === user.uid ? { ...item, hostUsername: safeHostUsername } : item)),
      );
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
      <PageBanner
        title="Акаунти"
        actions={
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            <Plus className="h-4 w-4" /> Створити акаунт
          </button>
        }
      />

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        {loadError && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{loadError}</p>}
        {status && <p className="mb-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{status}</p>}

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

            <div className="mt-5">
              {filteredUsers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Користувачів не знайдено</p>
              ) : (
                <>
                  <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Ім'я</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Роль</th>
                          <th className="px-3 py-2 text-left">Host URL</th>
                          <th className="px-3 py-2 text-left">Тариф</th>
                          <th className="px-3 py-2 text-left">Статус</th>
                          <th className="px-3 py-2 text-left">Списання</th>
                          <th className="px-3 py-2 text-right">Дії</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.uid} className="border-t border-slate-200 align-top">
                            <td className="px-3 py-2">
                              <input
                                value={user.name}
                                onChange={(event) => handleFieldChange(user.uid, 'name', event.target.value)}
                                className="w-36 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-sky-400"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={user.email}
                                onChange={(event) => handleFieldChange(user.uid, 'email', event.target.value)}
                                className="w-52 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-sky-400"
                              />
                              <p className="mt-1 text-[11px] text-slate-400">UID: {user.uid.slice(0, 14)}...</p>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={user.role}
                                onChange={(event) => handleRoleChange(user.uid, event.target.value as UserProfile['role'])}
                                className="w-40 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-sky-400"
                              >
                                <option value="client">Клієнт</option>
                                <option value="host">Орендодавець</option>
                                <option value="admin">Адміністратор</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              {user.role === 'host' && user.hostUsername ? (
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/host/${user.hostUsername}`}
                                    target="_blank"
                                    className={`inline-flex items-center rounded-lg border px-2.5 py-2 text-xs font-medium ${
                                      isSecureHostPublicKey(user.hostUsername)
                                        ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                                        : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    }`}
                                  >
                                    /host/{user.hostUsername}
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleRegenerateHostKey(user.uid)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                                    aria-label="Згенерувати новий ключ"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {user.role === 'host' ? (
                                <select
                                  value={user.subscriptionPlan || 'starter'}
                                  onChange={(event) =>
                                    handleSubscriptionChange(user.uid, 'subscriptionPlan', event.target.value)
                                  }
                                  className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs outline-none focus:border-sky-400"
                                >
                                  <option value="starter">Starter</option>
                                  <option value="pro">Pro</option>
                                  <option value="enterprise">Enterprise</option>
                                </select>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {user.role === 'host' ? (
                                <select
                                  value={user.subscriptionStatus || 'active'}
                                  onChange={(event) =>
                                    handleSubscriptionChange(user.uid, 'subscriptionStatus', event.target.value)
                                  }
                                  className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs outline-none focus:border-sky-400"
                                >
                                  <option value="active">Активна</option>
                                  <option value="paused">Пауза</option>
                                  <option value="canceled">Скас.</option>
                                </select>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {user.role === 'host' ? (
                                <input
                                  type="date"
                                  value={user.subscriptionRenewAt || ''}
                                  onChange={(event) =>
                                    handleSubscriptionChange(user.uid, 'subscriptionRenewAt', event.target.value)
                                  }
                                  className="w-36 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs outline-none focus:border-sky-400"
                                />
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleResetPassword(user)}
                                  disabled={resettingUid === user.uid}
                                  className="inline-flex items-center justify-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                  {resettingUid === user.uid ? 'Надс...' : 'Пароль'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveUser(user)}
                                  disabled={savingUid === user.uid}
                                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {savingUid === user.uid ? 'Збер...' : 'Зберегти'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 md:hidden">
                    {filteredUsers.map((user) => (
                      <article key={user.uid} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="grid gap-2">
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
                          {user.role === 'host' && (
                            <>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/host/${user.hostUsername}`}
                                  target="_blank"
                                  className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-xs font-medium text-sky-700"
                                >
                                  /host/{user.hostUsername}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleRegenerateHostKey(user.uid)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-3">
                                <select
                                  value={user.subscriptionPlan || 'starter'}
                                  onChange={(event) =>
                                    handleSubscriptionChange(user.uid, 'subscriptionPlan', event.target.value)
                                  }
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
                                >
                                  <option value="starter">Starter</option>
                                  <option value="pro">Pro</option>
                                  <option value="enterprise">Enterprise</option>
                                </select>
                                <select
                                  value={user.subscriptionStatus || 'active'}
                                  onChange={(event) =>
                                    handleSubscriptionChange(user.uid, 'subscriptionStatus', event.target.value)
                                  }
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
                                >
                                  <option value="active">Активна</option>
                                  <option value="paused">Пауза</option>
                                  <option value="canceled">Скасована</option>
                                </select>
                                <input
                                  type="date"
                                  value={user.subscriptionRenewAt || ''}
                                  onChange={(event) =>
                                    handleSubscriptionChange(user.uid, 'subscriptionRenewAt', event.target.value)
                                  }
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user)}
                            disabled={resettingUid === user.uid}
                            className="inline-flex items-center justify-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            {resettingUid === user.uid ? 'Надсилання...' : 'Пароль'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveUser(user)}
                            disabled={savingUid === user.uid}
                            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {savingUid === user.uid ? 'Збереження...' : 'Зберегти'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
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
                    hostUsername: nextRole === 'host' ? ensureSecureHostPublicKey(form.hostUsername) : '',
                  });
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-sky-400"
              >
                <option value="client">Клієнт</option>
                <option value="host">Орендодавець</option>
                <option value="admin">Адміністратор</option>
              </select>
              {form.role === 'host' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Безпечне публічне посилання буде згенероване автоматично у форматі `h-xxxxxxxxxxxx`.
                </div>
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
