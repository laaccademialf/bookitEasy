'use client';

import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../providers';
import { updateCurrentUserAccount } from '../../lib/auth';
import { PageBanner } from '../../components/PageBanner';
import { ActiveBookings } from '../../components/ActiveBookings';

export default function ProfilePage() {
  const { profile, loading } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || '');
    setEmail(profile.email || '');
    setPhone(profile.phone || '');
  }, [profile]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password && password.length < 6) {
      setStatus('Новий пароль має містити щонайменше 6 символів.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('Підтвердження пароля не збігається.');
      return;
    }

    try {
      setSaving(true);
      setStatus('');
      await updateCurrentUserAccount({
        name,
        email,
        phone,
        newPassword: password || undefined,
      });
      setPassword('');
      setConfirmPassword('');
      setStatus('Профіль оновлено успішно.');
    } catch (error: any) {
      const code = error?.code ? String(error.code) : '';
      if (code === 'auth/requires-recent-login') {
        setStatus('Для зміни email або пароля виконайте повторний вхід у систему.');
      } else {
        setStatus('Не вдалося оновити профіль. Спробуйте ще раз.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-8 text-slate-600">Завантаження...</p>;
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Доступ заборонено</h1>
          <p className="mt-4 text-slate-600">Увійдіть, щоб керувати профілем.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Увійти
          </Link>
        </div>
      </main>
    );
  }

  console.log('👤 Profile:', { uid: profile?.uid, role: profile?.role });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PageBanner title="Мій профіль" />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        {/* Блок активних бронювань */}
        {profile?.role === 'client' && profile?.uid && (
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">Мої активні бронювання</h2>
            <ActiveBookings clientId={profile.uid} />
          </section>
        )}

        {/* Форма редагування профілю */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Редагувати профіль</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Ім'я</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Телефон</label>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+380..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Новий пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Необов'язково"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Підтвердити пароль</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Повторіть пароль"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {status && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{status}</p>}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Збереження...' : 'Зберегти зміни'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
