import './globals.css';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import SiteChrome from '../components/SiteChrome';

export const metadata: Metadata = {
  title: {
    default: 'AGEN — the X-Ray for AI agents',
    template: '%s · AGEN',
  },
  description: 'Run a free website audit to see if AI agents can read your DOM. Get copy-pasteable HTML and ARIA fixes to optimize your checkout and landing pages for AI browsers.',
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
