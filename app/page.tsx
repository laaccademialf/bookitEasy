'use client';

import { useContext, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { getPublicProperties, type Property } from '../lib/properties';
import { getClientBookings, type Booking } from '../lib/bookings';
import { AuthContext } from './providers';

export default function Home() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useContext(AuthContext);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (profile?.role === 'admin') {
      router.replace('/admin');
      return;
    }

    const load = async () => {
      try {
        const [propertiesData, bookingsData] = await Promise.all([
          getPublicProperties(),
          user?.uid ? getClientBookings(user.uid) : Promise.resolve([]),
        ]);

        setProperties(propertiesData);
        setBookings(bookingsData);
      } catch (error) {
        setLoadError('Не вдалося завантажити об’єкти. Перевірте доступ до бази даних.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, profile, router, user]);

  const activeBookings = bookings.filter((booking) => booking.status !== 'cancelled');

  function formatDate(value: string) {
    if (!value || value.length < 10) return value;
    return `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}`;
  }

  if (authLoading || profile?.role === 'admin') {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
            Перехід до адмін-панелі...
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        {user && profile?.role !== 'admin' && (
          <div className="mb-10 rounded-[2rem] border border-sky-200 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Мої бронювання</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-900">Активні бронювання</h2>
              </div>
              <span className="rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                {activeBookings.length}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeBookings.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                  У вас ще немає активних бронювань.
                </div>
              ) : (
                activeBookings.map((booking) => {
                  const property = properties.find((item) => item.id === booking.propertyId);
                  return (
                    <div key={booking.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm uppercase tracking-[0.22em] text-slate-500">
                            {booking.status === 'confirmed' ? 'Підтверджено' : 'Очікує підтвердження'}
                          </p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-900">
                            {property?.title || 'Обʼєкт'}
                          </h3>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {booking.status === 'confirmed' ? 'Активне' : 'В обробці'}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-slate-700">
                        <p>Заїзд: <span className="font-semibold">{formatDate(booking.startDate)}</span></p>
                        <p>Виїзд: <span className="font-semibold">{formatDate(booking.endDate)}</span></p>
                        <p>Сума: <span className="font-semibold">{booking.totalPrice.toLocaleString('uk-UA')} грн</span></p>
                      </div>

                      <div className="mt-5">
                        <Link
                          href={`/book/${booking.propertyId}`}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Відкрити обʼєкт
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Найкращі об’єкти</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Оберіть об’єкт для бронювання</h2>
          <span className="mt-4 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">Усього {properties.length} об’єктів</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              Завантаження об’єктів...
            </div>
          ) : loadError ? (
            <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 shadow-sm">
              {loadError}
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              Об’єктів поки немає.
            </div>
          ) : (
            properties.map((property) => (
              <motion.article
                key={property.id}
                whileHover={{ y: -6 }}
                className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-xl"
              >
                <div className="relative h-48 overflow-hidden rounded-[1.75rem] bg-slate-100">
                    {property.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9.75L12 3l9 6.75V21H3V9.75z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 21V12h6v9" /></svg>
                      </div>
                    )}
                  </div>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{property.address}</p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-900">{property.title}</h3>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{property.pricePerNight.toLocaleString('uk-UA')} грн</p>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{property.description}</p>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                    <span>{property.rooms} кімнати</span>
                    <span>{property.guests} гостей</span>
                  </div>
                  <Link
                    href={`/book/${property.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Бронювати зараз
                  </Link>
                </div>
              </motion.article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
