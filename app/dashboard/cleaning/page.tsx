'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../providers';
import { getHostProperties, type Property } from '../../../lib/properties';
import {
  getHostCleaningTickets,
  syncCleaningTicketsForHost,
  updateCleaningTicketStatus,
  type CleaningTicket,
} from '../../../lib/cleaning';
import { PageBanner } from '../../../components/PageBanner';

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('uk-UA', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
}

const typeLabel: Record<CleaningTicket['type'], string> = {
  pre_checkin: 'Перед заїздом',
  post_checkout: 'Після виїзду',
};

export default function CleaningPage() {
  const { profile, loading } = useContext(AuthContext);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tickets, setTickets] = useState<CleaningTicket[]>([]);
  const [status, setStatus] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const propertyTitleMap = useMemo(
    () => new Map(properties.map((property) => [property.id, property.title])),
    [properties],
  );

  const loadData = async (hostId: string) => {
    const [propsData, ticketsData] = await Promise.all([
      getHostProperties(hostId),
      getHostCleaningTickets(hostId),
    ]);
    setProperties(propsData);
    setTickets(ticketsData);
  };

  useEffect(() => {
    const load = async () => {
      if (!profile?.uid) return;

      setSyncing(true);
      try {
        await syncCleaningTicketsForHost(profile.uid);
        await loadData(profile.uid);
      } catch {
        setStatus('Не вдалося завантажити задачі прибирання.');
      } finally {
        setSyncing(false);
      }
    };

    load();
  }, [profile]);

  const openTickets = tickets.filter((ticket) => ticket.status === 'open');
  const doneTickets = tickets.filter((ticket) => ticket.status === 'done');

  const handleSync = async () => {
    if (!profile?.uid) return;

    setSyncing(true);
    setStatus('');

    try {
      await syncCleaningTicketsForHost(profile.uid);
      await loadData(profile.uid);
      setStatus('Тікети синхронізовано з календарем та бронюваннями.');
    } catch (error: any) {
      const message = error?.message ? String(error.message) : 'Не вдалося синхронізувати тікети. Спробуйте ще раз.';
      setStatus(message);
    } finally {
      setSyncing(false);
      setTimeout(() => setStatus(''), 2500);
    }
  };

  const handleToggleTicket = async (ticket: CleaningTicket, statusNext: CleaningTicket['status']) => {
    setUpdatingId(ticket.id);
    try {
      await updateCleaningTicketStatus(ticket.id, statusNext);
      setTickets((current) => current.map((item) => (item.id === ticket.id ? { ...item, status: statusNext } : item)));
    } catch {
      setStatus('Не вдалося оновити статус тікета.');
      setTimeout(() => setStatus(''), 2500);
    } finally {
      setUpdatingId(null);
    }
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
        title="Прибирання"
        actions={
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? 'Синхронізація...' : 'Синхронізувати'}
          </button>
        }
      />

      <div className="w-full px-3 py-5 sm:px-6 sm:py-8 lg:px-6">
        {status ? (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {status}
          </div>
        ) : null}

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-md sm:rounded-[2rem] sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900">Активні тікети</h2>
            <p className="mt-1 text-sm text-slate-600">Автоматично створюються перед заїздом та після виїзду гостей.</p>
            <div className="mt-4 space-y-3">
              {openTickets.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Активних тікетів немає.</p>
              ) : (
                openTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{propertyTitleMap.get(ticket.propertyId) || 'Обʼєкт'}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Відкрито</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{typeLabel[ticket.type]} • {formatDate(ticket.date)}</p>
                    <button
                      type="button"
                      disabled={updatingId === ticket.id}
                      onClick={() => handleToggleTicket(ticket, 'done')}
                      className="mt-3 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingId === ticket.id ? 'Оновлення...' : 'Позначити виконаним'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-md sm:rounded-[2rem] sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900">Виконані</h2>
            <div className="mt-4 space-y-3">
              {doneTickets.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Поки немає виконаних тікетів.</p>
              ) : (
                doneTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{propertyTitleMap.get(ticket.propertyId) || 'Обʼєкт'}</p>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Виконано</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{typeLabel[ticket.type]} • {formatDate(ticket.date)}</p>
                    <button
                      type="button"
                      disabled={updatingId === ticket.id}
                      onClick={() => handleToggleTicket(ticket, 'open')}
                      className="mt-3 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingId === ticket.id ? 'Оновлення...' : 'Повернути в активні'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
