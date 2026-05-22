'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useContext, useEffect } from 'react';
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
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: 'Властивості', description: 'CRUD об’єктів, фото, опис та доступність.', href: '/dashboard/properties' },
            { title: 'Календар', description: 'Перегляд бронювань і блокування дат.', href: '/dashboard/calendar' },
            { title: 'Фінанси', description: 'Доходи, витрати та аналітика.', href: '/dashboard/finances' },
          ].map((card) => (
            <Link key={card.title} href={card.href} className="rounded-[2rem] border border-slate-200 bg-white p-6 transition hover:border-sky-400 hover:shadow-lg">
              <h2 className="text-2xl font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-3 text-slate-600">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
