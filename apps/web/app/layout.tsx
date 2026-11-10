import type { Metadata } from 'next';
import { Inter, Manrope, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { StitchHeader } from '../components/StitchHeader';
import { StitchFooter } from '../components/StitchFooter';
import { WelcomeModal } from '../components/WelcomeModal';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://cricket-dream-xi.vercel.app'),
  title: 'Cricket Dream XI • Official Tactical Match Simulator',
  description:
    'Authoritative, broadcast-grade cricket simulation platform with 1,144 international players, deterministic physics, and tactical decision-making.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Cricket Dream XI • Official Tactical Match Simulator',
    description:
      'Authoritative, broadcast-grade cricket simulation platform with 1,144 international players, deterministic physics, and tactical decision-making.',
    url: 'https://cricket-dream-xi.vercel.app',
    siteName: 'Cricket Dream XI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Cricket Dream XI Official Brand Identity',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cricket Dream XI • Official Tactical Match Simulator',
    description:
      'Authoritative, broadcast-grade cricket simulation platform with 1,144 international players, deterministic physics, and tactical decision-making.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface font-body-base text-body-base text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container flex flex-col">
        <StitchHeader />
        <main className="w-full pt-20 bg-surface min-h-[calc(100vh-80px)] flex flex-col flex-1">
          {children}
        </main>
        <StitchFooter />
        <WelcomeModal />
      </body>
    </html>
  );
}
