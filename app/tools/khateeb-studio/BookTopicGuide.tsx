"use client";
import { useEffect, useRef, useState } from "react";
import { PATIENCE_ANGLES, PATIENCE_QURAN, patienceTiming, createPatienceBookDraft, patienceGuideText, type PatienceMaterial } from "./engine/patienceBookGuide";
import type { CustomSermonProject } from "./engine/customSermonProject";
import type { SermonDuration } from "./engine/sermonPrep";
import { bookExcerptText } from "./engine/bookLibrary";
import KhateebScriptText from "./KhateebScriptText";
import { useCopyFeedback } from "./useCopyFeedback";
import ClipboardFeedback from "./ClipboardFeedback";
export default function BookTopicGuide({ locale, onCreateDraft, onOpen }: { locale: "ur" | "en"; onCreateDraft?: (project: CustomSermonProject) => void; onOpen: (id: string, sourceId: string) => void }) {
  const ur = locale === "ur";
  const [duration, setDuration] = useState<SermonDuration>(30);
  const [materials, setMaterials] = useState<PatienceMaterial[] | null>(null);
  const [unavailable, setUnavailable] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>(PATIENCE_ANGLES.map(a => a.id));
  const feedback = useCopyFeedback();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const chosen = materials?.filter(m => selected.includes(m.angleId)) ?? [];
  async function load() {
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/khateeb/library?op=topic&topicId=patience&language=${locale}`, { cache: "no-store", signal: abort.signal });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!Array.isArray(data.materials)) throw new Error();
      if (abort.signal.aborted) return;
      setMaterials(data.materials); setUnavailable(data.unavailable);
    } catch { if (!abort.signal.aborted) setError(ur ? "موضوعاتی مواد نہیں کھل سکا۔ دوبارہ کوشش کریں۔" : "Topic material could not be loaded. Please retry."); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border border-[#31513a]/30 p-4" data-testid="patience-book-guide">
    <h3 className="font-bold">{ur ? "موضوعاتی تیاری — صبر" : "Topic preparation — patience"}</h3>
    <p className="text-sm leading-7">{ur ? "یہ پہلا مرتب شدہ موضوع ہے۔ اصل عربی، فراہم کردہ ترجمہ اور تدوینی رہنمائی الگ ہیں۔ یہ آزاد سوالات کا خودکار جواب نہیں۔" : "This is the first curated topic. Original Arabic, supplied translation and editorial guidance are separate."}</p>
    <label>{ur ? "دورانیہ " : "Duration "}<select value={duration} onChange={e => setDuration(Number(e.target.value) as SermonDuration)} className="rounded border bg-transparent p-2">{[20,30,45].map(n => <option key={n} value={n}>{n} {ur ? "منٹ" : "minutes"}</option>)}</select></label>
    <button type="button" disabled={busy} onClick={load} className="mx-2 rounded bg-[#31513a] px-3 py-2 text-white disabled:opacity-50">{busy ? (ur ? "مواد کھل رہا ہے…" : "Loading…") : (ur ? "صبر کا مواد کھولیں" : "Open patience material")}</button>
    {error ? <p role="alert">{error}</p> : null}
    <ClipboardFeedback state={feedback.state} onDismiss={feedback.dismiss} />
    {materials ? <>
      {unavailable > 0 ? <p role="alert">{ur ? "کچھ منتخب حوالے اس ذخیرے کے نسخے سے مطابقت نہیں رکھتے؛ مکمل مسودہ بنانے سے پہلے ذخیرہ درست کریں۔" : "Some references do not match this corpus edition. Update the corpus before creating a complete draft."}</p> : null}
      <p className="leading-7">{(ur ? ["تمہید اور قرآن", "چھ زاویے اور اصل اقتباسات", "آج کی تطبیق", "اختتام اور عملی قدم"] : ["Opening and Quran", "Six angles and source passages", "Application", "Closing and action"]).map((label,i) => `${label}: ${patienceTiming(duration)[i]} ${ur ? "منٹ" : "min"}`).join(" | ")}</p>
      <div className="space-y-3"><h4 className="font-bold">{ur ? "قرآنی بنیاد — اصل عبارت" : "Quran foundation — original text"}</h4>{PATIENCE_QURAN.map(q => <div key={q.reference}><p><span>{q.reference.split(" ").slice(0, -1).join(" ")}</span>{" "}<bdi dir="ltr">{q.reference.split(" ").at(-1)}</bdi></p><KhateebScriptText text={q.text} forceArabic /></div>)}</div>
      {PATIENCE_ANGLES.map(a => <article key={a.id} className="space-y-3 border-t pt-4">
        <label className="flex gap-2 font-bold"><input type="checkbox" checked={selected.includes(a.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids,a.id] : ids.filter(id => id !== a.id))} />{a[locale][0]}</label>
        <p><strong>{ur ? "تدوینی وضاحت: " : "Editorial explanation: "}</strong>{a[locale][1]}</p>
        <p><strong>{ur ? "مثال: " : "Example: "}</strong>{a[locale][2]}</p>
        <p><strong>{ur ? "سامعین سے سوال: " : "Audience question: "}</strong>{a[locale][3]}</p>
        <p><strong>{ur ? "عملی قدم: " : "Action: "}</strong>{a[locale][4]}</p>
        {materials.filter(m => m.angleId === a.id).map(m => <div key={m.excerpt.id} className="rounded bg-[#31513a]/5 p-3">
          <strong>{m.excerpt.language === "ar" ? (ur ? "اصل عربی عبارت" : "Original Arabic") : (ur ? "فراہم کردہ ترجمہ" : "Supplied translation")}</strong>
          <div className="whitespace-pre-wrap leading-8"><KhateebScriptText text={bookExcerptText(m.excerpt, locale)} /></div>
          <button type="button" onClick={() => onOpen(m.excerpt.recordId,m.excerpt.sourceId)} className="mt-2 underline">{ur ? "مکمل ماخذ دیکھیں" : "Read full source"}</button>
        </div>)}
      </article>)}
      <button type="button" disabled={!selected.length} onClick={() => feedback.copy(patienceGuideText(chosen,locale,duration))} className="rounded border p-2">{ur ? "منتخب مواد حوالوں سمیت نقل کریں" : "Copy selected material with references"}</button>
      {onCreateDraft ? <button type="button" disabled={unavailable > 0 || selected.length !== 6} onClick={() => onCreateDraft(createPatienceBookDraft(chosen,locale,duration))} className="mx-2 rounded bg-[#31513a] p-2 text-white disabled:opacity-50">{ur ? "مکمل تیاری میری مجلس میں محفوظ کریں" : "Save complete preparation to My Sermon"}</button> : null}
      {selected.length !== 6 ? <p className="text-sm">{ur ? "منتخب حصے نقل کیے جا سکتے ہیں؛ مکمل مسودے کے لیے چھوں زاویے منتخب کریں۔" : "Copy selected passages; select all six angles for a complete draft."}</p> : null}
    </> : null}
  </section>;
}
