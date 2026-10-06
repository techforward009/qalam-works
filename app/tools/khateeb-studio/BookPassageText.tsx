"use client";
import KhateebScriptText, { renderKhateebSalawat } from "./KhateebScriptText";
type PassageLanguage = "ar" | "ur" | "en";
function PassageScript({ text, language }: { text: string; language: PassageLanguage }) {
  return language === "ar" ? <KhateebScriptText text={text} forceArabic /> : language === "ur" ? <KhateebScriptText text={text} forceUrdu /> : <>{renderKhateebSalawat(text)}</>;
}
export default function BookPassageText({ text, language, highlight }: { text: string; language: PassageLanguage; highlight?: string }) {
  const position = highlight ? text.indexOf(highlight) : -1;
  return <div lang={language} dir={language === "en" ? "ltr" : "rtl"} className={`khateeb-book-text khateeb-book-${language} whitespace-pre-wrap break-words leading-9`}>
    {position >= 0 && highlight ? <><PassageScript text={text.slice(0, position)} language={language} /><mark className="rounded bg-amber-100 text-inherit dark:bg-amber-900/50"><PassageScript text={highlight} language={language} /></mark><PassageScript text={text.slice(position + highlight.length)} language={language} /></> : <PassageScript text={text} language={language} />}
  </div>;
}
