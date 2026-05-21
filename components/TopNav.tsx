'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import { AuthContext } from '../app/providers';
import { signOutUser } from '../lib/auth';

export function TopNav() {
  const router = useRouter();
  const { user, profile, loading } = useContext(AuthContext);

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/');
  };

  const menuItems = profile
    ? profile.role === 'admin'
      ? []
      : profile.role === 'host'
      ? [
          { href: '/dashboard', label: 'Дашборд' },
          { href: '/dashboard/properties', label: 'Об’єкти' },
          { href: '/dashboard/calendar', label: 'Календар' },
          { href: '/dashboard/finances', label: 'Фінанси' },
        ]
      : [
          { href: '/', label: 'Головна' },
        ]
    : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/50 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
        <Link href="/" className="text-xl font-semibold text-slate-900">
          BookItEasy
        </Link>

        <nav className="flex flex-1 items-center justify-between gap-4">
          <div className="hidden items-center gap-4 md:flex">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm font-medium text-slate-700 transition hover:text-slate-900">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {loading ? (
              <span className="text-sm text-slate-500">Завантаження...</span>
            ) : user ? (
              <>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800">{profile?.name || user.email || 'Користувач'}</span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Вихід
                </button>
              </>
            ) : (
              <Link href="/login" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                Увійти
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
