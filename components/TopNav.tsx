'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ChevronsLeftRight, CircleUserRound, Menu, PanelLeft, X } from 'lucide-react';
import { AuthContext } from '../app/providers';
import { signOutUser } from '../lib/auth';

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const isSectionPage = pathname.startsWith('/admin') || pathname.startsWith('/dashboard');
  const hasProfile = Boolean(user && profile);

  const showSubscription = useMemo(() => {
    if (!profile) return false;
    return profile.role === 'host' || profile.role === 'admin';
  }, [profile]);

  const handleSignOut = async () => {
    await signOutUser();
    setMobileOpen(false);
    setProfileMenuOpen(false);
    router.push('/');
  };

  const triggerSidebarToggle = () => {
    window.dispatchEvent(new Event('bookiteasy:sidebar-toggle'));
  };

  const triggerSidebarCollapse = () => {
    window.dispatchEvent(new Event('bookiteasy:sidebar-collapse-toggle'));
  };

  // Host & admin nav items live in their section sidebars; top nav stays minimal.
  const menuItems = profile && (profile.role === 'admin' || profile.role === 'host')
    ? []
    : [{ href: '/', label: 'Головна' }];

  useEffect(() => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
  }, [profile?.uid]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/50 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-10">
        <div className="flex items-center gap-2">
          {isSectionPage && (
            <>
              <button
                type="button"
                onClick={triggerSidebarToggle}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                aria-label="Відкрити або закрити бокову панель"
                title="Відкрити або закрити бокову панель"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={triggerSidebarCollapse}
                className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 lg:inline-flex"
                aria-label="Згорнути або розгорнути бокову панель"
                title="Згорнути або розгорнути бокову панель"
              >
                <ChevronsLeftRight className="h-4 w-4" />
              </button>
            </>
          )}

          <Link href="/" className="text-lg font-semibold text-slate-900 sm:text-xl">
            BookItEasy
          </Link>
        </div>

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
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                aria-label="Відкрити меню профілю"
              >
                <CircleUserRound className="h-4 w-4" />
                <span className="max-w-[180px] truncate">{profile?.name || user.email || 'Користувач'}</span>
              </button>

              {profileMenuOpen && hasProfile && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">{profile?.name || user.email}</p>
                    <p className="truncate text-xs text-slate-500">{profile?.email || user.email}</p>
                  </div>
                  <div className="p-2">
                    <Link
                      href="/profile"
                      className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                    >
                      Редагувати профіль
                    </Link>
                    {showSubscription && (
                      <Link
                        href="/profile/subscription"
                        className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                      >
                        Моя підписка
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                    >
                      Вийти
                    </button>
                  </div>
                </div>
              )}
            </div>
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
            {isSectionPage && (
              <button
                type="button"
                onClick={triggerSidebarToggle}
                className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Відкрити/закрити бокову панель
              </button>
            )}
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
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
                >
                  Редагувати профіль
                </Link>
                {showSubscription && (
                  <Link
                    href="/profile/subscription"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
                  >
                    Моя підписка
                  </Link>
                )}
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
