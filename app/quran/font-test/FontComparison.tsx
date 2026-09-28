"use client";

import { useEffect, useMemo, useState } from "react";
import { QuranPageSurface } from "../QuranReader";
import { FONT_CANDIDATES, OPEN_FONT_FINDINGS } from "../reader/fontAudit";
import { fontComparisonBlocks } from "../reader/fontSample";
import { ayahsOnPage, pageByNumber, pageCount } from "../reader/model";
import { QURAN_LAYOUT_PROFILE } from "../reader/profile";
import UthmanProbe from "./UthmanProbe";

type LoadedFace = {
  family: string;
  label: string;
  version: string;
  status: string;
};

type Measure = {
  lines: number;
  height: number;
  overflow: boolean;
};

const boxStyle = {
  width: QURAN_LAYOUT_PROFILE.textAreaWidthPx,
  fontSize: QURAN_LAYOUT_PROFILE.fontSizePx,
  lineHeight: QURAN_LAYOUT_PROFILE.lineHeight,
  letterSpacing: 0,
} as const;

type PageMeasure = {
  face: string;
  height: number;
  lines: number;
  overflow: boolean;
  width: number;
};

const NOTO_FACE = 'var(--font-naskh), "Noto Naskh Arabic", serif';

export default function FontComparison() {
  const blocks = useMemo(() => fontComparisonBlocks(), []);
  const [faces, setFaces] = useState<LoadedFace[]>([]);
  const [measures, setMeasures] = useState<Record<string, Measure>>({});
  const [pageNumber, setPageNumber] = useState(413);
  const [pdmsFamily, setPdmsFamily] = useState<string | null>(null);
  const [pdmsStatus, setPdmsStatus] = useState("not loaded");
  const [pageMeasures, setPageMeasures] = useState<PageMeasure[]>([]);
  const page = pageByNumber(pageNumber);
  const pageAyahs = useMemo(() => (page ? ayahsOnPage(page.page) : []), [page]);

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const next: Record<string, Measure> = {};
      for (const node of document.querySelectorAll<HTMLElement>("[data-font-panel]")) {
        const id = node.dataset.fontPanel;
        const body = node.querySelector<HTMLElement>("[data-font-body]");
        if (!id || !body) continue;
        const range = document.createRange();
        range.selectNodeContents(body);
        next[id] = {
          lines: range.getClientRects().length,
          height: Math.round(body.scrollHeight),
          overflow: body.scrollHeight > body.clientHeight + 1,
        };
      }
      setMeasures(next);
    };
    void document.fonts.ready.then(() => requestAnimationFrame(measure));
    return () => {
      cancelled = true;
    };
  }, [faces, pdmsFamily, pageNumber]);

  useEffect(() => {
    let cancelled = false;
    const measurePages = () => {
      if (cancelled) return;
      const next: PageMeasure[] = [];
      for (const node of document.querySelectorAll<HTMLElement>("[data-qalam-face]")) {
        const flows = [...node.querySelectorAll<HTMLElement>("p[dir='rtl']")];
        const lines = flows.reduce((sum, flow) => {
          const range = document.createRange();
          range.selectNodeContents(flow);
          return sum + range.getClientRects().length;
        }, 0);
        next.push({
          face: node.dataset.qalamFace ?? "",
          height: Math.round(node.scrollHeight),
          lines,
          overflow: node.scrollHeight > QURAN_LAYOUT_PROFILE.pageMinHeightPx + 1,
          width: Math.round(node.getBoundingClientRect().width),
        });
      }
      setPageMeasures(next);
    };
    void document.fonts.ready.then(() => requestAnimationFrame(measurePages));
    return () => {
      cancelled = true;
    };
  }, [pdmsFamily, pageNumber]);

  const onPdms = async (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const family = "qalam-local-pdms";
    try {
      const face = new FontFace(family, `url(${url})`);
      await face.load();
      document.fonts.add(face);
      setPdmsFamily(family);
      setPdmsStatus(`${file.name}; local only; not production`);
    } catch {
      setPdmsFamily(null);
      setPdmsStatus("failed to load");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const shiftPage = (delta: number) => {
    setPageNumber((current) => Math.min(pageCount(), Math.max(1, current + delta)));
  };

  const onFiles = async (list: FileList | null) => {
    if (!list) return;
    const loaded: LoadedFace[] = [];
    for (const file of Array.from(list)) {
      const url = URL.createObjectURL(file);
      const family = `qalam-local-${loaded.length}-${file.name.replace(/[^A-Za-z0-9]+/g, "-")}`;
      const face = new FontFace(family, `url(${url})`);
      try {
        await face.load();
        document.fonts.add(face);
        const known = FONT_CANDIDATES.find((item) => item.filename === file.name);
        loaded.push({
          family,
          label: file.name,
          version: known?.version ?? "local file",
          status: known ? `${known.licenseStatus}; not production` : "local file; not production",
        });
      } catch {
        loaded.push({ family: "", label: file.name, version: "unreadable", status: "failed to load" });
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    setFaces(loaded);
  };

  const panels = [
    {
      family: "var(--font-naskh), 'Noto Naskh Arabic', serif",
      label: QURAN_LAYOUT_PROFILE.productionFont,
      version: "production",
      status: "production",
    },
    ...faces.filter((face) => face.family),
  ];

  return (
    <main className="bg-[#efe8da] px-4 py-6 text-[#1c140c]" dir="ltr">
      <h1 className="text-xl font-semibold">Quran font comparison</h1>
      <section className="mt-4">
        <h2 className="text-lg font-semibold">Same Qalam page</h2>
        <p className="mt-1 max-w-3xl text-sm text-[#6d5a3c]">
          Loads a local PDMS file in this tab only. Both columns use the existing {pageCount()}-page map and the same ayah text. Pagination is not recalculated.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <label>
            Qalam page
            <input
              className="ms-2 w-24 border border-[#c4a36a]/50 bg-white px-2 py-1"
              type="number"
              min={1}
              max={pageCount()}
              value={pageNumber}
              aria-label="Qalam page number"
              onChange={(event) => setPageNumber(Number(event.target.value) || 1)}
            />
          </label>
          {[1, 2, 64, 413, 887].map((preset) => (
            <button key={preset} type="button" className="border border-[#c4a36a]/50 px-2 py-1" onClick={() => setPageNumber(preset)}>
              {preset}
            </button>
          ))}
          <label>
            Local PDMS Saleem
            <input
              className="mt-1 block"
              type="file"
              accept=".ttf,font/ttf"
              aria-label="Choose local PDMS Saleem font"
              onChange={(event) => void onPdms(event.target.files?.[0])}
            />
          </label>
          <span>{pdmsStatus}</span>
        </div>
        {pageMeasures.length > 0 && (
          <p className="mt-2 text-sm text-[#6d5a3c]">
            {pageMeasures.map((item) => `${item.face}: ${item.height}px, ${item.lines} flow rects, width ${item.width}px, overflow ${item.overflow ? "yes" : "no"}`).join(" · ")}
          </p>
        )}
        {page && (
          <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
            <div>
              <p className="mb-2 text-sm">Noto Naskh Arabic · page {page.page}</p>
              <QuranPageSurface
                surah={page.surahStart}
                ayah={page.ayahStart}
                pageNumber={page.page}
                ayahs={pageAyahs}
                fontFamily={NOTO_FACE}
                scale={1}
                idPrefix="noto-"
                faceLabel="Noto Naskh Arabic"
                onPreviousPage={() => shiftPage(-1)}
                onNextPage={() => shiftPage(1)}
              />
            </div>
            <div>
              <p className="mb-2 text-sm">PDMS Saleem · page {page.page}</p>
              <QuranPageSurface
                surah={page.surahStart}
                ayah={page.ayahStart}
                pageNumber={page.page}
                ayahs={pageAyahs}
                fontFamily={pdmsFamily ? `"${pdmsFamily}", ${NOTO_FACE}` : NOTO_FACE}
                scale={1}
                idPrefix="pdms-"
                faceLabel="PDMS Saleem"
                onPreviousPage={() => shiftPage(-1)}
                onNextPage={() => shiftPage(1)}
              />
            </div>
          </div>
        )}
      </section>
      <p className="mt-8 max-w-3xl text-sm text-[#6d5a3c]">
        Local test only. Choose TTF files on this machine. They stay in this browser tab, are not uploaded, and are not saved.
        Every panel uses the same canonical text, width, size, and line height. Production remains {QURAN_LAYOUT_PROFILE.productionFont}.
      </p>
      <ul className="mt-3 max-w-3xl text-sm text-[#6d5a3c]">
        {OPEN_FONT_FINDINGS.map((item) => (
          <li key={item.id}>
            {item.family}: web {item.webEmbedding}; corpus coverage {item.corpusCoverageComplete ? "complete" : "incomplete"}; not production
          </li>
        ))}
      </ul>
      <label className="mt-4 block text-sm">
        Local Quran fonts
        <input
          className="mt-1 block"
          type="file"
          accept=".ttf,.otf,font/ttf,font/otf"
          multiple
          aria-label="Choose local Quran font files"
          onChange={(event) => void onFiles(event.target.files)}
        />
      </label>
      <div className="mt-6 flex flex-col gap-8">
        {panels.map((panel) => {
          const measure = measures[panel.label];
          return (
            <section key={panel.label} data-font-panel={panel.label} className="bg-white p-4">
              <p className="text-sm">
                {panel.label} · {panel.version} · {panel.status}
                {measure ? ` · lines ${measure.lines} · height ${measure.height}px · overflow ${measure.overflow ? "yes" : "no"}` : ""}
              </p>
              <div
                data-font-body
                dir="rtl"
                lang="ar"
                className="mt-3 overflow-auto border border-[#e7d3ae] bg-[#fbf6ea] p-6"
                style={{ ...boxStyle, fontFamily: panel.family, maxHeight: QURAN_LAYOUT_PROFILE.pageMinHeightPx, unicodeBidi: "plaintext" }}
              >
                {blocks.map((block) => (
                  <div key={block.id} className="mb-4">
                    <div className="mb-2 text-center">{block.label}</div>
                    <p className="text-justify">
                      {block.ayahs.map((ayah, index) => (
                        <span key={ayah.id} className="quran-ayah inline">
                          {index > 0 ? " " : ""}
                          {ayah.text}
                        </span>
                      ))}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <UthmanProbe />
    </main>
  );
}
