"use client";

import Link from "next/link";
import { useEffect } from "react";
import { QURAN_EDITIONS } from "./editions";
import styles from "./edition-center.module.css";

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
  return (
    <main className={styles.page} dir="ltr">
      <HashRedirect />
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.kicker}>Qalam Works · Quran</div>
          <h1 className={styles.title}>قرآن کریم</h1>
          <p className={styles.subtitle}>
            ایک جگہ پر قرآن کریم کے ہمارے تین الگ مصحفی نمونے۔
            متن اور rendering ہر edition میں اپنی اصل شکل میں محفوظ ہیں۔
          </p>
        </header>

        <section className={styles.grid} aria-label="Quran editions">
          {QURAN_EDITIONS.map((edition, index) => (
            <article key={edition.id} className={styles.card}>
              <div className={styles.band} />
              <div className={styles.body}>
                <div className={styles.number}>EDITION {index + 1}</div>
                <h2 className={styles.name}>{edition.name}</h2>
                <p className={styles.description}>{edition.description}</p>
                <div className={styles.detail}>{edition.detail}</div>
                <div className={styles.rendering}>{edition.rendering}</div>
                <Link href={edition.route} className={styles.open}>
                  Open edition
                </Link>
              </div>
            </article>
          ))}
        </section>

        <p className={styles.note}>
          Editions are kept separate. Shared navigation and future cross-edition
          verse linking can be added without changing the underlying Quran data
          or page-specific rendering.
        </p>
      </div>
    </main>
  );
}
