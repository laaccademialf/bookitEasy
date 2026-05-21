export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        <div className="mb-6 h-10 w-64 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-56 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      </div>
    </main>
  );
}
