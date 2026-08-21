import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { LanguageProvider } from "./lib/language-context";
import AnalyticsProviders from "./components/AnalyticsProviders";

// Fonts are served from public/fonts/ (copied from @fontsource at build time).
// next/font/local resolves paths relative to the source file (app/layout.tsx),
// so "../public/fonts/" points to the project-level public directory.
const inter = localFont({
  src: [
    { path: "../public/fonts/inter-latin-400.woff2", weight: "400" },
    { path: "../public/fonts/inter-latin-500.woff2", weight: "500" },
    { path: "../public/fonts/inter-latin-600.woff2", weight: "600" },
    { path: "../public/fonts/inter-latin-700.woff2", weight: "700" },
  ],
  variable: "--font-inter",
});

const nastaliq = localFont({
  src: [
    { path: "../public/fonts/nastaliq-400.woff2", weight: "400" },
    { path: "../public/fonts/nastaliq-700.woff2", weight: "700" },
  ],
  variable: "--font-nastaliq",
});

const naskh = localFont({
  src: [
    { path: "../public/fonts/naskh-400.woff2", weight: "400" },
    { path: "../public/fonts/naskh-500.woff2", weight: "500" },
    { path: "../public/fonts/naskh-600.woff2", weight: "600" },
    { path: "../public/fonts/naskh-700.woff2", weight: "700" },
  ],
  variable: "--font-naskh",
});

const amiri = localFont({
  src: [
    { path: "../public/fonts/amiri-400.woff2", weight: "400" },
    { path: "../public/fonts/amiri-700.woff2", weight: "700" },
  ],
  variable: "--font-amiri",
});

const vazirmatn = localFont({
  src: [
    { path: "../public/fonts/vazirmatn-400.woff2", weight: "400" },
    { path: "../public/fonts/vazirmatn-500.woff2", weight: "500" },
    { path: "../public/fonts/vazirmatn-700.woff2", weight: "700" },
  ],
  variable: "--font-vazirmatn",
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
      <body className={`${inter.variable} ${nastaliq.variable} ${naskh.variable} ${amiri.variable} ${vazirmatn.variable} antialiased min-h-screen flex flex-col`}>
        <LanguageProvider>
          <Header />
          <div className="flex-grow">
            {children}
          </div>
          <Footer />
          <AnalyticsProviders />
        </LanguageProvider>
      </body>
    </html>
  );
}
