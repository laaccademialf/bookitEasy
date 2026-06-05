'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';

const BASE_PRICE_PER_NIGHT = 5000;

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
    details: '1000 грн',
    price: 1000,
    chargeType: 'fixed',
  },
  {
    id: 'late-check-out',
    label: 'Пізній виїзд',
    details: '800 грн',
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

export default function BookingPage() {
  const params = useParams<{ id: string }>();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [comment, setComment] = useState('');

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

  const stayTotal = nights * BASE_PRICE_PER_NIGHT;
  const totalToPay = stayTotal + extrasTotal;

  const propertyName = `Об'єкт #${params.id}`;

  const toggleService = (serviceId: string) => {
    setSelectedServices((current) => {
      if (current.includes(serviceId)) {
        return current.filter((id) => id !== serviceId);
      }

      return [...current, serviceId];
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8 lg:p-10">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Бронювання</p>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{propertyName}</h1>
          </div>
          <div className="rounded-2xl bg-slate-100 px-5 py-4">
            <p className="text-sm text-slate-500">Базова ціна за ніч</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {BASE_PRICE_PER_NIGHT.toLocaleString('uk-UA')} грн
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Оберіть дати проживання</h2>
              <p className="mt-1 text-sm text-slate-600">Виберіть дату заїзду та виїзду на календарі.</p>
              <div className="mt-4 overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  disabled={{ before: new Date() }}
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
              className="mt-7 w-full rounded-full bg-emerald-400 px-6 py-4 text-base font-bold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={nights === 0}
            >
              Підтвердити бронювання
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}
