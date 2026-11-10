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
  title: 'Cricket Dream XI • Official Tactical Match Simulator',
  description:
    'Authoritative, broadcast-grade cricket simulation platform with 1,144 international players, deterministic physics, and tactical decision-making.',
  icons: {
    icon: '/assets/stitch/logo.png',
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
