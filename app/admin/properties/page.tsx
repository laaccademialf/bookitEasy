'use client';

import Link from 'next/link';
import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../providers';
import { fetchUsers, type UserProfile } from '../../../lib/auth';
import { getPublicProperties, type Property } from '../../../lib/properties';
import { PageBanner } from '../../../components/PageBanner';

export default function AdminPropertiesPage() {
  const authContext = useContext(AuthContext as unknown as React.Context<any>);
  const { profile, loading } = authContext as any;
  const [properties, setProperties] = useState<Property[]>([]);
  const [hosts, setHosts] = useState<Record<string, UserProfile>>({});
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const load = async () => {
      try {
        const [loadedProperties, loadedUsers] = await Promise.all([getPublicProperties(), fetchUsers()]);
        setProperties(loadedProperties);

        const hostMap = loadedUsers.reduce<Record<string, UserProfile>>((acc, user) => {
          acc[user.uid] = user;
          return acc;
        }, {});
        setHosts(hostMap);
        setLoadError('');
      } catch {
        setProperties([]);
        setHosts({});
        setLoadError('Немає доступу до обʼєктів або профілів власників. Перевірте налаштування доступу.');
      }
    };

    load();
  }, [profile]);

  const filteredProperties = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;

    return properties.filter((property) => {
      const owner = hosts[property.hostId];
      return (
        property.title.toLowerCase().includes(q) ||
        property.address.toLowerCase().includes(q) ||
        property.hostId.toLowerCase().includes(q) ||
        (owner?.email || '').toLowerCase().includes(q) ||
        (owner?.name || '').toLowerCase().includes(q)
      );
    });
  }, [properties, hosts, search]);

  if (loading) {
    return <p className="p-8 text-slate-600">Завантаження...</p>;
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Доступ заборонено</h1>
          <p className="mt-4 text-slate-600">Сторінка доступна лише адміністратору.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Увійти
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PageBanner title="Обʼєкти" />
      <div className="w-full px-4 py-8 sm:px-6 lg:px-6">
        {loadError && <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{loadError}</p>}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">Всього обʼєктів: {properties.length}</p>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Пошук за назвою, адресою, орендодавцем"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none md:max-w-sm"
            />
          </div>

          <div className="mt-5 space-y-4">
            {filteredProperties.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Обʼєктів не знайдено</p>
            ) : (
              filteredProperties.map((property) => {
                const owner = hosts[property.hostId];
                const amenities = property.amenities?.slice(0, 4).join(', ');

                return (
                  <article key={property.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{property.title}</h2>
                        <p className="mt-1 text-sm text-slate-600">{property.address}</p>
                        <p className="mt-1 text-sm text-slate-600">{property.rooms} кімнати, {property.guests} гостей, {property.pricePerNight} грн/ніч</p>
                        {amenities && <p className="mt-2 text-xs text-slate-500">Зручності: {amenities}</p>}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <p className="font-medium text-slate-900">Орендодавець</p>
                        <p>{owner?.name || 'Невідомо'}</p>
                        <p className="text-xs text-slate-500">{owner?.email || property.hostId}</p>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
