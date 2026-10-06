"use client";
import KhateebScriptText, { renderKhateebSalawat } from "./KhateebScriptText";
export default function BookPassageText({ text, language }: { text: string; language: "ar" | "ur" | "en" }) {
  return <div lang={language} dir={language === "en" ? "ltr" : "rtl"} className={`khateeb-book-text khateeb-book-${language} whitespace-pre-wrap break-words leading-9`}>
    {language === "ar" ? <KhateebScriptText text={text} forceArabic /> : language === "ur" ? <KhateebScriptText text={text} forceUrdu /> : renderKhateebSalawat(text)}
  </div>;
}
