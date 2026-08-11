import type { Metadata } from "next";
import { Noto_Nastaliq_Urdu, Noto_Naskh_Arabic, Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { LanguageProvider } from "./lib/language-context";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

// Nastaliq: hero/section headings only (calligraphic, not legible at small sizes).
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-nastaliq",
});

// Naskh: UI body/buttons/labels/forms — highly readable at small sizes, avoids the "mechanical" look of using Nastaliq for everything.
const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-naskh",
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
      <body className={`${inter.variable} ${nastaliq.variable} ${naskh.variable} antialiased`}>
        <LanguageProvider>
          <Header />
          {children}
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
