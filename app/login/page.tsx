'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserProfile, signInUser } from '../../lib/auth';

const ADMIN_EMAILS = new Set(
  [
    'andrii.disha@gmail.com',
    ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean),
  ].map((email) => email.toLowerCase())
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInUser(email, password);
      const profile = await getUserProfile(credential.user.uid);
      const signedInEmail = (credential.user.email || '').toLowerCase();

      if (profile?.role === 'admin' || ADMIN_EMAILS.has(signedInEmail)) {
        router.push('/admin');
      } else if (profile?.role === 'host') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      const code = err?.code ? String(err.code) : '';
      const message =
        code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Невірний email або пароль.'
          : code === 'auth/too-many-requests'
          ? 'Забагато спроб входу. Спробуйте пізніше.'
          : err?.message || 'Не вдалося увійти. Перевірте email та пароль.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100svh] bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-[100svh] max-w-5xl items-start justify-center px-4 py-4 sm:px-6 sm:py-8 md:items-center md:py-10 lg:px-10">
        <div className="w-full rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_40px_120px_rgba(15,23,42,0.08)] sm:rounded-[2.5rem] sm:p-6 md:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            <div className="hidden rounded-[2rem] bg-slate-50 p-8 lg:block">
              <span className="inline-flex rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700">
                Ласкаво просимо до BookItEasy
              </span>
              <div className="mt-6">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Увійдіть до кабінету</h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                  Вхід до системи для невідкладного керування бронюваннями, аналітикою й об’єктами.
                </p>
              </div>
              <div className="mt-6 rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-sm">
                <p className="font-semibold text-slate-900">Порада</p>
                <p className="mt-2">Увійдіть тим email, який вам надав адміністратор. Реєстрація на платформі вимкнена.</p>
              </div>
            </div>

            <div className="rounded-[2rem] bg-slate-950/95 p-5 text-slate-100 shadow-xl sm:p-8">
              <h2 className="text-2xl font-semibold sm:text-3xl">Увійти</h2>
              <p className="mt-3 text-sm text-slate-400">Введіть email і пароль для доступу до вашого кабінету.</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 sm:mt-3 sm:rounded-3xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Пароль</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 sm:mt-3 sm:rounded-3xl"
                  />
                </div>

                {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-400 sm:rounded-3xl">{error}</p>}

                <button
                  type="submit"
                  className="w-full rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
                  disabled={loading}
                >
                  {loading ? 'Завантаження...' : 'Увійти'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-500">
                Доступ надається адміністратором. Якщо ви не отримали облікові дані — зверніться до власника платформи.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
