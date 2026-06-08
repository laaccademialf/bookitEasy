'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Bell, CircleUserRound, PanelLeftClose, UserCircle2, X } from 'lucide-react';
import { AuthContext } from '../app/providers';
import { signOutUser } from '../lib/auth';
import { getHostBookings, getPublicPropertyAvailability } from '../lib/bookings';
import { getHostProperties, getPublicProperties } from '../lib/properties';

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  unread: boolean;
};

function toLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [sidebarOffset, setSidebarOffset] = useState(0);

  const isSectionPage = pathname.startsWith('/admin') || pathname.startsWith('/dashboard');
  const hasProfile = Boolean(user && profile);
  const sidebarOffsetClass = isSectionPage
    ? sidebarOffset >= 280
      ? 'lg:pl-[19.5rem]'
      : sidebarOffset >= 70
      ? 'lg:pl-[6.5rem]'
      : 'lg:pl-6'
    : 'lg:pl-6';

  const showSubscription = useMemo(() => {
    if (!profile) return false;
    return profile.role === 'host' || profile.role === 'admin';
  }, [profile]);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications],
  );

  const logoHref = useMemo(() => {
    if (profile?.role === 'admin') return '/admin';
    if (profile?.role === 'host') return '/dashboard';
    if (pathname.startsWith('/dashboard')) return '/dashboard';
    if (pathname.startsWith('/admin')) return '/admin';
    return '/';
  }, [pathname, profile?.role]);

  const handleSignOut = async () => {
    await signOutUser();
    setMobileOpen(false);
    setProfileMenuOpen(false);
    router.push('/');
  };

  const toggleSidebarOnMobile = () => {
    window.dispatchEvent(new Event('bookiteasy:sidebar-mobile-toggle'));
  };

  // Host & admin nav items live in their section sidebars; top nav stays minimal.
  const menuItems = profile && (profile.role === 'admin' || profile.role === 'host')
    ? []
    : [{ href: '/', label: 'Головна' }];

  useEffect(() => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
  }, [profile?.uid]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profile?.uid) {
      setNotifications([]);
      return;
    }

    let isMounted = true;

    const loadNotifications = async () => {
      try {
        setNotificationsLoading(true);

        let properties = await getHostProperties(profile.uid);
        if (properties.length === 0 && profile.hostUsername) {
          const publicProperties = await getPublicProperties();
          properties = publicProperties.filter((property) => property.hostId === profile.hostUsername);
        }
        if (!isMounted) return;

        const propertyTitles = new Map(
          properties.map((property) => [property.id || '', property.title]),
        );

        const availabilitiesByProperty = await Promise.all(
          properties
            .map((property) => property.id)
            .filter((id): id is string => Boolean(id))
            .map((propertyId) => getPublicPropertyAvailability(propertyId)),
        );
        if (!isMounted) return;

        const publicBookings = availabilitiesByProperty
          .flat()
          .filter((booking) => booking.status !== 'cancelled');

        const hostBookings = (await getHostBookings(profile.uid, true)).filter(
          (booking) => booking.status !== 'cancelled',
        );

        const mergedByKey = new Map<
          string,
          {
            id?: string;
            propertyId: string;
            status: 'pending' | 'confirmed' | 'cancelled';
            startDate: string;
            endDate: string;
          }
        >();

        publicBookings.forEach((booking) => {
          const key = `${booking.propertyId}:${booking.startDate}:${booking.endDate}:${booking.status}`;
          mergedByKey.set(key, booking);
        });

        hostBookings.forEach((booking) => {
          const key = `${booking.propertyId}:${booking.startDate}:${booking.endDate}:${booking.status}`;
          if (!mergedByKey.has(key)) {
            mergedByKey.set(key, booking);
          }
        });

        const bookings = Array.from(mergedByKey.values());

        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const todayIso = isoDate(today);
        const tomorrowIso = isoDate(tomorrow);

        // Add pending booking requests at the top
        const pendingNotifications = bookings
          .filter((booking) => booking.status === 'pending')
          .map((booking) => {
            const title = propertyTitles.get(booking.propertyId) || 'Обʼєкт';
            return {
              id: `pending-${booking.id || booking.propertyId}`,
              title: 'Новий запит на бронювання',
              description: `${title}: ${booking.startDate} - ${booking.endDate}`,
              href: '/dashboard/calendar',
              unread: true,
            } as NotificationItem;
          });

        // Add confirmed booking notifications (check-in/occupancy)
        const confirmedNotifications = bookings
          .filter((booking) => booking.status === 'confirmed')
          .map((booking) => {
            const title = propertyTitles.get(booking.propertyId) || 'Обʼєкт';
            const startIso = isoDate(toLocalDate(booking.startDate));
            const endIso = isoDate(toLocalDate(booking.endDate));

            if (startIso === todayIso) {
              return {
                id: `checkin-today-${booking.id || booking.propertyId}`,
                title: 'Сьогодні заселення',
                description: `${title}: заїзд ${booking.startDate}`,
                href: '/dashboard/calendar',
                unread: true,
              } as NotificationItem;
            }

            if (startIso === tomorrowIso) {
              return {
                id: `checkin-tomorrow-${booking.id || booking.propertyId}`,
                title: 'Завтра заселення',
                description: `${title}: заїзд ${booking.startDate}`,
                href: '/dashboard/calendar',
                unread: true,
              } as NotificationItem;
            }

            if (todayIso >= startIso && todayIso <= endIso) {
              return {
                id: `occupied-now-${booking.id || booking.propertyId}`,
                title: 'Обʼєкт заселений',
                description: `${title}: ${booking.startDate} - ${booking.endDate}`,
                href: '/dashboard/calendar',
                unread: false,
              } as NotificationItem;
            }

            return null;
          })
          .filter((item): item is NotificationItem => Boolean(item));

        const computed = [...pendingNotifications, ...confirmedNotifications].slice(0, 8);
        if (isMounted) {
          setNotifications(computed);
        }
      } catch (error) {
        console.error('Failed to compute notifications:', error);
        if (isMounted) {
          setNotifications([]);
        }
      } finally {
        if (isMounted) {
          setNotificationsLoading(false);
        }
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [profile]);

  useEffect(() => {
    const handleSidebarOffset = (event: Event) => {
      const custom = event as CustomEvent<{ width?: number }>;
      setSidebarOffset(custom.detail?.width || 0);
    };

    window.addEventListener('bookiteasy:layout-sidebar-width', handleSidebarOffset);

    return () => {
      window.removeEventListener('bookiteasy:layout-sidebar-width', handleSidebarOffset);
    };
  }, []);

  useEffect(() => {
    if (!isSectionPage) {
      setSidebarOffset(0);
    }
  }, [isSectionPage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const withinMenu = target.closest('[data-topnav-profile-menu="true"]');
      const withinTrigger = target.closest('[data-topnav-profile-trigger="true"]');
      if (!withinMenu && !withinTrigger) {
        setMobileOpen(false);
        setProfileMenuOpen(false);
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/50 bg-white/85 backdrop-blur-xl">
      <div
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:pr-4 lg:transition-[padding] lg:duration-300 ${sidebarOffsetClass}`}
      >
        <div className="flex items-center gap-2">
          {isSectionPage && (
            <button
              type="button"
              onClick={toggleSidebarOnMobile}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 lg:hidden"
              aria-label="Відкрити меню розділу"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          )}
          <Link href={logoHref} className="text-lg font-semibold text-slate-900 sm:text-xl">
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
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen((current) => !current);
                    setProfileMenuOpen(false);
                  }}
                  data-topnav-profile-trigger="true"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                  aria-label="Відкрити центр сповіщень"
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                  )}
                </button>

                {notificationsOpen && (
                  <div data-topnav-profile-menu="true" className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">Центр сповіщень</p>
                      <p className="text-xs text-slate-500">Заселення та важливі події</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2">
                      {notificationsLoading ? (
                        <p className="px-2 py-3 text-sm text-slate-500">Завантаження...</p>
                      ) : notifications.length === 0 ? (
                        <p className="px-2 py-3 text-sm text-slate-500">Нових сповіщень немає.</p>
                      ) : (
                        notifications.map((item) => (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => setNotificationsOpen(false)}
                            className="mb-1 block rounded-xl border border-slate-200 px-3 py-2.5 transition hover:bg-slate-50"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                              {item.unread ? <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" /> : null}
                            </div>
                            <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen((current) => !current);
                    setNotificationsOpen(false);
                  }}
                  data-topnav-profile-trigger="true"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                  aria-label="Відкрити меню профілю"
                >
                  <CircleUserRound className="h-4 w-4" />
                  <span className="max-w-[180px] truncate">{profile?.name || user.email || 'Користувач'}</span>
                </button>

                {profileMenuOpen && hasProfile && (
                  <div data-topnav-profile-menu="true" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
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
          data-topnav-profile-trigger="true"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 md:hidden"
          aria-label={mobileOpen ? 'Закрити меню профілю' : 'Відкрити меню профілю'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <UserCircle2 className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div data-topnav-profile-menu="true" className="absolute right-3 top-[calc(100%+0.4rem)] z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:hidden">
          <div className="space-y-2 p-3">
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
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs font-semibold text-slate-900">Центр сповіщень</p>
                  {notificationsLoading ? (
                    <p className="mt-1 text-xs text-slate-500">Завантаження...</p>
                  ) : notifications.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">Немає нових подій</p>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {notifications.slice(0, 3).map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className="block rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-700"
                        >
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-0.5 truncate">{item.description}</p>
                        </Link>
                      ))}
                    </div>
                  )}
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
