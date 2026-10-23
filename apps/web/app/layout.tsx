import type { Metadata, Viewport } from 'next';
import { Alexandria, Aref_Ruqaa, IBM_Plex_Sans_Arabic } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const plex = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-arabic',
});
const alexandria = Alexandria({ subsets: ['arabic'], variable: '--font-alexandria' });
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

export const viewport: Viewport = { themeColor: '#F6F2E8', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${plex.variable} ${alexandria.variable} ${ruqaa.variable}`}
    >
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
