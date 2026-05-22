'use client';

import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../providers';
import { updateCurrentUserSubscription } from '../../../lib/auth';
import { PageBanner } from '../../../components/PageBanner';

type Plan = 'starter' | 'pro' | 'enterprise';
type Status = 'active' | 'paused' | 'canceled';

export default function SubscriptionPage() {
  const { profile, loading } = useContext(AuthContext);
  const [plan, setPlan] = useState<Plan>('starter');
  const [subscriptionStatus, setSubscriptionStatus] = useState<Status>('active');
  const [renewDate, setRenewDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!profile) return;
    setPlan((profile.subscriptionPlan as Plan) || 'starter');
    setSubscriptionStatus((profile.subscriptionStatus as Status) || 'active');
    setRenewDate(profile.subscriptionRenewAt || new Date().toISOString().slice(0, 10));
  }, [profile]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSaving(true);
      setStatus('');
      await updateCurrentUserSubscription({
        subscriptionPlan: plan,
        subscriptionStatus,
        subscriptionRenewAt: renewDate,
      });
      setStatus('Підписку оновлено успішно.');
    } catch {
      setStatus('Не вдалося оновити підписку.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-8 text-slate-600">Завантаження...</p>;
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Доступ заборонено</h1>
          <p className="mt-4 text-slate-600">Увійдіть, щоб керувати підпискою.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Увійти
          </Link>
        </div>
      </main>
    );
  }

  if (profile.role === 'client') {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Підписка недоступна</h1>
          <p className="mt-4 text-slate-600">Керування підпискою доступне для орендодавця або адміністратора.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PageBanner title="Моя підписка" />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Тариф</label>
              <select
                value={plan}
                onChange={(event) => setPlan(event.target.value as Plan)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Статус</label>
              <select
                value={subscriptionStatus}
                onChange={(event) => setSubscriptionStatus(event.target.value as Status)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              >
                <option value="active">Активна</option>
                <option value="paused">На паузі</option>
                <option value="canceled">Скасована</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Дата наступного списання</label>
              <input
                type="date"
                value={renewDate}
                onChange={(event) => setRenewDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </div>

            {status && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{status}</p>}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Збереження...' : 'Оновити підписку'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
