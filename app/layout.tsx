import './globals.css';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import SiteChrome from '../components/SiteChrome';

export const metadata: Metadata = {
  title: {
    default: 'AGEN — the X-Ray for AI agents',
    template: '%s · AGEN',
  },
  description: 'Find out what autonomous AI agents actually see when they visit your site. Real DOM checks, actionable fixes, and an agent-readiness score.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[var(--canvas)] text-[color:var(--ink)]">
          <SiteChrome>
            <main className="min-h-[60vh]">{children}</main>
          </SiteChrome>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
