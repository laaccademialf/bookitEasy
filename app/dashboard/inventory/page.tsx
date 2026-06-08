'use client';

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../providers';
import { getHostProperties, type Property } from '../../../lib/properties';

export default function InventoryPage() {
  const { profile, loading } = useContext(AuthContext);
  const [properties, setProperties] = useState<Property[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState('');

  const loadProperties = async (hostId: string) => {
    const data = await getHostProperties(hostId);
    setProperties(data);
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!profile?.uid || (profile.role !== 'host' && profile.role !== 'admin')) return;

      setSyncing(true);
      setStatus('');

      try {
        await loadProperties(profile.uid);
      } catch {
        setStatus('Не вдалося синхронізувати обʼєкти для інвентаризації.');
      } finally {
        setSyncing(false);
      }
    };

    bootstrap();
  }, [profile]);

  const handleSync = async () => {
    if (!profile?.uid) return;

    setSyncing(true);
    setStatus('');

    try {
      await loadProperties(profile.uid);
      setStatus('Інвентаризацію синхронізовано з вашими обʼєктами.');
    } catch {
      setStatus('Не вдалося синхронізувати обʼєкти для інвентаризації.');
    } finally {
      setSyncing(false);
      setTimeout(() => setStatus(''), 2500);
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
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Інвентаризація</h1>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Блок синхронізований з вашими обʼєктами. Виберіть обʼєкт для подальшого обліку інвентарю.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? 'Синхронізація...' : 'Синхронізувати обʼєкти'}
          </button>
        </div>

        {status ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {status}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Знайдено обʼєктів: <span className="font-semibold text-slate-900">{properties.length}</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {properties.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Поки немає обʼєктів для інвентаризації. Додайте обʼєкт у розділі «Мої обʼєкти».
            </p>
          ) : (
            properties.map((property) => (
              <article key={property.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">{property.title}</p>
                <p className="mt-1 text-xs text-slate-600">{property.address || 'Адресу не вказано'}</p>
                <p className="mt-3 text-xs text-slate-500">
                  Кімнат: {property.rooms} • Гостей: {property.guests}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
