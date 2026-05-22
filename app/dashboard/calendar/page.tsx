'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../providers';
import { addBlockedDate, getHostProperties, Property } from '../../../lib/properties';
import { getHostBookings, Booking } from '../../../lib/bookings';
import { PageBanner } from '../../../components/PageBanner';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_VISIBLE = 14;

type CalendarBar = {
  id: string;
  startIndex: number;
  endIndex: number;
  label: string;
  status: Booking['status'];
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

function daysBetween(start: Date, end: Date): number {
  return Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS);
}

function bookingColor(status: Booking['status']): string {
  if (status === 'confirmed') return 'bg-emerald-500/85 border-emerald-300/70';
  if (status === 'pending') return 'bg-amber-500/80 border-amber-300/70';
  return 'bg-slate-600/70 border-slate-400/70';
}

export default function CalendarPage() {
  const { profile, loading } = useContext(AuthContext);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isMobileView, setIsMobileView] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [blockDate, setBlockDate] = useState('');
  const [status, setStatus] = useState('');
  const [rangeStart, setRangeStart] = useState<Date>(() => startOfDay(new Date()));

  useEffect(() => {
    const load = async () => {
      if (!profile?.uid) return;
      const [propertiesData, bookingsData] = await Promise.all([getHostProperties(profile.uid), getHostBookings(profile.uid)]);
      setProperties(propertiesData);
      setBookings(bookingsData);
      if (propertiesData.length > 0) {
        setSelectedProperty((current) => current || propertiesData[0].id || '');
      }
    };
    load();
  }, [profile]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobileView(media.matches);
    apply();

    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  const rangeDays = useMemo(
    () => Array.from({ length: DAYS_VISIBLE }, (_, index) => addDays(rangeStart, index)),
    [rangeStart],
  );

  const rangeEnd = useMemo(() => addDays(rangeStart, DAYS_VISIBLE - 1), [rangeStart]);

  const rows = useMemo(() => {
    return properties.map((property) => {
      const propertyBookings = bookings.filter((booking) => booking.propertyId === property.id && booking.status !== 'cancelled');
      const bars: CalendarBar[] = [];

      propertyBookings.forEach((booking) => {
        const start = toLocalDate(booking.startDate);
        const end = toLocalDate(booking.endDate);

        if (end < rangeStart || start > rangeEnd) {
          return;
        }

        const visibleStart = start < rangeStart ? rangeStart : start;
        const visibleEnd = end > rangeEnd ? rangeEnd : end;
        const startIndex = Math.max(0, daysBetween(rangeStart, visibleStart));
        const endIndex = Math.min(DAYS_VISIBLE - 1, daysBetween(rangeStart, visibleEnd));

        bars.push({
          id: booking.id || `${booking.propertyId}-${booking.startDate}-${booking.endDate}`,
          startIndex,
          endIndex,
          label: `${booking.startDate} - ${booking.endDate}`,
          status: booking.status,
        });
      });

      const blockedIndices = (property.blockedDates || [])
        .map((date) => daysBetween(rangeStart, toLocalDate(date)))
        .filter((index) => index >= 0 && index < DAYS_VISIBLE);

      return {
        id: property.id || property.title,
        title: property.title,
        bars,
        blockedIndices,
      };
    });
  }, [bookings, properties, rangeEnd, rangeStart]);

  const blockedCount = useMemo(
    () => properties.reduce((sum, property) => sum + (property.blockedDates?.length || 0), 0),
    [properties],
  );

  const handleBlockDate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProperty || !blockDate) return;
    await addBlockedDate(selectedProperty, blockDate);
    setProperties((current) =>
      current.map((property) => {
        if (property.id !== selectedProperty) return property;
        const nextDates = new Set([...(property.blockedDates || []), blockDate]);
        return { ...property, blockedDates: Array.from(nextDates) };
      }),
    );
    setStatus('Обрану дату заблоковано');
    setBlockDate('');
    setTimeout(() => setStatus(''), 2000);
  };

  if (loading) {
    return <p className="p-8 text-slate-300">Завантаження...</p>;
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
        title="Календар бронювань"
        actions={
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => setRangeStart((current) => addDays(current, -7))}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-400"
            >
              -7 днів
            </button>
            <button
              type="button"
              onClick={() => setRangeStart(startOfDay(new Date()))}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-400"
            >
              Сьогодні
            </button>
            <button
              type="button"
              onClick={() => setRangeStart((current) => addDays(current, 7))}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-400"
            >
              +7 днів
            </button>
          </div>
        }
      />

      <div className="w-full px-3 py-5 sm:px-6 sm:py-8 lg:px-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.5fr_0.7fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-md sm:rounded-[2rem] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Діаграма бронювань</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">Об'єкти зліва, дати зверху</h2>
              </div>
              <p className="text-sm text-slate-600">
                Період: {toISODate(rangeStart)} - {toISODate(rangeEnd)}
              </p>
            </div>

            {isMobileView ? (
              <div className="mt-5 space-y-3">
                {rows.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Додайте об'єкти, щоб бачити завантаження в календарі.
                  </p>
                ) : (
                  rows.map((row) => {
                    const propertyBookings = bookings
                      .filter((booking) => booking.propertyId === row.id && booking.status !== 'cancelled')
                      .slice(0, 4);

                    return (
                      <article key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="truncate text-sm font-semibold text-slate-900">{row.title}</p>
                        <div className="mt-3 space-y-2">
                          {propertyBookings.length === 0 ? (
                            <p className="text-xs text-slate-500">Немає бронювань у поточному періоді.</p>
                          ) : (
                            propertyBookings.map((booking) => (
                              <div key={booking.id} className={`rounded-xl border px-3 py-2 text-xs text-white ${bookingColor(booking.status)}`}>
                                <p className="font-semibold">{booking.status}</p>
                                <p className="mt-1 opacity-90">{booking.startDate} - {booking.endDate}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <p className="mt-3 text-xs text-slate-500">Заблоковано дат: {row.blockedIndices.length}</p>
                      </article>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto pb-2">
                <div className="min-w-[980px] rounded-2xl border border-slate-200 bg-slate-50">
                  <div
                    className="grid border-b border-slate-200"
                    style={{ gridTemplateColumns: `220px repeat(${DAYS_VISIBLE}, minmax(50px, 1fr))` }}
                  >
                    <div className="sticky left-0 z-20 border-r border-slate-200 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-700">
                      Об'єкт
                    </div>
                    {rangeDays.map((day) => {
                      const isToday = toISODate(day) === toISODate(new Date());

                      return (
                      <div key={day.toISOString()} className={`border-r border-slate-200 px-2 py-3 text-center last:border-r-0 ${isToday ? 'bg-sky-50' : ''}`}>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          {new Intl.DateTimeFormat('uk-UA', { weekday: 'short' }).format(day)}
                        </p>
                        <p className={`mt-1 text-xs font-semibold ${isToday ? 'text-sky-700' : 'text-slate-800'}`}>
                          {new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit' }).format(day)}
                        </p>
                      </div>
                    )})}
                  </div>

                  {rows.length === 0 ? (
                    <p className="px-4 py-8 text-sm text-slate-500">Додайте об'єкти, щоб бачити завантаження в календарі.</p>
                  ) : (
                    rows.map((row) => (
                      <div
                        key={row.id}
                        className="grid border-b border-slate-200 last:border-b-0"
                        style={{ gridTemplateColumns: `220px repeat(${DAYS_VISIBLE}, minmax(50px, 1fr))` }}
                      >
                        <div className="sticky left-0 z-10 flex items-center border-r border-slate-200 bg-white/95 px-4 py-4">
                          <p className="line-clamp-2 text-sm text-slate-700">{row.title}</p>
                        </div>

                        <div className="relative h-16" style={{ gridColumn: `2 / span ${DAYS_VISIBLE}` }}>
                          <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${DAYS_VISIBLE}, minmax(50px, 1fr))` }}>
                            {rangeDays.map((day) => (
                              <div key={`${row.id}-${day.toISOString()}-bg`} className="border-r border-slate-200 last:border-r-0" />
                            ))}
                          </div>

                          <div className="pointer-events-none absolute inset-0 grid px-1 py-2" style={{ gridTemplateColumns: `repeat(${DAYS_VISIBLE}, minmax(50px, 1fr))` }}>
                            {row.bars.map((bar) => (
                              <div
                                key={bar.id}
                                style={{ gridColumn: `${bar.startIndex + 1} / ${bar.endIndex + 2}` }}
                                className={`flex items-center truncate rounded-xl border px-2 text-[11px] font-semibold text-white ${bookingColor(bar.status)}`}
                                title={bar.label}
                              >
                                {bar.status}
                              </div>
                            ))}
                          </div>

                          <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${DAYS_VISIBLE}, minmax(50px, 1fr))` }}>
                            {row.blockedIndices.map((index) => (
                              <div key={`${row.id}-blocked-${index}`} style={{ gridColumn: `${index + 1}` }} className="flex items-center justify-center">
                                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" title="Заблокована дата" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />Підтверджено</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" />Очікує</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-500" />Заблокована дата</span>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-md sm:rounded-[2rem] sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Заблокувати дату</h2>
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
    </main>
  );
}
