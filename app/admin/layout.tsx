import React from 'react';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminSidebar />
      <div className="ml-0 lg:ml-80">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
