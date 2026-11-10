import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'Global Cricket Dream Team & Simulation Game',
  description:
    'Authoritative, data-driven, tactical cricket simulation platform with historical player databases and intelligent AI opponents.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0E1013] text-[#F8F9FA] antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}

