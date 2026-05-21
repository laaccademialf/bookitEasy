'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHostProfileByUsername } from '../../../lib/auth';
import { getHostProperties, Property } from '../../../lib/properties';

interface HostPageProps {
  params: {
    username: string;
  };
}

export default function HostPage({ params }: HostPageProps) {
  const [host, setHost] = useState<{ name: string; hostUsername: string } | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHost = async () => {
      setLoading(true);
      const profile = await getHostProfileByUsername(params.username);
      if (profile) {
        setHost({ name: profile.name, hostUsername: profile.hostUsername || params.username });
        setProperties(await getHostProperties(profile.uid));
      }
      setLoading(false);
    };

    loadHost();
  }, [params.username]);

  if (loading) {
    return <p className="p-8 text-slate-300">Завантаження...</p>;
  }

  if (!host) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Хост не знайдено</h1>
          <p className="mt-4 text-slate-600">Перевірте правильність посилання або зверніться до хоста.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        <div className="mb-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-sky-500">Персональна сторінка хоста</p>
          <h1 className="text-4xl font-semibold text-slate-900">{host.name}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Це whitelabel-сторінка для показу тільки об’єктів конкретного власника з фокусом на бренд та швидке бронювання.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {properties.map((property) => (
            <article key={property.id} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg">
              <div className="mb-4 h-52 rounded-3xl bg-slate-100" />
              <h2 className="text-2xl font-semibold text-slate-900">{property.title}</h2>
              <p className="mt-3 text-slate-600">{property.description}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>від {property.pricePerNight.toLocaleString('uk-UA')} грн / ніч</span>
                <Link href={`/book/${property.id}`} className="text-sky-500 hover:text-sky-600">Переглянути</Link>
              </div>
            </article>
          ))}
          {properties.length === 0 && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
              <p>Цей хост ще не додав своїх об’єктів.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
