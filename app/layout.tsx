import type { Metadata } from "next";
import { Noto_Nastaliq_Urdu, Inter } from "next-[#121417]/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-nastaliq",
});

export const metadata: Metadata = {
  title: "Qalam Works — Modern Digital Atelier for Typography",
  description: "The Modern Atelier & Workspace for Text, Language, and Urdu/Arabic Typography",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ur" dir="rtl">
      <body className={`${inter.variable} ${nastaliq.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
