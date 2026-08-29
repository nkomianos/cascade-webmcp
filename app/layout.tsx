import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Cascade — Stress-test decisions with your agent',
  description: 'A shared decision canvas where people and agents map assumptions, test shocks, and turn uncertainty into resilient action.',
  applicationName: 'Cascade',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Cascade',
    description: 'Stress-test decisions with your agent',
    type: 'website',
    images: [{ url: '/og.png', width: 1680, height: 945, alt: 'Cascade — Stress-test decisions with your agent' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cascade',
    description: 'Stress-test decisions with your agent',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = { themeColor: '#f3f0e8', colorScheme: 'light' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
