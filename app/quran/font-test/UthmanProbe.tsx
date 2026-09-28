"use client";

import { useMemo, useState } from "react";
import { UTHMAN_EDITION } from "../uthman/edition";
import { parseUthmaniLines, type UthmanAyah } from "../uthman/parseUthmaniLines";

const NOTO = 'var(--font-naskh), "Noto Naskh Arabic", serif';

function composition(ayahs: readonly UthmanAyah[]): UthmanAyah[] {
  const wanted = new Set(["1", "19:1", "114"]);
  return ayahs.filter((ayah) => wanted.has(String(ayah.surah)) || wanted.has(`${ayah.surah}:${ayah.ayah}`));
}

export default function UthmanProbe() {
  const [ayahs, setAyahs] = useState<UthmanAyah[]>([]);
  const [counts, setCounts] = useState<number[]>([]);
  const [status, setStatus] = useState("no Uthman source loaded");
  const [family, setFamily] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const sample = useMemo(() => composition(ayahs), [ayahs]);

  const onText = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseUthmaniLines(await file.text());
    setAyahs(parsed.ayahs);
    setCounts(parsed.surahAyahCounts);
    setStatus(`${file.name}: ${parsed.surahAyahCounts.length} surah groups, ${parsed.ayahs.length} lines. No page numbers in the source.`);
  };

  const onFont = async (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const face = new FontFace("qalam-local-uthman", `url(${url})`);
      await face.load();
      document.fonts.add(face);
      setFamily("qalam-local-uthman");
    } catch {
      setFamily(null);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const copySample = async () => {
    await navigator.clipboard.writeText(sample.map((ayah) => ayah.text).join("\n"));
    setCopied(true);
  };

  return (
    <section className="mt-10 border-t border-[#c4a36a]/40 pt-6">
      <h2 className="text-lg font-semibold">Uthman Taha edition, experimental</h2>
      <p className="mt-1 max-w-3xl text-sm text-[#6d5a3c]">
        Separate from the Indo-Pak reader. Load the supplied quran-uthmani.txt and Uthman Taha Naskh locally.
        The source has no page numbers, so this is not a Mushaf page and not {UTHMAN_EDITION.officialPageCount ?? "an official page count"}.
        The font is not bundled. Web embedding is {UTHMAN_EDITION.license.webEmbedding}.
      </p>
      <p className="mt-2 max-w-3xl text-sm text-[#6d5a3c]">
        {UTHMAN_EDITION.font.family} is not {UTHMAN_EDITION.font.distinctFrom}. Direct Unicode coverage of this text is incomplete
        ({UTHMAN_EDITION.font.missingCodePoints.length} missing code points, including U+0671).
      </p>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <label>
          Uthman text
          <input className="mt-1 block" type="file" accept=".txt,text/plain" aria-label="Choose local Uthman text" onChange={(event) => void onText(event.target.files?.[0])} />
        </label>
        <label>
          Uthman Taha font
          <input className="mt-1 block" type="file" accept=".otf,.ttf,font/otf,font/ttf" aria-label="Choose local Uthman Taha font" onChange={(event) => void onFont(event.target.files?.[0])} />
        </label>
      </div>
      <p className="mt-2 text-sm">{status}{family ? " Font loaded locally." : ""}</p>
      {sample.length > 0 && (
        <>
          <button type="button" className="mt-2 border border-[#c4a36a]/50 px-2 py-1 text-sm" onClick={() => void copySample()}>
            {copied ? "Copied source lines" : "Copy these source lines"}
          </button>
          <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
            <ProbeColumn title={family ? "Uthman Taha font only, no fallback" : "Uthman Taha font not loaded"} family={family ?? "serif"} ayahs={sample} />
            <ProbeColumn title="Same Uthman text in Noto Naskh" family={NOTO} ayahs={sample} />
          </div>
          <p className="mt-2 text-sm text-[#6d5a3c]">Surah line counts observed from the file: {counts.join(", ")}</p>
        </>
      )}
    </section>
  );
}

function ProbeColumn({ title, family, ayahs }: { title: string; family: string; ayahs: readonly UthmanAyah[] }) {
  let surah = 0;
  return (
    <div>
      <p className="mb-2 text-sm">{title}. Experimental composition, not a Mushaf page.</p>
      <article className="border border-[#c4a36a] bg-[#fbf6ea] p-6" dir="rtl" lang="ar" style={{ fontFamily: family, fontSize: 28, lineHeight: 2.1 }}>
        {ayahs.map((ayah) => {
          const heading = ayah.surah !== surah;
          surah = ayah.surah;
          return (
            <p key={`${ayah.surah}:${ayah.ayah}`} className="mb-2 text-justify" style={{ unicodeBidi: "plaintext" }}>
              {heading ? <span className="mb-2 block text-center text-base">Surah {ayah.surah}</span> : null}
              {ayah.text}
            </p>
          );
        })}
      </article>
    </div>
  );
}
