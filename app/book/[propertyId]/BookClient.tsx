'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '../../providers';
import { getPropertyById, type Property } from '../../../lib/properties';
import { createBooking } from '../../../lib/bookings';
import Link from 'next/link';

interface BookClientProps {
  propertyId: string;
}

export default function BookClient({ propertyId }: BookClientProps) {
  const router = useRouter();
  const { profile, loading } = useContext(AuthContext);
  const [property, setProperty] = useState<Property | null>(null);
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    guests: 1,
    phone: '',
    message: '',
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    const loadProperty = async () => {
      const result = await getPropertyById(propertyId);
      setProperty(result);
    };

    loadProperty();
  }, [propertyId]);

  const nights = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diff = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return diff;
  }, [form.startDate, form.endDate]);

  const totalPrice = useMemo(() => {
    if (!property) return 0;
    return nights * property.pricePerNight;
  }, [nights, property]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || !profile.uid || !property) {
      router.push('/login');
      return;
    }

    setStatus('Створюємо бронювання...');

    await createBooking({
      propertyId: property.id ?? '',
      clientId: profile.uid,
      hostId: property.hostId,
      startDate: form.startDate,
      endDate: form.endDate,
      totalPrice,
      status: 'pending',
    });

    setStatus('Бронювання створено. Найближчим часом хост підтвердить його.');
    setTimeout(() => router.push('/'), 2000);
  };

  if (!property) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="text-lg text-slate-500">Завантаження об’єкта...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:justify-between lg:items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Бронювання</p>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900">{property.title}</h1>
              <p className="mt-3 max-w-2xl text-slate-600">{property.description}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-500 shadow-sm">
              <p>Ціна за ніч</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{property.pricePerNight.toLocaleString('uk-UA')} грн</p>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
              {!profile && !loading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 text-slate-700">
                  Щоб забронювати, будь ласка, <Link href="/login" className="font-semibold text-slate-900 underline">увійдіть</Link> у систему.
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-slate-700">Дата заїзду</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Дата виїзду</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Гостей</label>
                  <input
                    type="number"
                    min={1}
                    value={form.guests}
                    onChange={(event) => setForm({ ...form, guests: Number(event.target.value) })}
                    className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Телефон</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Повідомлення хосту</label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Підтвердити бронювання за {totalPrice.toLocaleString('uk-UA')} грн
              </button>
              {status && <p className="text-sm text-slate-600">{status}</p>}
            </form>

            <aside className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Деталі об’єкта</p>
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Адреса</p>
                  <p className="text-base font-semibold text-slate-900">{property.address}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Кімнат</p>
                    <p className="font-semibold text-slate-900">{property.rooms}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Гостей</p>
                    <p className="font-semibold text-slate-900">{property.guests}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Зручності</p>
                  <p className="font-medium text-slate-900">{property.amenities?.join(', ') || 'Немає даних'}</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
