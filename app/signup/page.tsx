'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '../../lib/auth';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [wantHost, setWantHost] = useState(false);
  const [hostUsername, setHostUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await registerUser(email, password, name, wantHost, hostUsername);
      router.push('/dashboard');
    } catch (err) {
      setError('Помилка реєстрації. Будь ласка, перевірте введені дані.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12 lg:px-10">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
          <h1 className="text-4xl font-semibold text-slate-900">Реєстрація в BookItEasy</h1>
          <p className="mt-4 text-slate-600">Створіть акаунт та почніть керувати бронюваннями й об’єктами.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300">Повне ім’я</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="host"
                type="checkbox"
                checked={wantHost}
                onChange={(event) => setWantHost(event.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-400"
              />
              <label htmlFor="host" className="text-sm text-slate-300">
                Я хочу стати орендодавцем
              </label>
            </div>

            {wantHost && (
              <div>
                <label className="block text-sm font-medium text-slate-300">Ваш унікальний хост-username</label>
                <input
                  type="text"
                  value={hostUsername}
                  onChange={(event) => setHostUsername(event.target.value)}
                  placeholder="ivan-guest"
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
                />
              </div>
            )}

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
              disabled={loading}
            >
              {loading ? 'Реєструємо...' : 'Зареєструватися'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Вже маєте акаунт?{' '}
            <Link href="/login" className="text-sky-300 hover:text-sky-200">
              Увійти
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
