'use client';

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../providers';
import { addBlockedDate, getHostProperties, Property } from '../../../lib/properties';
import { getHostBookings, Booking } from '../../../lib/bookings';

export default function CalendarPage() {
  const { profile, loading } = useContext(AuthContext);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [blockDate, setBlockDate] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!profile?.uid) return;
      const [propertiesData, bookingsData] = await Promise.all([
        getHostProperties(profile.uid),
        getHostBookings(profile.uid),
      ]);
      setProperties(propertiesData);
      setBookings(bookingsData);
    };
    load();
  }, [profile]);

  const handleBlockDate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProperty || !blockDate) return;
    await addBlockedDate(selectedProperty, blockDate);
    setStatus('Обрану дату заблоковано');
    setBlockDate('');
    setTimeout(() => setStatus(''), 2000);
  };

  if (loading) {
    return <p className="p-8 text-slate-300">Завантаження...</p>;
  }

  if (!profile || profile.role === 'client') {
    return (
      <main className="min-h-screen bg-[#070c18] text-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold">Доступ заборонено</h1>
          <p className="mt-4 text-slate-400">Цей розділ доступний тільки для орендодавців.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070c18] text-slate-100">
      <PageBanner title="Календар" variant="dark" />
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-2xl font-semibold text-white">Графік бронювань</h2>
            <div className="mt-6 space-y-4">
              {bookings.length === 0 ? (
                <p className="text-slate-400">Немає актуальних бронювань. Вони з’являться після підтвердження.</p>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">{booking.propertyId}</p>
                        <p className="text-sm text-slate-400">{booking.startDate} — {booking.endDate}</p>
                      </div>
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">{booking.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-2xl font-semibold text-white">Заблокувати дату</h2>
            <form onSubmit={handleBlockDate} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Обрати об’єкт</label>
                <select
                  value={selectedProperty}
                  onChange={(event) => setSelectedProperty(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                >
                  <option value="">Виберіть об’єкт</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Дата</label>
                <input
                  type="date"
                  value={blockDate}
                  onChange={(event) => setBlockDate(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                />
              </div>
              {status && <p className="text-sm text-sky-300">{status}</p>}
              <button
                type="submit"
                className="w-full rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Заблокувати дату
              </button>
            </form>

            <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Поточні блокування</p>
              <div className="mt-4 space-y-3">
                {properties.flatMap((property) =>
                  property.blockedDates?.map((date) => (
                    <div key={`${property.id}-${date}`} className="rounded-2xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                      <span className="font-semibold text-white">{property.title}</span> — {date}
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
