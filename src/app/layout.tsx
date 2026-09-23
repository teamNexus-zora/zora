import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zora - Your Virtual Companion',
  description: 'An interactive AI virtual companion for kids.',
  manifest: '/manifest.json', // good practice for progressive web apps
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans overflow-hidden bg-black text-slate-900">
        {children}
      </body>
    </html>
  );
}
