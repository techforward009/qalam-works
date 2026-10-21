"use client";
import type {ReactNode} from "react";
export function QuranSidebarSection({title,children,defaultOpen=false,titleStyle}:{title:string;children:ReactNode;defaultOpen?:boolean;titleStyle?:{fontFamily:string}}){return <details className="tanzil-sidebar-section" open={defaultOpen}><summary style={titleStyle}>{title}</summary><div className="px-2 pb-2 pt-1">{children}</div></details>}
export function QuranPageArrow({direction,label,disabled,onClick}:{direction:"previous"|"next";label:string;disabled:boolean;onClick:()=>void}){return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="quran-page-arrow">{direction==="previous"?"◄":"►"}</button>}
export function QuranPageButtons({previous,next,onPrevious,onNext,disablePrevious,disableNext}:{previous:string;next:string;onPrevious:()=>void;onNext:()=>void;disablePrevious:boolean;disableNext:boolean}){const {language}=useLanguage();return <div className={`quran-outer-page-nav mt-2 flex items-center justify-center gap-6 px-1 text-xs text-[#70776b] ${language === "ur" ? "font-naskh" : ""}`} dir="rtl" lang={language}><button type="button" className="quran-page-turn px-3 py-1.5 disabled:opacity-25" disabled={disablePrevious} onClick={onPrevious}>{previous}</button><button type="button" className="quran-page-turn px-3 py-1.5 disabled:opacity-25" disabled={disableNext} onClick={onNext}>{next}</button></div>}

import {useLanguage} from "../../lib/language-context";
import {juzRunningHead,surahRunningHead} from "./metadata";
import {surahBanner} from "../indopak-digital-khatt/surahBanner";
import {displaySurahBannerName} from "./readerPresentation";
export function QuranPageMeta({
  surah,
  pageNumber,
  juz,
  onPreviousPage,
  onNextPage,
  previousDisabled = false,
  nextDisabled = false,
}: {
  surah: number;
  pageNumber: number;
  juz: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  const { language } = useLanguage();
  const pageLabel =
    language === "ur"
      ? pageNumber.toLocaleString("ur-PK")
      : String(pageNumber);

  return (
    <div
      className="quran-page-meta"
      dir="rtl"
      lang="ar"
    >
      <div className="quran-page-meta-item quran-page-meta-juz">
        <span className="quran-page-meta-juz-name">
          {juzRunningHead(juz)}
        </span>
      </div>

      <div
        className="quran-page-meta-item flex items-center justify-center overflow-visible"
        dir="ltr"
        lang={language === "ur" ? "ur" : "en"}
      >
        <QuranPageArrow
          direction="previous"
          label="Previous page"
          disabled={previousDisabled}
          onClick={
            onPreviousPage
          }
        />

        <span className="quran-page-meta-page-number">
          {pageLabel}
        </span>

        <QuranPageArrow
          direction="next"
          label="Next page"
          disabled={nextDisabled}
          onClick={
            onNextPage
          }
        />
      </div>

      <div className="quran-page-meta-item quran-page-meta-surah">
        <span className="quran-page-meta-surah-name">
          {surahRunningHead(surah)}
        </span>
      </div>
    </div>
  );
}


export function QuranCorner({
  position,
}: {
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
}) {
  return (
    <svg
      className={`quran-corner quran-corner-${position}`}
      viewBox="0 0 72 72"
      aria-hidden="true"
    >
      <path
        d="M7 7H65V12H12V65H7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />

      <path
        d="M15 15H57V18H18V57H15Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
      />

      <path
        d="M22 15C22 27 27 32 39 32C27 32 22 37 22 49C22 37 17 32 5 32C17 32 22 27 22 15Z"
        fill="currentColor"
        opacity="0.72"
      />

      <circle
        cx="51"
        cy="51"
        r="2.5"
        fill="currentColor"
      />
    </svg>
  );
}


export function SurahBand({
  surah,
}: {
  surah: number;
}) {
  const banner = surahBanner(surah);

  return (
    <div
      className="quran-surah-header shrink-0"
      dir="rtl"
      lang="ar"
    >
      <span className="quran-surah-place">{banner.place}</span>
      <span className="quran-banner-name">
        <bdi dir="ltr" className="quran-banner-number">({banner.surahNumber})</bdi>
        <span>{displaySurahBannerName(banner.name)}</span>
        <bdi dir="ltr" className="quran-banner-number">({banner.revealed})</bdi>
      </span>
      <span className="quran-surah-count">
        <span>آیات</span>
        <span className="quran-banner-digit">{banner.ayatCount}</span>
      </span>
    </div>
  );
}
