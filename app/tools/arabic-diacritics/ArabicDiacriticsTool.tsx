"use client";

import { useMemo, useState } from "react";
import { GOLDEN_INPUT } from "./engine/goldenPassage";
import { diacritizeArabic } from "./engine/diacritizeArabic";

export default function ArabicDiacriticsTool() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const result = useMemo(() => diacritizeArabic(input), [input]);
  const vocalized = result.reviews.filter((item) => item.status !== "unchanged");
  const unchanged = result.reviews.filter((item) => item.status === "unchanged");

  const copy = async () => {
    if (!result.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="site-container">
      <div className="bg-white dark:bg-[#13261c] p-6 md:p-8 rounded-2xl border border-[#1A3A2A]/15 shadow-md">
        <p className="mb-4 text-sm leading-relaxed text-[#3d3d3d] dark:text-[#c8d8cc]" dir="rtl" lang="ur">
          یہ اردو اعراب نہیں ہے۔ سادہ عربی کو پاکستانی مطبوعہ انداز میں اعراب دیتا ہے۔ جو لفظ یقینی نہ ہو وہ جوں کا توں رہتا ہے۔
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-[#1A3A2A]/20 px-3 py-1.5 text-sm text-[#1A3A2A] dark:text-[#e8ede9]"
            onClick={() => setInput(GOLDEN_INPUT)}
          >
            نمونہ
          </button>
          <button
            type="button"
            className="rounded-lg border border-[#1A3A2A]/20 px-3 py-1.5 text-sm"
            onClick={() => setInput("")}
          >
            صاف کریں
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#1A3A2A] dark:text-[#8faa93]">Input</span>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              dir="rtl"
              lang="ar"
              spellCheck={false}
              className="min-h-64 w-full rounded-xl border border-[#1A3A2A]/20 bg-[#F7F5EF] p-4 font-naskh text-lg leading-9 text-[#1A3A2A] dark:bg-[#0e1c15] dark:text-[#e8ede9]"
            />
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#1A3A2A] dark:text-[#8faa93]">Output</span>
              <button
                type="button"
                onClick={copy}
                disabled={!result.output}
                className="rounded-lg bg-[#1A3A2A] px-3 py-1.5 text-sm text-white disabled:opacity-40"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div
              dir="rtl"
              lang="ar"
              className="min-h-64 whitespace-pre-wrap rounded-xl border border-[#B8935A]/40 bg-white p-4 font-naskh text-lg leading-9 text-[#1A3A2A] dark:bg-[#0e1c15] dark:text-[#e8ede9]"
            >
              {result.output}
            </div>
          </div>
        </div>
        <div className="mt-6" dir="rtl">
          <h2 className="text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9]">جائزہ</h2>
          <p className="mt-1 text-sm text-[#4a6a4a]">
            اعراب شدہ: {vocalized.length} · بغیر تبدیلی: {unchanged.length}
          </p>
          {vocalized.length > 0 && (
            <ul className="mt-3 max-h-56 space-y-1 overflow-auto text-sm font-naskh">
              {vocalized.slice(0, 40).map((item, index) => (
                <li key={`${item.source}-${index}`} className="rounded-lg bg-[#F7F5EF] px-3 py-1 dark:bg-[#0e1c15]">
                  <span>{item.source}</span>
                  <span className="px-2 text-[#B8935A]">→</span>
                  <span>{item.output}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
