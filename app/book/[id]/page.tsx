'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DayPicker, type DateRange } from 'react-day-picker';
import { uk } from 'date-fns/locale';
import 'react-day-picker/style.css';
import { getPropertyById, type Property } from '../../../lib/properties';
import { createBooking, getClientBookings, getPropertyBookings, type Booking } from '../../../lib/bookings';
import { AuthContext } from '../../providers';

type UpsellService = {
  id: string;
  label: string;
  details: string;
  price: number;
  chargeType: 'perDay' | 'fixed';
};

const UPSELL_SERVICES: UpsellService[] = [
  {
    id: 'early-check-in',
    label: 'Ранній заїзд',
    details: '1000 грн (з 09:00)',
    price: 1000,
    chargeType: 'fixed',
  },
  {
    id: 'late-check-out',
    label: 'Пізній виїзд',
    details: '800 грн (до 15:00)',
    price: 800,
    chargeType: 'fixed',
  },
  {
    id: 'cleaning',
    label: 'Додаткове прибирання',
    details: '400 грн/день',
    price: 400,
    chargeType: 'perDay',
  },
];

function startOfDayUtc(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseIsoLocal(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIsoLocal(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function expandDates(startIso: string, endIso: string): Date[] {
  const start = parseIsoLocal(startIso);
  const end = parseIsoLocal(endIso);
  const current = new Date(start);
  const dates: Date[] = [];

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export default function BookingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, loading: authLoading } = useContext(AuthContext);
  const [property, setProperty] = useState<Property | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(true);
  const [propertyBookings, setPropertyBookings] = useState<Booking[]>([]);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!params.id) {
      setPropertyLoading(false);
      return;
    }

    getPropertyById(params.id)
      .then((propertyData) => {
        setProperty(propertyData);
      })
      .finally(() => {
        setPropertyLoading(false);
      });
  }, [params.id]);

  useEffect(() => {
    if (!params.id) {
      setPropertyBookings([]);
      return;
    }

    let isActive = true;

    const loadBookings = async () => {
      try {
        const allByProperty = await getPropertyBookings(params.id);
        if (!isActive) return;
        setPropertyBookings(allByProperty);
        return;
      } catch {
        // Non-host clients may not have permission to read all bookings for property.
      }

      if (!user) {
        if (!isActive) return;
        setPropertyBookings([]);
        return;
      }

      try {
        const mine = await getClientBookings(user.uid);
        if (!isActive) return;
        setPropertyBookings(mine.filter((booking) => booking.propertyId === params.id));
      } catch {
        if (!isActive) return;
        setPropertyBookings([]);
      }
    };

    loadBookings();

    return () => {
      isActive = false;
    };
  }, [params.id, user]);

  useEffect(() => {
    const bookingDates = propertyBookings
      .filter((booking) => booking.status !== 'cancelled')
      .flatMap((booking) => expandDates(booking.startDate, booking.endDate));

    const blockedDates = (property?.blockedDates || []).map((date) => parseIsoLocal(date));
    setBookedDates([...bookingDates, ...blockedDates]);
  }, [propertyBookings, property]);

  const nights = useMemo(() => {
    const from = dateRange?.from;
    const to = dateRange?.to;

    if (!from || !to) {
      return 0;
    }

    const millisecondsInDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.round((startOfDayUtc(to) - startOfDayUtc(from)) / millisecondsInDay));
  }, [dateRange]);

  const extrasTotal = useMemo(() => {
    return UPSELL_SERVICES.reduce((total, service) => {
      if (!selectedServices.includes(service.id)) {
        return total;
      }

      if (service.chargeType === 'perDay') {
        return total + service.price * nights;
      }

      return total + service.price;
    }, 0);
  }, [nights, selectedServices]);

  const pricePerNight = property?.pricePerNight ?? 0;
  const stayTotal = nights * pricePerNight;
  const totalToPay = stayTotal + extrasTotal;

  const myBookings = useMemo(() => {
    if (!user) return [];
    return propertyBookings
      .filter((booking) => booking.clientId === user.uid && booking.status !== 'cancelled')
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [propertyBookings, user]);

  const toggleService = (serviceId: string) => {
    setSelectedServices((current) => {
      if (current.includes(serviceId)) {
        return current.filter((id) => id !== serviceId);
      }

      return [...current, serviceId];
    });
  };

  const handleConfirmBooking = async () => {
    if (!property || !dateRange?.from || !dateRange?.to || nights <= 0) return;

    if (!user) {
      router.push(`/login?redirect=/book/${params.id}`);
      return;
    }

    setSubmitting(true);
    setStatus('');

    try {
      const startDate = toIsoLocal(dateRange.from);
      const endDate = toIsoLocal(dateRange.to);

      const bookingPayload: Omit<Booking, 'id' | 'createdAt'> = {
        propertyId: params.id,
        clientId: user.uid,
        hostId: property.hostId,
        startDate,
        endDate,
        totalPrice: totalToPay,
        status: 'pending',
      };

      await createBooking(bookingPayload);

      setPropertyBookings((current) => [...current, bookingPayload]);
      setDateRange(undefined);
      setSelectedServices([]);
      setComment('');
      setStatus('Бронювання надіслано. Ці дати заблоковано для інших клієнтів.');
    } catch {
      setStatus('Не вдалося підтвердити бронювання. Спробуйте ще раз.');
    } finally {
      setSubmitting(false);
    }
  };

  if (propertyLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-xl">
          Завантаження об&apos;єкта...
        </div>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-rose-200 bg-rose-50 p-10 text-center text-rose-700 shadow-xl">
          Об&apos;єкт не знайдено.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8 lg:p-10">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Бронювання</p>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{property.title}</h1>
            {property.description ? (
              <p className="mt-2 text-sm text-slate-600">{property.description}</p>
            ) : null}
          </div>
          <div className="rounded-2xl bg-slate-100 px-5 py-4">
            <p className="text-sm text-slate-500">Базова ціна за ніч</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {pricePerNight.toLocaleString('uk-UA')} грн
            </p>
          </div>
        </div>

        {property.images && property.images.length > 0 && (
          <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
            {property.images.map((url, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={url}
                alt={`${property.title} — фото ${index + 1}`}
                className="h-52 w-auto flex-shrink-0 rounded-2xl object-cover first:h-64 first:w-full first:flex-shrink-0 sm:first:h-72"
                loading="lazy"
              />
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Оберіть дати проживання</h2>
              <p className="mt-1 text-sm text-slate-600">Виберіть дату заїзду та виїзду на календарі.</p>
              <style>{`
                .rdp-day[data-booked="true"] .rdp-day_button {
                  background-color: #f1f5f9;
                  color: #94a3b8;
                  cursor: not-allowed;
                  text-decoration: line-through;
                  opacity: 0.6;
                }
              `}</style>
              <div className="mt-4 overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
                <DayPicker
                  mode="range"
                  locale={uk}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  disabled={[
                    { before: new Date() },
                    ...bookedDates,
                  ]}
                  modifiers={{ booked: bookedDates }}
                  modifiersClassNames={{ booked: 'rdp-day--booked' }}
                  modifiersStyles={{
                    booked: {
                      backgroundColor: '#f1f5f9',
                      color: '#94a3b8',
                      textDecoration: 'line-through',
                      opacity: 0.6,
                      cursor: 'not-allowed',
                    },
                  }}
                  weekStartsOn={1}
                  className="mx-auto"
                />
              </div>
              <p className="mt-4 text-sm text-slate-700">
                Ночей: <span className="font-semibold">{nights}</span>
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Додаткові послуги</h2>
              <p className="mt-1 text-sm text-slate-600">Обирайте послуги, щоб підвищити комфорт проживання.</p>
              <div className="mt-4 space-y-3">
                {UPSELL_SERVICES.map((service) => (
                  <label
                    key={service.id}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-slate-900"
                    />
                    <span>
                      <span className="block font-medium text-slate-900">{service.label}</span>
                      <span className="text-sm text-slate-600">{service.details}</span>
                    </span>
                  </label>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Коментар</h2>
              <p className="mt-1 text-sm text-slate-600">Додайте побажання до бронювання для хоста.</p>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                placeholder="Наприклад: заїзд після 20:00, потрібне дитяче ліжечко"
                className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500"
              />
            </article>

            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Ваші бронювання цього обʼєкта</h2>
              <div className="mt-3 space-y-2">
                {myBookings.length === 0 ? (
                  <p className="text-sm text-slate-500">У вас ще немає активних бронювань цього обʼєкта.</p>
                ) : (
                  myBookings.map((booking) => (
                    <div
                      key={`${booking.startDate}-${booking.endDate}-${booking.totalPrice}`}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          {booking.startDate} → {booking.endDate}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          booking.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {booking.status === 'confirmed' ? 'Підтверджено' : 'Очікує підтвердження'}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">Сума: {booking.totalPrice.toLocaleString('uk-UA')} грн</p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-lg">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Рахунок</p>
            <h2 className="mt-3 text-2xl font-semibold">Разом до сплати</h2>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Проживання ({nights} ночей)</span>
                <span>{stayTotal.toLocaleString('uk-UA')} грн</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Додаткові послуги</span>
                <span>{extrasTotal.toLocaleString('uk-UA')} грн</span>
              </div>
              <div className="h-px bg-slate-700" />
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Разом</span>
                <span>{totalToPay.toLocaleString('uk-UA')} грн</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmBooking}
              className="mt-7 w-full rounded-full bg-emerald-400 px-6 py-4 text-base font-bold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={nights === 0 || submitting || authLoading}
            >
              {submitting
                ? 'Підтвердження...'
                : `Підтвердити бронювання — ${totalToPay.toLocaleString('uk-UA')} грн`}
            </button>
            {status ? <p className="mt-3 text-sm text-slate-300">{status}</p> : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
