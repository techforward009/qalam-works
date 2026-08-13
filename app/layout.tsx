import type { Metadata } from "next";
import { Noto_Nastaliq_Urdu, Noto_Naskh_Arabic, Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { LanguageProvider } from "./lib/language-context";
import AnalyticsProviders from "./components/AnalyticsProviders";

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
  metadataBase: new URL("https://qalamworks.com"),
  title: "Qalam Works — Professional Urdu Writing & Publishing Tools",
  description:
    "Qalam Works is a professional digital workspace for Urdu writing, editing, standardization, and publication preparation. Tools include Document Studio, Document Cleaner, Quality Audit, and Unicode Standardizer.",
  openGraph: {
    type: "website",
    url: "https://qalamworks.com",
    siteName: "Qalam Works",
    title: "Qalam Works — Professional Urdu Writing & Publishing Tools",
    description:
      "A professional digital workspace for Urdu writing, editing, standardization, and publication preparation.",
    locale: "ur_PK",
    alternateLocale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qalam Works — Professional Urdu Writing & Publishing Tools",
    description:
      "Professional tools for Urdu writing, editing, Unicode standardization, and document preparation.",
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  alternates: { canonical: "https://qalamworks.com" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${inter.variable} ${nastaliq.variable} ${naskh.variable} antialiased`}>
        <LanguageProvider>
          <Header />
          {children}
          <Footer />
          <AnalyticsProviders />
        </LanguageProvider>
      </body>
    </html>
  );
}
