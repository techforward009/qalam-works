import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { LanguageProvider } from "./lib/language-context";
import AnalyticsProviders from "./components/AnalyticsProviders";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";

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
    "Professional Urdu writing tools: an Urdu text cleaner, Urdu proofreading support, a Roman Urdu converter, and an Urdu Unicode fixer with punctuation correction — plus Document Studio for publication-ready work.",
  openGraph: {
    type: "website",
    url: "https://qalamworks.com",
    siteName: "Qalam Works",
    title: "Qalam Works — Professional Urdu Writing & Publishing Tools",
    description:
      "Urdu writing tools for text cleanup, proofreading, Roman Urdu conversion, Unicode correction, and publication preparation.",
    locale: "ur_PK",
    alternateLocale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qalam Works — Professional Urdu Writing & Publishing Tools",
    description:
      "Clean Urdu text, proofread punctuation, convert Roman Urdu, and fix Unicode — professional writing tools from Qalam Works.",
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
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${inter.variable} ${nastaliq.variable} ${naskh.variable} ${amiri.variable} ${vazirmatn.variable} antialiased min-h-screen flex flex-col`}>
        <LanguageProvider>
          <Header />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            storageKey="qalam-theme"
            disableTransitionOnChange
          >
            <div className="flex-grow">
              {children}
            </div>
            <ThemeToggle />
          </ThemeProvider>
          <Footer />
          <AnalyticsProviders />
        </LanguageProvider>
      </body>
    </html>
  );
}
