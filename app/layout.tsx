import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { TopNav } from '../components/TopNav';

export const metadata: Metadata = {
  title: 'BookItEasy — SaaS для подобової оренди',
  description: 'Платформа автоматизації бізнесу для подобової оренди нерухомості.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>
        <Providers>
          <TopNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
