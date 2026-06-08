'use client';

export default function InventoryPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">Інвентаризація</h1>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          Тут буде облік інвентарю по обʼєктах: кількість, стан та оновлення залишків.
        </p>
      </section>
    </main>
  );
}
