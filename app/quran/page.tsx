"use client";

import Link from "next/link";
import { useEffect } from "react";
import { QURAN_EDITIONS } from "./editions";
import styles from "./edition-center.module.css";
import { useLanguage } from "../lib/language-context";

const COPY = {
  en: {
    kicker: "Qalam Works · Quran",
    title: "Quran Editions",
    subtitle:
      "Three Quran editions in one place. Each edition keeps its own source text and rendering.",
    edition: "EDITION",
    open: "Open edition",
    note:
      "The three editions remain separate, while this page provides one common entry point for browsing them.",
    names: {
      "qalam-indopak": "IndoPak — AhmedGraf",
      "digital-khatt": "IndoPak — Digital Khatt",
      "madinah-v2": "Madinah Mushaf — Uthman Taha",
    },
    descriptions: {
      "qalam-indopak":
        "IndoPak Quran text from AhmedGraf.",
      "digital-khatt":
        "DigitalKhatt IndoPak Quran text with its matching DigitalKhatt font.",
      "madinah-v2":
        "KFGQPC V2 Madinah Mushaf with page-specific QCF glyph fonts and QUL layout data.",
    },
    details: {
      "qalam-indopak": "604 pages · Qalam reader",
      "digital-khatt": "604 pages · DigitalKhatt",
      "madinah-v2": "604 pages · 15 lines · 1421H",
    },
    rendering: {
      "qalam-indopak": "AhmedGraf text + Qalam renderer",
      "digital-khatt": "DigitalKhatt text + matching font",
      "madinah-v2": "QCF V2 page glyphs + QUL layout",
    },
  },
  ur: {
    kicker: "Qalam Works · قرآن کریم",
    title: "قرآن کریم کے ایڈیشنز",
    subtitle:
      "قرآن کریم کے تین ایڈیشن ایک جگہ پر۔ ہر ایڈیشن کا اصل متن اور اپنی مخصوص پیش کش الگ محفوظ ہے۔",
    edition: "ایڈیشن",
    open: "ایڈیشن کھولیں",
    note:
      "تینوں ایڈیشن الگ الگ محفوظ ہیں، جبکہ یہ صفحہ ان سب تک پہنچنے کے لیے ایک مشترک مقام ہے۔",
    names: {
      "qalam-indopak": "انڈو پاک — احمد گراف",
      "digital-khatt": "انڈو پاک — ڈیجیٹل خط",
      "madinah-v2": "مصحف مدینہ — عثمان طہ",
    },
    descriptions: {
      "qalam-indopak":
        "احمد گراف کے قرآنی متن کو Qalam Works کے اصل ریڈر میں پیش کیا گیا ہے۔",
      "digital-khatt":
        "DigitalKhatt کے انڈو پاک قرآنی متن کو اسی کے متعلقہ DigitalKhatt فونٹ کے ساتھ پیش کیا گیا ہے۔",
      "madinah-v2":
        "KFGQPC V2 مدنی مصحف کو صفحہ وار QCF فونٹس اور QUL لے آؤٹ ڈیٹا کے ساتھ پیش کیا گیا ہے۔",
    },
    details: {
      "qalam-indopak": "604 صفحات · Qalam ریڈر",
      "digital-khatt": "604 صفحات · DigitalKhatt",
      "madinah-v2": "604 صفحات · 15 سطریں · 1421ھ",
    },
    rendering: {
      "qalam-indopak": "AhmedGraf متن + Qalam ریڈر",
      "digital-khatt": "DigitalKhatt متن + متعلقہ فونٹ",
      "madinah-v2": "QCF V2 صفحہ وار glyphs + QUL لے آؤٹ",
    },
  },
} as const;

function HashRedirect() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const match = /^(\d{1,3}):(\d{1,3})$/.exec(hash);
    if (match) {
      window.location.replace(`/quran/${match[1]}/${match[2]}`);
    }
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
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </header>

        <section className={styles.grid} aria-label="Quran editions">
          {QURAN_EDITIONS.map((edition, index) => (
            <article key={edition.id} className={styles.card}>
              <div className={styles.band} />
              <div className={styles.body}>
                <div className={styles.number}>{copy.edition} {index + 1}</div>
                <h2 className={styles.name}>{copy.names[edition.id]}</h2>
                <p className={styles.description}>{copy.descriptions[edition.id]}</p>
                <div className={styles.detail}>{copy.details[edition.id]}</div>
                <div className={styles.rendering}>{copy.rendering[edition.id]}</div>
                <Link href={edition.route} className={styles.open}>
                  {copy.open}
                </Link>
              </div>
            </article>
          ))}
        </section>

        <p className={`${styles.note} ${language === "ur" ? "font-naskh" : ""}`}>
          {copy.note}
        </p>
      </div>
    </main>
  );
}
