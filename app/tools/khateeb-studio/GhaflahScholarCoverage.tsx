"use client";
import { ghaflahScholarCoverage } from "./engine/ghaflahCoverage";

/** Source audit, not an assurance that every speaker's entire sermon has been transcribed. */
const entries = ghaflahScholarCoverage();
const reviewed = entries.filter(row => row.status === "source-analysed").length;
const catalog = entries.filter(row => row.status === "catalog-only").length;
const missing = entries.filter(row => row.status === "not-researched").length;

export default function GhaflahScholarCoverage({ ur }: { ur: boolean }) {
 return <details data-testid="ghaflah-scholar-coverage" className="khateeb-no-print mt-5 rounded-xl border border-[#B8935A]/30 bg-[#fffdf8] p-4 dark:border-[#6f5b35] dark:bg-[#201d15]">
  <summary className="cursor-pointer text-sm font-bold leading-8 text-[#1A3A2A] dark:text-[#e7eee9]">
   {ur ? `۲۹ علما کی تقریروں کا تحقیقی حساب — ماخذی جائزہ: ${reviewed}، صرف نشاندہی: ${catalog}، باقی: ${missing}`
       : `29 scholars' research audit — reviewed sources: ${reviewed}, indexed only: ${catalog}, pending: ${missing}`}
  </summary>
  <p className="mt-3 text-sm leading-8 text-[#5a675d] dark:text-[#b8c8bb]">
   {ur?"صرف عالم کا نام اس بات کا ثبوت نہیں کہ غفلت پر ان کی پوری تقریر پڑھ لی گئی ہے۔ یہاں قابلِ ملاحظہ اصل ماخذ اور تحقیق کی حقیقی حالت دی گئی ہے؛ مکمل مکتوب خطابات اور جزوی خلاصے الگ شمار ہوتے ہیں۔":
       "A scholar's name is not proof that their complete speech on Ghaflah has been studied. Source-checked excerpts, indexed leads and unresearched names are distinguished."}
  </p>
  <ul className="mt-3 grid gap-2 md:grid-cols-2">
   {entries.map(item => {
    const status=ur ? item.status==="source-analysed" ? "متعلقہ متن کا جائزہ" : item.status==="catalog-only" ? "صرف ماخذ کی نشاندہی" : "اس موضوع پر تحقیق باقی"
       : item.status==="source-analysed" ? "Reviewed source" : item.status==="catalog-only" ? "Source indexed only" : "Research pending";

    return <li key={item.scholarId} className="rounded-lg border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#162a1e]">
     <span className="block text-sm font-bold leading-7 text-[#263d2f] dark:text-[#d7e1d9]">{item.scholarName}</span>
     <span className="block text-xs leading-6 text-[#69776d] dark:text-[#a8c8b0]">{status}{item.records.length>0 ? ` · ${item.records.length} ${ur?"ماخذ":"records"}` : ""}</span>
    </li>;
   })}
  </ul>
 </details>;
}
