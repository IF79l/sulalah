import type { Metadata, Viewport } from 'next';
import { Aref_Ruqaa, IBM_Plex_Sans_Arabic } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import { OfflineBar } from '@/components/States';
import { appEnv } from '@/lib/backend';

const plex = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
});
// Calligraphic heading over the tree's crown, as on a printed nasab poster.
const ruqaa = Aref_Ruqaa({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--tree-title-font',
});

export const metadata: Metadata = {
  title: 'سُلالة | SULALAH',
  description: 'أنشئ شجرة عائلتك، وشاركها مع أفرادها، ودع أغصانكم تنمو جيلًا بعد جيل.',
};

export const viewport: Viewport = { themeColor: '#F8F5EE', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${plex.variable} ${ruqaa.variable}`}
    >
      <head>
        {/* Icon glyphs; "block" keeps their ligature names from flashing as words. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..500,0..1,0&display=block"
        />
      </head>
      <body className="min-h-dvh bg-ivory font-sans text-ink antialiased">
        <OfflineBar />
        {appEnv === 'staging' ? (
          // So nobody mistakes the test site for the real one.
          <div className="pointer-events-none fixed top-0 left-0 z-[100] rounded-br-lg bg-pending px-2.5 py-0.5 text-[0.7rem] font-bold text-ivory">
            نسخة التجربة
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
