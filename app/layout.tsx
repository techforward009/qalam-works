import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Qalam Works — Modern Digital Atelier for Typography',
  description: 'The Modern Digital Atelier & Workspace for Text, Language, and Urdu/Arabic Typography.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ur" dir="rtl">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Noto+Naskh+Arabic:wght@400..700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#08090C] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
