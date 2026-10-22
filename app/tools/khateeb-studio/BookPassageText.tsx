"use client";
import KhateebScriptText, { renderKhateebSalawat } from "./KhateebScriptText";
import { displayArabicBookText } from "../../lib/knowledge/bookArabicDisplay";
type PassageLanguage = "ar" | "ur" | "en";
function PassageScript({ text, language, quran, digitalKhatt, bookArabicDisplay }: { text: string; language: PassageLanguage; quran: boolean; digitalKhatt: boolean; bookArabicDisplay: boolean }) {
  if (language === "ar" && bookArabicDisplay) return <span lang="ar" dir="rtl" className="qalam-book-arabic">{renderKhateebSalawat(displayArabicBookText(text))}</span>;
  if (language === "ar" && digitalKhatt) return <span lang="ar" dir="rtl" className="qalam-knowledge-digital-khatt-quran">{text}</span>;
  return language === "ar" && !quran ? <span lang="ar" dir="rtl" className="qalam-book-arabic">{renderKhateebSalawat(text)}</span> : language === "ar" ? <KhateebScriptText text={text} forceArabic /> : language === "ur" ? <KhateebScriptText text={text} forceUrdu /> : <>{renderKhateebSalawat(text)}</>;
}
export default function BookPassageText({ text, language, highlight, quran = false, digitalKhatt = false, bookArabicDisplay = false }: { text: string; language: PassageLanguage; highlight?: string; quran?: boolean; digitalKhatt?: boolean; bookArabicDisplay?: boolean }) {
  const position = highlight ? text.indexOf(highlight) : -1;
  return <div lang={language} dir={language === "en" ? "ltr" : "rtl"} className={`khateeb-book-text khateeb-book-${language} ${language === "ar" && !quran && !digitalKhatt ? "qalam-book-arabic" : ""} ${digitalKhatt ? "khateeb-book-digital-khatt" : ""} whitespace-pre-wrap break-words leading-9`}>
    {position >= 0 && highlight ? <><PassageScript text={text.slice(0, position)} language={language} quran={quran} digitalKhatt={digitalKhatt} bookArabicDisplay={bookArabicDisplay} /><mark className="rounded bg-amber-100 text-inherit dark:bg-amber-900/50"><PassageScript text={highlight} language={language} quran={quran} digitalKhatt={digitalKhatt} bookArabicDisplay={bookArabicDisplay} /></mark><PassageScript text={text.slice(position + highlight.length)} language={language} quran={quran} digitalKhatt={digitalKhatt} bookArabicDisplay={bookArabicDisplay} /></> : <PassageScript text={text} language={language} quran={quran} digitalKhatt={digitalKhatt} bookArabicDisplay={bookArabicDisplay} />}
  </div>;
}
