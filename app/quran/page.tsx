"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLanguage } from "../lib/language-context";
import { QURAN_EDITIONS } from "./editions";
import styles from "./edition-center.module.css";

const COPY = {
  en: {
    kicker: "Qalam Works · Quran",
    title: "Quran Editions",
    subtitle: "Three Quran editions in one place. Each edition keeps its own source text and presentation.",
    edition: "EDITION",
    open: "Open edition",
    note: "The three editions remain separate, while this page provides one common entry point for browsing them.",
  },
  ur: {
    kicker: "Qalam Works · قرآن کریم",
    title: "قرآن کریم کے ایڈیشنز",
    subtitle: "قرآن کریم کے تین ایڈیشن ایک جگہ پر۔ ہر ایڈیشن کا اصل متن اور اپنی مخصوص پیش کش الگ محفوظ ہے۔",
    edition: "ایڈیشن",
    open: "ایڈیشن کھولیں",
    note: "تینوں ایڈیشن الگ الگ محفوظ ہیں، جبکہ یہ صفحہ ان سب تک پہنچنے کے لیے ایک مشترک مقام ہے۔",
  },
} as const;

function HashRedirect() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const match = /^(\d{1,3}):(\d{1,3})$/.exec(hash);
    if (match) window.location.replace("/quran/" + match[1] + "/" + match[2]);
  }, []);
  return null;
}

export default function QuranIndexPage() {
  const { language, dir } = useLanguage();
  const copy = COPY[language];

  return (
    <main className={styles.page} dir={dir}>
      <HashRedirect />
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.kicker}>{copy.kicker}</div>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={language === "ur" ? styles.subtitle + " font-naskh" : styles.subtitle}>{copy.subtitle}</p>
        </header>

        <section className={styles.grid} aria-label="Quran editions">
          {QURAN_EDITIONS.map((edition, index) => (
            <article key={edition.id} className={styles.card}>
              <div className={styles.band} />
              <div className={styles.body}>
                <div className={styles.number}>{copy.edition} {index + 1}</div>
                <h2 className={styles.name}>{edition.name[language]}</h2>
                <p className={language === "ur" ? styles.description + " font-naskh" : styles.description}>{edition.description[language]}</p>
                <div className={styles.detail}>{edition.detail[language]}</div>
                <div className={styles.rendering}>{edition.rendering[language]}</div>
                <Link href={edition.route} className={styles.open} dir={language === "ur" ? "rtl" : "ltr"} lang={language}>
                  {copy.open}
                </Link>
              </div>
            </article>
          ))}
        </section>

        <p className={language === "ur" ? styles.note + " font-naskh" : styles.note}>{copy.note}</p>
      </div>
    </main>
  );
}
