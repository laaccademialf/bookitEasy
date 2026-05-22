'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AuthContext } from '../app/providers';
import { signOutUser } from '../lib/auth';

export function TopNav() {
  const router = useRouter();
  const { user, profile, loading } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOutUser();
    setMobileOpen(false);
    router.push('/');
  };

  // Host & admin nav items live in their section sidebars; top nav stays minimal.
  const menuItems = profile && (profile.role === 'admin' || profile.role === 'host')
    ? []
    : [{ href: '/', label: 'Головна' }];

  useEffect(() => {
    setMobileOpen(false);
  }, [profile?.uid]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/50 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-10">
        <Link href="/" className="text-lg font-semibold text-slate-900 sm:text-xl">
          BookItEasy
        </Link>

        <nav className="hidden flex-1 items-center justify-end gap-4 md:flex">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
          {loading ? (
            <span className="text-sm text-slate-500">Завантаження…</span>
          ) : user ? (
            <>
              <span className="max-w-[200px] truncate rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800">
                {profile?.name || user.email || 'Користувач'}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Вихід
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Увійти
            </Link>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((current) => !current)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 md:hidden"
          aria-label={mobileOpen ? 'Закрити меню' : 'Відкрити меню'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="space-y-2 px-4 py-4">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
            {!loading && user ? (
              <>
                <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-800">
                  {profile?.name || user.email}
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Вихід
                </button>
              </>
            ) : !loading ? (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Увійти
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
