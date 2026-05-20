import Link from 'next/link';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-500">Кабінет орендодавця</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Зведена панель управління для хоста</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Тут власник керує об’єктами, бронюваннями, календарем та фінансами. Це базовий старт для майбутнього Premium B2B-проєкту.
          </p>
        </div>

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
