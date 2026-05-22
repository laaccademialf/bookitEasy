'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../providers';
import { Booking, getHostBookings } from '../../../lib/bookings';
import { createExpense, getHostExpenses, Expense } from '../../../lib/expenses';
import { getHostProperties, Property } from '../../../lib/properties';
import { PageBanner } from '../../../components/PageBanner';

type PropertyStat = {
  propertyId: string;
  title: string;
  revenue: number;
  expenses: number;
  profit: number;
  bookingsCount: number;
};

export default function FinancesPage() {
  const { profile, loading } = useContext(AuthContext);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [expenseForm, setExpenseForm] = useState({
    category: 'utility',
    amount: 0,
    date: '',
    description: '',
    propertyId: '',
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!profile?.uid) return;
      const [exp, bks, props] = await Promise.all([
        getHostExpenses(profile.uid),
        getHostBookings(profile.uid),
        getHostProperties(profile.uid),
      ]);
      setExpenses(exp);
      setBookings(bks);
      setProperties(props);
    };
    load();
  }, [profile]);

  const filteredBookings = useMemo(
    () => (selectedProperty === 'all' ? bookings : bookings.filter((b) => b.propertyId === selectedProperty)),
    [bookings, selectedProperty],
  );
  const filteredExpenses = useMemo(
    () =>
      selectedProperty === 'all'
        ? expenses
        : expenses.filter((e) => (e as any).propertyId === selectedProperty),
    [expenses, selectedProperty],
  );

  const totalRevenue = useMemo(
    () => filteredBookings.reduce((sum, b: any) => sum + Number(b.totalPrice || 0), 0),
    [filteredBookings],
  );
  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [filteredExpenses],
  );
  const profit = totalRevenue - totalExpenses;

  const perProperty: PropertyStat[] = useMemo(() => {
    const map = new Map<string, PropertyStat>();
    properties.forEach((p) => {
      if (!p.id) return;
      map.set(p.id, { propertyId: p.id, title: p.title, revenue: 0, expenses: 0, profit: 0, bookingsCount: 0 });
    });
    bookings.forEach((b) => {
      const stat = map.get(b.propertyId);
      if (!stat) return;
      stat.revenue += Number((b as any).totalPrice || 0);
      stat.bookingsCount += 1;
    });
    expenses.forEach((e: any) => {
      if (!e.propertyId) return;
      const stat = map.get(e.propertyId);
      if (!stat) return;
      stat.expenses += Number(e.amount || 0);
    });
    map.forEach((s) => {
      s.profit = s.revenue - s.expenses;
    });
    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [properties, bookings, expenses]);

  const handleExpenseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.uid) return;
    const newExpense: any = {
      hostId: profile.uid,
      category: expenseForm.category as Expense['category'],
      amount: Number(expenseForm.amount),
      date: expenseForm.date,
      description: expenseForm.description,
    };
    if (expenseForm.propertyId) newExpense.propertyId = expenseForm.propertyId;
    await createExpense(newExpense);
    setExpenses((current) => [...current, newExpense]);
    setStatus('Витрату додано');
    setExpenseForm({ category: 'utility', amount: 0, date: '', description: '', propertyId: '' });
    setTimeout(() => setStatus(''), 2000);
  };

  if (loading) {
    return <p className="p-6 text-slate-300">Завантаження...</p>;
  }

  if (!profile || profile.role === 'client') {
    return (
      <main className="min-h-screen bg-[#070c18] text-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold">Доступ заборонено</h1>
          <p className="mt-4 text-slate-400">Цей фінансовий розділ доступний тільки для орендодавців.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070c18] text-slate-100">
      <PageBanner
        title="Фінансові звіти"
        variant="dark"
        actions={
          <select
            value={selectedProperty}
            onChange={(event) => setSelectedProperty(event.target.value)}
            className="w-full rounded-full border border-white/15 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 outline-none focus:border-sky-400 sm:w-auto"
          >
            <option value="all">Усі обʼєкти</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        }
      />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl sm:rounded-[2rem] sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 sm:text-sm">Доходи</p>
            <p className="mt-3 text-2xl font-semibold text-white sm:mt-4 sm:text-4xl">{totalRevenue.toLocaleString('uk-UA')} грн</p>
            <p className="mt-1 text-xs text-slate-500">{filteredBookings.length} бронювань</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl sm:rounded-[2rem] sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 sm:text-sm">Витрати</p>
            <p className="mt-3 text-2xl font-semibold text-white sm:mt-4 sm:text-4xl">{totalExpenses.toLocaleString('uk-UA')} грн</p>
            <p className="mt-1 text-xs text-slate-500">{filteredExpenses.length} записів</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl sm:rounded-[2rem] sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 sm:text-sm">Чистий прибуток</p>
            <p className={`mt-3 text-2xl font-semibold sm:mt-4 sm:text-4xl ${profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {profit.toLocaleString('uk-UA')} грн
            </p>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl sm:mt-8 sm:rounded-[2rem] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white sm:text-2xl">Розбивка по обʼєктах</h2>
            <span className="text-xs text-slate-500">{perProperty.length} обʼєктів</span>
          </div>
          {perProperty.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">У вас ще немає обʼєктів. Додайте їх у розділі «Мої обʼєкти».</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-800 md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Обʼєкт</th>
                      <th className="px-4 py-3 text-right">Бронювань</th>
                      <th className="px-4 py-3 text-right">Доходи</th>
                      <th className="px-4 py-3 text-right">Витрати</th>
                      <th className="px-4 py-3 text-right">Прибуток</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perProperty.map((stat) => (
                      <tr key={stat.propertyId} className="border-t border-slate-800">
                        <td className="px-4 py-3 text-slate-200">{stat.title}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{stat.bookingsCount}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{stat.revenue.toLocaleString('uk-UA')} грн</td>
                        <td className="px-4 py-3 text-right text-slate-300">{stat.expenses.toLocaleString('uk-UA')} грн</td>
                        <td className={`px-4 py-3 text-right font-semibold ${stat.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {stat.profit.toLocaleString('uk-UA')} грн
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="mt-5 grid gap-3 md:hidden">
                {perProperty.map((stat) => (
                  <div key={stat.propertyId} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-slate-100">{stat.title}</p>
                      <span className={`text-sm font-semibold ${stat.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {stat.profit.toLocaleString('uk-UA')} грн
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Брон.</p>
                        <p className="text-slate-200">{stat.bookingsCount}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Дохід</p>
                        <p className="text-slate-200">{stat.revenue.toLocaleString('uk-UA')}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Витрати</p>
                        <p className="text-slate-200">{stat.expenses.toLocaleString('uk-UA')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <div className="mt-6 grid gap-4 sm:gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl sm:rounded-[2rem] sm:p-6">
            <h2 className="text-lg font-semibold text-white sm:text-2xl">Витрати</h2>
            <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
              {filteredExpenses.length === 0 ? (
                <p className="text-sm text-slate-400">Записів витрат поки немає.</p>
              ) : (
                filteredExpenses.map((expense) => (
                  <div
                    key={expense.id ?? `${expense.date}-${expense.amount}`}
                    className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:rounded-3xl"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-white">{expense.description}</p>
                        <p className="text-xs text-slate-400 sm:text-sm">
                          {expense.category} · {expense.date}
                          {(expense as any).propertyId &&
                            ` · ${properties.find((p) => p.id === (expense as any).propertyId)?.title ?? ''}`}
                        </p>
                      </div>
                      <p className="text-white">-{Number(expense.amount).toLocaleString('uk-UA')} грн</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl sm:rounded-[2rem] sm:p-6">
            <h2 className="text-lg font-semibold text-white sm:text-2xl">Додати витрату</h2>
            <form onSubmit={handleExpenseSubmit} className="mt-4 space-y-4 sm:mt-6">
              <div>
                <label className="block text-sm font-medium text-slate-300">Категорія</label>
                <select
                  value={expenseForm.category}
                  onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400 sm:rounded-3xl"
                >
                  <option value="utility">Комунальні</option>
                  <option value="cleaning">Клінінг</option>
                  <option value="repair">Ремонт</option>
                  <option value="other">Інше</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Обʼєкт</label>
                <select
                  value={expenseForm.propertyId}
                  onChange={(event) => setExpenseForm({ ...expenseForm, propertyId: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400 sm:rounded-3xl"
                >
                  <option value="">Загальна (без привʼязки)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Сума, грн</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(event) => setExpenseForm({ ...expenseForm, amount: Number(event.target.value) })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400 sm:rounded-3xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Дата</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400 sm:rounded-3xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Опис</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400 sm:rounded-3xl"
                />
              </div>
              {status && <p className="text-sm text-sky-300">{status}</p>}
              <button className="w-full rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400">
                Додати витрату
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
