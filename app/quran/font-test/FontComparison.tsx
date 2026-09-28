"use client";

import { useEffect, useMemo, useState } from "react";
import { FONT_CANDIDATES } from "../reader/fontAudit";
import { fontComparisonBlocks } from "../reader/fontSample";
import { QURAN_LAYOUT_PROFILE } from "../reader/profile";

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

export default function FontComparison() {
  const blocks = useMemo(() => fontComparisonBlocks(), []);
  const [faces, setFaces] = useState<LoadedFace[]>([]);
  const [measures, setMeasures] = useState<Record<string, Measure>>({});

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
  }, [faces]);

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
      <p className="mt-2 max-w-3xl text-sm text-[#6d5a3c]">
        Local test only. Choose TTF files on this machine. They stay in this browser tab, are not uploaded, and are not saved.
        Every panel uses the same canonical text, width, size, and line height. Production remains {QURAN_LAYOUT_PROFILE.productionFont}.
      </p>
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
    </main>
  );
}
