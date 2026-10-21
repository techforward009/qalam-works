"use client";
import KhateebScriptText, { renderKhateebSalawat } from "./KhateebScriptText";
type PassageLanguage = "ar" | "ur" | "en";
function PassageScript({ text, language, quran, digitalKhatt }: { text: string; language: PassageLanguage; quran: boolean; digitalKhatt: boolean }) {
  if (language === "ar" && digitalKhatt) return <span lang="ar" dir="rtl" className="qalam-knowledge-digital-khatt-quran">{text}</span>;
  return language === "ar" && !quran ? <span lang="ar" dir="rtl" className="qalam-book-arabic">{renderKhateebSalawat(text)}</span> : language === "ar" ? <KhateebScriptText text={text} forceArabic /> : language === "ur" ? <KhateebScriptText text={text} forceUrdu /> : <>{renderKhateebSalawat(text)}</>;
}
export default function BookPassageText({ text, language, highlight, quran = false, digitalKhatt = false }: { text: string; language: PassageLanguage; highlight?: string; quran?: boolean; digitalKhatt?: boolean }) {
  const position = highlight ? text.indexOf(highlight) : -1;
  return <div lang={language} dir={language === "en" ? "ltr" : "rtl"} className={`khateeb-book-text khateeb-book-${language} ${language === "ar" && !quran && !digitalKhatt ? "qalam-book-arabic" : ""} ${digitalKhatt ? "khateeb-book-digital-khatt" : ""} whitespace-pre-wrap break-words leading-9`}>
    {position >= 0 && highlight ? <><PassageScript text={text.slice(0, position)} language={language} quran={quran} digitalKhatt={digitalKhatt} /><mark className="rounded bg-amber-100 text-inherit dark:bg-amber-900/50"><PassageScript text={highlight} language={language} quran={quran} digitalKhatt={digitalKhatt} /></mark><PassageScript text={text.slice(position + highlight.length)} language={language} quran={quran} digitalKhatt={digitalKhatt} /></> : <PassageScript text={text} language={language} quran={quran} digitalKhatt={digitalKhatt} />}
  </div>;
}
