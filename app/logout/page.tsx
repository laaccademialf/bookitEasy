'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOutUser } from '../../lib/auth';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const signOut = async () => {
      await signOutUser();
      router.push('/');
    };

    signOut();
  }, [router]);

  return (
    <main className="min-h-screen bg-[#060b17] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6 py-12 lg:px-10">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 text-center shadow-glow backdrop-blur-xl">
          <p className="text-lg text-slate-300">Вихід...</p>
        </div>
      </div>
    </main>
  );
}
