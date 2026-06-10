'use client';

import { useEffect, useState } from 'react';
import { Calendar, MapPin, Briefcase } from 'lucide-react';
import { getClientBookings } from '../lib/bookings';
import { getPropertyById } from '../lib/properties';
import type { Booking } from '../lib/bookings';
import type { Property } from '../lib/properties';

interface BookingWithProperty extends Booking {
  property?: Property;
}

export function ActiveBookings({ clientId }: { clientId: string }) {
  const [bookings, setBookings] = useState<BookingWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        console.log('🔍 Завантаження бронювань для clientId:', clientId);
        const clientBookings = await getClientBookings(clientId);
        console.log('📊 Всього бронювань:', clientBookings);
        
        // Фільтруємо активні бронювання (усі крім скасованих)
        const activeBookings = clientBookings.filter(
          (booking) => booking.status !== 'cancelled'
        );
        console.log('✅ Активних бронювань:', activeBookings);

        // Завантажуємо деталі власності для кожного бронювання
        const bookingsWithProperties = await Promise.all(
          activeBookings.map(async (booking) => {
            const property = await getPropertyById(booking.propertyId);
            return { ...booking, property: property || undefined };
          })
        );

        // Сортуємо за датою заїзду
        bookingsWithProperties.sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );

        console.log('✨ Бронювання з деталями:', bookingsWithProperties);
        setBookings(bookingsWithProperties);
      } catch (error) {
        console.error('❌ Помилка при завантаженні бронювань:', error);
        setError('Не вдалося завантажити бронювання');
      } finally {
        setLoading(false);
      }
    };

    if (!clientId) {
      console.warn('⚠️ clientId не визначений');
      setLoading(false);
      return;
    }

    loadBookings();
  }, [clientId]);

  if (loading) {
    return <p className="text-slate-600">Завантаження бронювань...</p>;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-slate-600">У вас немає активних бронювань</p>
      </div>
    );
  }

  const calculateDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {bookings.map((booking) => {
        const daysCount = calculateDays(booking.startDate, booking.endDate);
        
        return (
          <div
            key={booking.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-400 hover:shadow-md sm:p-6"
          >
            {/* Заголовок з назвою власності */}
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                    {booking.property?.title || 'Об\'єкт'}
                  </h3>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    booking.status === 'confirmed' 
                      ? 'bg-green-50 text-green-700' 
                      : booking.status === 'pending'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {booking.status === 'confirmed' ? '✓ Підтверджено' : booking.status === 'pending' ? '⏳ На розгляді' : 'Скасовано'}
                  </span>
                </div>
                {booking.property?.address && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4" />
                    {booking.property.address}
                  </p>
                )}
              </div>
            </div>

            {/* Основна інформація про бронювання */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Дата заїзду */}
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Заїзд</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-900">
                  <Calendar className="h-4 w-4 text-sky-600" />
                  {formatDate(booking.startDate)}
                </p>
              </div>

              {/* Кількість діб */}
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Тривалість</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {daysCount} {daysCount === 1 ? 'доба' : daysCount < 5 ? 'доби' : 'діб'}
                </p>
              </div>

              {/* Дата виїзду */}
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Виїзд</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-900">
                  <Calendar className="h-4 w-4 text-sky-600" />
                  {formatDate(booking.endDate)}
                </p>
              </div>

              {/* Вартість */}
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Сума</p>
                <p className="mt-1 text-sm font-medium text-sky-600">
                  {booking.totalPrice.toLocaleString('uk-UA')} ₴
                </p>
              </div>
            </div>

            {/* Додаткові послуги */}
            {booking.selectedServices && booking.selectedServices.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Briefcase className="h-4 w-4" />
                  Додаткові послуги:
                </p>
                <ul className="space-y-1">
                  {booking.selectedServices.map((service, index) => (
                    <li key={index} className="text-sm text-slate-600">
                      • {service}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Додаткові опції */}
            {(booking.earlyCheckIn || booking.lateCheckOut) && (
              <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                {booking.earlyCheckIn && (
                  <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                    Ранній заїзд (09:00)
                  </span>
                )}
                {booking.lateCheckOut && (
                  <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                    Пізній виїзд (15:00)
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
