"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, Check, ChevronDown } from "lucide-react";
import type { QuranUrduTranslator } from "./reader/translationCorpus";

const TRANSLATORS: readonly { id: QuranUrduTranslator; label: string }[] = [
  { id: "mohsin-najfi", label: "علامہ شیخ محسن علی نجفی" },
  { id: "safdar-najfi", label: "علامہ سید صفدر حسین نجفی (تفسیر نمونہ)" },
];

const ALVI_FONT = '"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif';

/**
 * In-page selection avoids Android's oversized native select dialog and
 * ensures the approved Alvi Nastaleeq font renders on mobile and desktop.
 */
export default function QuranUrduTranslatorPicker({
  value,
  onChange,
}: {
  value: QuranUrduTranslator;
  onChange: (next: QuranUrduTranslator) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Record<QuranUrduTranslator, HTMLButtonElement | null>>({
    "mohsin-najfi": null,
    "safdar-najfi": null,
  });
  const selected = TRANSLATORS.find((item) => item.id === value) ?? TRANSLATORS[0];

  useEffect(() => {
    if (!open) return;
    optionRefs.current[value]?.focus();
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, value]);

  const choose = (next: QuranUrduTranslator) => {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  };

  const focusOption = (index: number) => {
    optionRefs.current[TRANSLATORS[(index + TRANSLATORS.length) % TRANSLATORS.length].id]?.focus();
  };

  return (
    <div
      ref={container}
      className="relative z-30 mx-auto mt-4 w-full max-w-[370px] text-center"
      dir="rtl"
      lang="ur"
      style={{ fontFamily: ALVI_FONT, fontSynthesis: "none" }}
      data-quran-translator-picker
    >
      <div className="rounded-2xl border border-[#c9ba90] bg-gradient-to-b from-[#f9f6ec] to-[#efe9d8] px-3 py-3 shadow-[0_3px_12px_rgba(52,65,41,0.09)] sm:px-4">
        <div
          id={id + "-label"}
          className="text-center text-[18px] leading-[2] text-[#284a36] sm:text-[19px]"
        >
          مترجم منتخب کریں
        </div>
        <div aria-hidden="true" className="mx-auto mb-2 h-[2px] w-12 rounded-full bg-[#b69d62]" />
        <button
          type="button"
          ref={trigger}
          aria-labelledby={id + "-label " + id + "-selected"}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={id + "-options"}
          onClick={() => setOpen((previous) => !previous)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
            }
            if (event.key === "Escape") setOpen(false);
          }}
          className="flex min-h-[54px] w-full items-center justify-between gap-2 rounded-xl border border-[#b8b39e] bg-[#fffdf7] px-3 text-[#263b2b] shadow-sm transition-colors hover:border-[#829777] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f684b]"
        >
          <span className="flex shrink-0 items-center justify-center rounded-lg bg-[#edf2e8] p-2 text-[#39644a]" aria-hidden="true">
            <BookOpen size={18} strokeWidth={1.8} />
          </span>
          <span id={id + "-selected"} className="min-w-0 flex-1 text-center text-[17px] leading-[2] sm:text-[18px]">
            {selected.label}
          </span>
          <ChevronDown
            aria-hidden="true"
            size={18}
            strokeWidth={2}
            className={"shrink-0 text-[#537057] transition-transform " + (open ? "rotate-180" : "")}
          />
        </button>
      </div>

      {open ? (
        <div
          id={id + "-options"}
          role="listbox"
          aria-labelledby={id + "-label"}
          className="absolute inset-x-0 top-[calc(100%+5px)] z-50 overflow-hidden rounded-xl border border-[#c7ba9c] bg-[#fffdf6] p-1 shadow-[0_12px_32px_rgba(34,46,35,0.24)]"
        >
          {TRANSLATORS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === value}
              ref={(node) => { optionRefs.current[item.id] = node; }}
              tabIndex={-1}
              onClick={() => choose(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                  trigger.current?.focus();
                } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  focusOption(index + (event.key === "ArrowDown" ? 1 : -1));
                } else if (event.key === "Home" || event.key === "End") {
                  event.preventDefault();
                  focusOption(event.key === "Home" ? 0 : TRANSLATORS.length - 1);
                } else if (event.key === "Tab") {
                  setOpen(false);
                }
              }}
              className={
                "flex min-h-[52px] w-full items-center justify-between gap-2 rounded-lg px-3 text-right text-[16px] leading-[2] sm:text-[17px] focus-visible:outline-2 focus-visible:outline-[#447455] " +
                (item.id === value
                  ? "bg-[#e5eee1] text-[#1d4530]"
                  : "text-[#303b2f] hover:bg-[#f1ede0] focus-visible:bg-[#f1ede0]")
              }
            >
              <span className="min-w-0 flex-1">{item.label}</span>
              <span aria-hidden="true" className="w-5 shrink-0 text-[#2e6844]">
                {item.id === value ? <Check size={19} strokeWidth={2.1} /> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
