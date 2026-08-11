import type { Metadata } from "next";
import { Noto_Nastaliq_Urdu, Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { LanguageProvider } from "./lib/language-context";

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
  title: "Qalam Works — Professional Urdu Writing & Publishing Platform",
  description: "Write, refine, and prepare professional Urdu documents. Translation services also available in Urdu, English, Arabic, and Persian.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ur" dir="rtl">
      <body className={`${inter.variable} ${nastaliq.variable} antialiased`}>
        <LanguageProvider>
          <Header />
          {children}
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
