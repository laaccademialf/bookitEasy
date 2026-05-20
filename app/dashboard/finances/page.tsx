'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../providers';
import { Booking, getHostBookings } from '../../../lib/bookings';
import { createExpense, getHostExpenses, Expense } from '../../../lib/expenses';

export default function FinancesPage() {
  const { profile, loading } = useContext(AuthContext);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenseForm, setExpenseForm] = useState({
    category: 'utility',
    amount: 0,
    date: '',
    description: '',
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!profile?.uid) return;
      setExpenses(await getHostExpenses(profile.uid));
      setBookings(await getHostBookings(profile.uid));
    };
    load();
  }, [profile]);

  const totalRevenue = useMemo(
    () => bookings.reduce((sum: number, booking: any) => sum + Number(booking.totalPrice || 0), 0),
    [bookings],
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [expenses],
  );

  const profit = totalRevenue - totalExpenses;

  const handleExpenseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.uid) return;
    const newExpense = {
      hostId: profile.uid,
      category: expenseForm.category as Expense['category'],
      amount: Number(expenseForm.amount),
      date: expenseForm.date,
      description: expenseForm.description,
    };
    await createExpense(newExpense);
    setExpenses((current) => [...current, newExpense]);
    setStatus('Витрату додано');
    setExpenseForm({ category: 'utility', amount: 0, date: '', description: '' });
    setTimeout(() => setStatus(''), 2000);
  };

  if (loading) {
    return <p className="p-8 text-slate-300">Завантаження...</p>;
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
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-glow backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Фінансова аналітика</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Доходи, витрати та чистий прибуток</h1>
          <p className="mt-3 text-slate-400">Аналізуйте прибуток за рахунок бронювань і контролюйте витрати бізнесу.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Доходи</p>
            <p className="mt-4 text-4xl font-semibold text-white">{totalRevenue.toLocaleString('uk-UA')} грн</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Витрати</p>
            <p className="mt-4 text-4xl font-semibold text-white">{totalExpenses.toLocaleString('uk-UA')} грн</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Чистий прибуток</p>
            <p className="mt-4 text-4xl font-semibold text-white">{profit.toLocaleString('uk-UA')} грн</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-2xl font-semibold text-white">Витрати</h2>
            <div className="mt-6 space-y-4">
              {expenses.length === 0 ? (
                <p className="text-slate-400">Тут будуть відображені витрати за об’єктами або бізнесом.</p>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id ?? `${expense.date}-${expense.amount}`} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-white">{expense.description}</p>
                        <p className="text-sm text-slate-400">{expense.category} · {expense.date}</p>
                      </div>
                      <p className="text-white">-{Number(expense.amount).toLocaleString('uk-UA')} грн</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-2xl font-semibold text-white">Додати витрату</h2>
            <form onSubmit={handleExpenseSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Категорія</label>
                <select
                  value={expenseForm.category}
                  onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                >
                  <option value="utility">Комунальні</option>
                  <option value="cleaning">Клінінг</option>
                  <option value="repair">Ремонт</option>
                  <option value="other">Інше</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Сума, грн</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(event) => setExpenseForm({ ...expenseForm, amount: Number(event.target.value) })}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Дата</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Опис</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })}
                  rows={3}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
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
