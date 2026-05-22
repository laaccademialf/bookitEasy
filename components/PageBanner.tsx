import React from 'react';

interface PageBannerProps {
  title: string;
  actions?: React.ReactNode;
  variant?: 'light' | 'dark';
}

export function PageBanner({ title, actions, variant = 'light' }: PageBannerProps) {
  const isDark = variant === 'dark';
  return (
    <section
      className={
        isDark
          ? 'w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl'
          : 'w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm'
      }
    >
      <div className="flex w-full flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-6">
        <h1
          className={`text-2xl font-semibold tracking-tight sm:text-3xl ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          {title}
        </h1>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}

export default PageBanner;
