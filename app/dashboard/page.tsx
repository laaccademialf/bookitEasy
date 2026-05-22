'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useContext, useEffect } from 'react';
import { Building2, CalendarDays, Wallet } from 'lucide-react';
import { AuthContext } from '../providers';
import { PageBanner } from '../../components/PageBanner';

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useContext(AuthContext);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (profile?.role === 'admin') {
      router.replace('/admin');
    }
  }, [loading, profile, router, user]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12 lg:px-10">
          <p className="text-slate-600">Завантаження кабінету...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (profile?.role === 'admin') {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PageBanner title="Кабінет орендодавця" />
      <div className="w-full px-4 py-8 sm:px-6 lg:px-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[
            {
              title: 'Мої обʼєкти',
              description: 'Керування обʼєктами і доступністю',
              href: '/dashboard/properties',
              icon: Building2,
            },
            {
              title: 'Календар',
              description: 'Бронювання у форматі таймлайну',
              href: '/dashboard/calendar',
              icon: CalendarDays,
            },
            {
              title: 'Фінанси',
              description: 'Доходи, витрати, прибуток',
              href: '/dashboard/finances',
              icon: Wallet,
            },
          ].map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group flex aspect-square flex-col justify-between rounded-[1.5rem] border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-lg sm:rounded-[2rem] sm:p-5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 transition group-hover:bg-sky-500 group-hover:text-white">
                <card.icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{card.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{card.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
