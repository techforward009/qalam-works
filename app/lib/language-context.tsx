"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Language Architecture (2026-08-10) — lightweight, dependency-free i18n.
// Deliberately NOT next-intl/react-i18next: this site has a small,
// known set of pages, so a plain React Context + a single translations
// dictionary (see translations.ts) is simpler to maintain and avoids a
// new dependency, per the explicit "prefer lightweight" requirement.
// Persistence uses the same localStorage pattern already established
// elsewhere in this codebase (plain key, guarded by `typeof window`).

export type Language = "ur" | "en";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "qalam-site-language";

function loadStoredLanguage(): Language {
  if (typeof window === "undefined") return "ur";
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "en" || saved === "ur") return saved;
  } catch (err) {
    console.error("Failed to load language preference:", err);
  }
  return "ur";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Urdu is the default (matches the product's actual positioning) —
  // lazy-initialized from localStorage, same convention as glossary/
  // preset persistence elsewhere in the app.
  const [language, setLanguageState] = useState<Language>(() => loadStoredLanguage());

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (err) {
      console.error("Failed to save language preference:", err);
    }
  };

  // Keeps the real <html> lang/dir attributes in sync with the selected
  // language, so browser/assistive-tech behavior (spellcheck language,
  // text direction) matches what's actually on screen.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, dir: language === "ur" ? "rtl" : "ltr" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
