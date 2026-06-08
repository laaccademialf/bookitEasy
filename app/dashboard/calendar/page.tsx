'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { AuthContext } from '../../providers';
import { addBlockedDate, getHostProperties, type Property } from '../../../lib/properties';
import { getHostBookings, updateBookingStatus, type Booking } from '../../../lib/bookings';
import { syncCleaningTicketsForHost } from '../../../lib/cleaning';
import { fetchUsers, type UserProfile } from '../../../lib/auth';
import { PageBanner } from '../../../components/PageBanner';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_VISIBLE = 14;

type CellDetail = {
  propertyTitle: string;
  booking: Booking;
  guestName: string;
  nights: number;
};

function toLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toMonthValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

function monthStartFromValue(monthValue: string): Date {
  const [year, month] = monthValue.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function monthLabel(monthValue: string): string {
  const date = monthStartFromValue(monthValue);
  return new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(date);
}

function daysBetween(start: Date, end: Date): number {
  return Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS);
}

function isDateInRange(dayIso: string, startDate: string, endDate: string): boolean {
  return dayIso >= startDate && dayIso <= endDate;
}

function statusColor(status: Booking['status']): string {
  if (status === 'confirmed') return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  if (status === 'pending') return 'border-amber-300 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

export default function CalendarPage() {
  const { profile, loading } = useContext(AuthContext);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, UserProfile>>(new Map());
  const [selectedProperty, setSelectedProperty] = useState('');
  const [blockDate, setBlockDate] = useState('');
  const [status, setStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthValue(new Date()));
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedCell, setSelectedCell] = useState<CellDetail | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!profile?.uid) return;

      try {
        const [propertiesData, bookingsData] = await Promise.all([
          getHostProperties(profile.uid),
          getHostBookings(profile.uid),
        ]);

        setProperties(propertiesData);
        setBookings(bookingsData);

        if (propertiesData.length > 0) {
          setSelectedProperty((current) => current || propertiesData[0].id || '');
        }

        // Keep cleaning tickets aligned with confirmed bookings.
        await syncCleaningTicketsForHost(profile.uid);
      } catch {
        setStatus('Не вдалося завантажити календар. Оновіть сторінку.');
      }

      // fetchUsers потребує прав адміна — намагаємося тихо, без блокування основного завантаження
      try {
        const users = await fetchUsers();
        setUsersMap(new Map(users.map((user) => [user.uid, user])));
      } catch {
        // non-admin hosts don't have permission — proceed without user names
      }
    };

    load();
  }, [profile]);

  const monthStart = useMemo(() => monthStartFromValue(selectedMonth), [selectedMonth]);
  const daysInMonth = useMemo(
    () => new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate(),
    [monthStart],
  );
  const maxDayOffset = useMemo(() => Math.max(0, daysInMonth - DAYS_VISIBLE), [daysInMonth]);

  const rangeDays = useMemo(() => {
    const safeOffset = Math.min(dayOffset, maxDayOffset);
    const start = addDays(monthStart, safeOffset);
    const visibleDays = Math.min(DAYS_VISIBLE, daysInMonth - safeOffset);
    return Array.from({ length: visibleDays }, (_, index) => addDays(start, index));
  }, [monthStart, dayOffset, maxDayOffset, daysInMonth]);

  const monthOptions = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    return Array.from({ length: 18 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const value = toMonthValue(date);
      return { value, label: monthLabel(value) };
    });
  }, []);

  const blockedCount = useMemo(
    () => properties.reduce((sum, property) => sum + (property.blockedDates?.length || 0), 0),
    [properties],
  );

  const bookingByPropertyAndDay = useMemo(() => {
    const map = new Map<string, Booking>();
    bookings.forEach((booking) => {
      if (booking.status === 'cancelled') return;

      rangeDays.forEach((day) => {
        const iso = toISODate(day);
        if (isDateInRange(iso, booking.startDate, booking.endDate)) {
          map.set(`${booking.propertyId}:${iso}`, booking);
        }
      });
    });

    return map;
  }, [bookings, rangeDays]);

  const dayOccupancy = useMemo(() => {
    const stats = new Map<string, number>();

    rangeDays.forEach((day) => {
      const iso = toISODate(day);
      let occupied = 0;

      properties.forEach((property) => {
        if (bookingByPropertyAndDay.has(`${property.id}:${iso}`)) {
          occupied += 1;
        }
      });

      stats.set(iso, occupied);
    });

    return stats;
  }, [bookingByPropertyAndDay, properties, rangeDays]);

  const handleBlockDate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProperty || !blockDate) return;

    try {
      await addBlockedDate(selectedProperty, blockDate);

      setProperties((current) =>
        current.map((property) => {
          if (property.id !== selectedProperty) return property;
          const nextDates = new Set([...(property.blockedDates || []), blockDate]);
          return { ...property, blockedDates: Array.from(nextDates) };
        }),
      );

      setStatus('Дату заблоковано');
      setBlockDate('');
    } catch {
      setStatus('Не вдалося заблокувати дату.');
    } finally {
      setTimeout(() => setStatus(''), 2500);
    }
  };

  const upcomingBookings = useMemo(() => {
    const today = toISODate(new Date());
    return bookings
      .filter((b) => b.status !== 'cancelled' && b.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [bookings]);

  const handleUpdateStatus = async (bookingId: string, newStatus: Booking['status']) => {
    if (!profile?.uid) return;

    setUpdatingBookingId(bookingId);
    try {
      await updateBookingStatus(bookingId, newStatus);
      await syncCleaningTicketsForHost(profile.uid);
      setBookings((current) =>
        current.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)),
      );
      setSelectedCell((current) =>
        current ? { ...current, booking: { ...current.booking, status: newStatus } } : null,
      );
    } catch {
      setStatus('Не вдалося оновити статус. Спробуйте ще раз.');
      setTimeout(() => setStatus(''), 2500);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const openBookingDetail = (propertyTitle: string, booking: Booking) => {
    const guest = usersMap.get(booking.clientId);
    const nights = Math.max(1, daysBetween(toLocalDate(booking.startDate), toLocalDate(booking.endDate)));

    setSelectedCell({
      propertyTitle,
      booking,
      guestName: guest?.name || guest?.email || `Гість #${booking.clientId.slice(0, 6)}`,
      nights,
    });
  };

  if (loading) {
    return <p className="p-8 text-slate-500">Завантаження...</p>;
  }

  if (!profile || profile.role === 'client') {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Доступ заборонено</h1>
          <p className="mt-4 text-slate-600">Цей розділ доступний тільки для орендодавців.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <PageBanner
        title="Календар обʼєктів"
        actions={
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Місяць</label>
            <select
              value={selectedMonth}
              onChange={(event) => {
                setSelectedMonth(event.target.value);
                setDayOffset(0);
              }}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-400"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setSelectedMonth(toMonthValue(new Date()));
                const today = new Date();
                const offset = Math.max(0, today.getDate() - 1);
                setDayOffset(Math.min(offset, maxDayOffset));
              }}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-400"
            >
              Поточний місяць
            </button>
            <button
              type="button"
              onClick={() => setDayOffset((current) => Math.max(0, current - 7))}
              disabled={dayOffset === 0}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              -7 днів
            </button>
            <button
              type="button"
              onClick={() => setDayOffset((current) => Math.min(maxDayOffset, current + 7))}
              disabled={dayOffset >= maxDayOffset}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              +7 днів
            </button>
          </div>
        }
      />

      <div className="w-full px-3 py-5 sm:px-6 sm:py-8 lg:px-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.55fr_0.65fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-md sm:rounded-[2rem] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Календарна сітка</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">Рядки: обʼєкти, колонки: дати</h2>
              </div>
              <p className="text-sm text-slate-600">
                Період: {toISODate(rangeDays[0])} - {toISODate(rangeDays[rangeDays.length - 1])}
              </p>
            </div>

            <div className="mt-5 hidden overflow-x-auto pb-2 md:block">
              <div className="min-w-[980px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: `220px repeat(${rangeDays.length}, minmax(72px, 1fr))` }}>
                  <div className="sticky left-0 z-20 border-r border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    Номери
                  </div>
                  {rangeDays.map((day) => {
                    const iso = toISODate(day);
                    const isToday = iso === toISODate(new Date());

                    return (
                      <div key={iso} className={`border-r border-slate-200 px-1 py-2 text-center last:border-r-0 ${isToday ? 'bg-sky-50' : 'bg-slate-50'}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {new Intl.DateTimeFormat('uk-UA', { weekday: 'short' }).format(day)}
                        </p>
                        <p className={`mt-1 text-xs font-semibold ${isToday ? 'text-sky-800' : 'text-slate-800'}`}>
                          {new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit' }).format(day)}
                        </p>
                        <div className="mt-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-200 px-1 text-[11px] font-semibold text-slate-700">
                          {dayOccupancy.get(iso) || 0}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {properties.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-slate-500">Немає обʼєктів для календаря.</p>
                ) : (
                  properties.map((property) => (
                    <div
                      key={property.id}
                      className="grid border-b border-slate-200 last:border-b-0"
                      style={{ gridTemplateColumns: `220px repeat(${rangeDays.length}, minmax(72px, 1fr))` }}
                    >
                      <div className="sticky left-0 z-10 flex items-center border-r border-slate-200 bg-white px-4 py-3">
                        <p className="truncate text-sm font-semibold text-slate-800">{property.title}</p>
                      </div>

                      {rangeDays.map((day) => {
                        const iso = toISODate(day);
                        const booking = bookingByPropertyAndDay.get(`${property.id}:${iso}`);
                        const isBlocked = (property.blockedDates || []).includes(iso);

                        if (booking) {
                          return (
                            <button
                              key={`${property.id}:${iso}`}
                              type="button"
                              onClick={() => openBookingDetail(property.title, booking)}
                              className={`m-1 rounded-lg border px-2 py-2 text-left text-[11px] font-semibold transition hover:shadow-sm ${statusColor(booking.status)}`}
                              title="Натисніть для деталей"
                            >
                              <p className="truncate">{booking.status === 'confirmed' ? 'Зайнято' : 'Очікує'}</p>
                              <p className="mt-0.5 truncate text-[10px] opacity-80">{booking.startDate.slice(5)}-{booking.endDate.slice(5)}</p>
                            </button>
                          );
                        }

                        if (isBlocked) {
                          return (
                            <div key={`${property.id}:${iso}`} className="m-1 rounded-lg border border-rose-300 bg-rose-50 px-2 py-2 text-[11px] font-semibold text-rose-700">
                              Блок
                            </div>
                          );
                        }

                        return <div key={`${property.id}:${iso}`} className="m-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] text-slate-400">-</div>;
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3 md:hidden">
              {rangeDays.map((day) => {
                const iso = toISODate(day);
                const isToday = iso === toISODate(new Date());
                const dayBookings = properties.flatMap((property) => {
                  const booking = bookingByPropertyAndDay.get(`${property.id}:${iso}`);
                  if (!booking) return [];
                  return [{ propertyTitle: property.title, booking }];
                });

                return (
                  <article key={iso} className={`rounded-2xl border p-3 ${isToday ? 'border-sky-300 bg-sky-50/70' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(day)}
                      </p>
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-200 px-2 text-xs font-semibold text-slate-700">
                        {dayOccupancy.get(iso) || 0}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {dayBookings.length === 0 ? (
                        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">Усі обʼєкти вільні</p>
                      ) : (
                        dayBookings.map(({ propertyTitle, booking }) => (
                          <button
                            key={`${propertyTitle}:${booking.id || booking.startDate}`}
                            type="button"
                            onClick={() => openBookingDetail(propertyTitle, booking)}
                            className={`w-full rounded-xl border px-3 py-2 text-left ${statusColor(booking.status)}`}
                          >
                            <p className="truncate text-xs font-semibold">{propertyTitle}</p>
                            <p className="mt-1 text-[11px]">{booking.startDate} - {booking.endDate}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />Підтверджено</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" />Очікує</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-500" />Заблокована дата</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400" />Вільно</span>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-md sm:rounded-[2rem] sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Бронювання</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Найближчі броні</h2>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {upcomingBookings.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Активних бронювань немає.</p>
              ) : (
                upcomingBookings.map((booking) => {
                  const property = properties.find((p) => p.id === booking.propertyId);
                  const guest = usersMap.get(booking.clientId);
                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => openBookingDetail(property?.title ?? 'Обʼєкт', booking)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition hover:shadow-sm ${statusColor(booking.status)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-xs font-semibold">{property?.title ?? 'Обʼєкт'}</p>
                        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          booking.status === 'confirmed' ? 'bg-emerald-200 text-emerald-800' :
                          booking.status === 'pending' ? 'bg-amber-200 text-amber-800' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {booking.status === 'confirmed' ? 'Підтверджено' : booking.status === 'pending' ? 'Очікує' : 'Скасовано'}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] opacity-80">
                        {guest?.name || guest?.email || `Гість #${booking.clientId.slice(0, 6)}`}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium">
                        {booking.startDate} → {booking.endDate}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold">
                        {booking.totalPrice.toLocaleString('uk-UA')} грн
                      </p>
                    </button>
                  );
                })
              )}
            </div>

            <h2 className="pt-2 text-xl font-semibold text-slate-900 sm:text-2xl">Заблокувати дату</h2>
            <form onSubmit={handleBlockDate} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Обрати об'єкт</label>
                <select
                  value={selectedProperty}
                  onChange={(event) => setSelectedProperty(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                >
                  <option value="">Виберіть об'єкт</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Дата</label>
                <input
                  type="date"
                  value={blockDate}
                  onChange={(event) => setBlockDate(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                />
              </div>
              {status && <p className="text-sm text-sky-700">{status}</p>}
              <button
                type="submit"
                className="w-full rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Заблокувати дату
              </button>
            </form>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Поточні блокування</p>
                <span className="text-xs text-slate-500">{blockedCount}</span>
              </div>
              <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                {properties.flatMap((property) =>
                  property.blockedDates?.map((date) => (
                    <div key={`${property.id}-${date}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{property.title}</span> - {date}
                    </div>
                  )) ?? [],
                ).length === 0 ? (
                  <p className="text-slate-500">Ще немає заблокованих дат.</p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>

      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSelectedCell(null)}>
          <div
            className="w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Деталі бронювання</h3>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Закрити"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Обʼєкт</p>
                <p className="font-semibold text-slate-900">{selectedCell.propertyTitle}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Гість</p>
                <p className="font-semibold text-slate-900">{selectedCell.guestName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Заїзд</p>
                  <p className="font-semibold text-slate-900">{selectedCell.booking.startDate}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Виїзд</p>
                  <p className="font-semibold text-slate-900">{selectedCell.booking.endDate}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Ночей</p>
                  <p className="font-semibold text-slate-900">{selectedCell.nights}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Сума</p>
                  <p className="font-semibold text-slate-900">{selectedCell.booking.totalPrice.toLocaleString('uk-UA')} грн</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Статус</p>
                <p className={`font-semibold ${
                  selectedCell.booking.status === 'confirmed' ? 'text-emerald-700' :
                  selectedCell.booking.status === 'pending' ? 'text-amber-700' :
                  'text-slate-700'
                }`}>
                  {selectedCell.booking.status === 'confirmed' ? 'Підтверджено' :
                   selectedCell.booking.status === 'pending' ? 'Очікує підтвердження' :
                   'Скасовано'}
                </p>
              </div>

              {selectedCell.booking.status !== 'cancelled' && (
                <div className="flex gap-2 pt-1">
                  {selectedCell.booking.status === 'pending' && (
                    <button
                      type="button"
                      disabled={updatingBookingId === selectedCell.booking.id}
                      onClick={() => handleUpdateStatus(selectedCell.booking.id!, 'confirmed')}
                      className="flex-1 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {updatingBookingId === selectedCell.booking.id ? 'Зберігаєм...' : '✓ Підтвердити'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={updatingBookingId === selectedCell.booking.id}
                    onClick={() => handleUpdateStatus(selectedCell.booking.id!, 'cancelled')}
                    className="flex-1 rounded-full border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    ✕ Скасувати
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
