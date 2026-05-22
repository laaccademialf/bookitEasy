import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { TopNav } from '../components/TopNav';
import DevChunkRecovery from '../components/DevChunkRecovery';

export const metadata: Metadata = {
  title: 'BookItEasy — SaaS для подобової оренди',
  description: 'Платформа автоматизації бізнесу для подобової оренди нерухомості.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body>
        <Providers>
          <DevChunkRecovery />
          <TopNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
