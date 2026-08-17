"use client";
import React, { useState, useRef } from "react";
import type { TranslationLanguage, TranslationBrief } from "../utils/translationTypes";
import { SUPPORTED_LANGUAGES, defaultBrief, BRIEF_INSTRUCTIONS_MAX } from "../utils/translationTypes";
import { TRANSLATION_EXAMPLE_SOURCE, TRANSLATION_EXAMPLE_PROJECT_NAME } from "../utils/exampleProject";
import { extractTextFromFile } from "../../../utils/documents/extractTextFromFile";

interface ProjectSetupPanelProps {
  onCreateProject: (params: {
    name: string;
    sourceLanguage: TranslationLanguage;
    targetLanguage: TranslationLanguage;
    brief: TranslationBrief;
    sourceText: string;
  }) => void;
  isUr?: boolean;
}

export default function ProjectSetupPanel({ onCreateProject, isUr }: ProjectSetupPanelProps) {
  const [name, setName] = useState("");
  const [sourceLang, setSourceLang] = useState<TranslationLanguage>("ur");
  const [targetLang, setTargetLang] = useState<TranslationLanguage>("en");
  const [brief, setBrief] = useState<TranslationBrief>(defaultBrief());
  const [sourceText, setSourceText] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const t = {
    title: isUr ? "ٹرانسلیشن اسٹوڈیو" : "Translation Studio",
    subtitle: isUr ? "نیا ترجمہ پروجیکٹ" : "New Translation Project",
    projectName: isUr ? "پروجیکٹ کا نام" : "Project Name",
    projectNamePlaceholder: isUr ? "مثلاً سالانہ رپورٹ 2026" : "e.g. Annual Report 2026",
    sourceLang: isUr ? "ماخذ زبان" : "Source Language",
    targetLang: isUr ? "ہدف زبان" : "Target Language",
    approach: isUr ? "اندازِ ترجمہ" : "Approach",
    audience: isUr ? "قارئین" : "Audience",
    faithful: isUr ? "اصل متن سے وفادار" : "Faithful",
    natural: isUr ? "فطری" : "Natural",
    general: isUr ? "عمومی" : "General",
    academicProfessional: isUr ? "تعلیمی / پیشہ ورانہ" : "Academic / Professional",
    additionalInstructions: isUr ? "اضافی ہدایات" : "Additional Instructions",
    additionalInstructionsPlaceholder: isUr
      ? "مخصوص اصطلاحات، اسلوب یا انداز سے متعلق ہدایات…"
      : "Any specific terminology, register, or style notes…",
    charsMax: (n: number) => isUr ? `(زیادہ سے زیادہ ${n} حروف)` : `(${n} chars max)`,
    sourceText: isUr ? "اصل متن" : "Source Text",
    sourceTextPlaceholder: isUr
      ? "اصل متن یہاں پیسٹ کریں، یا TXT / DOCX فائل اپ لوڈ کریں۔ ہر پیراگراف ایک الگ سیگمنٹ ہوگا۔"
      : "Paste source text here, or upload a .txt or .docx file. One paragraph per segment.",
    uploadBtn: isUr ? "TXT / DOCX اپ لوڈ کریں" : "Upload TXT / DOCX",
    loadExample: isUr ? "مثال لوڈ کریں" : "Load Example",
    docxNote: isUr
      ? "DOCX سے متن ترجمے کے لیے درآمد کیا جاتا ہے؛ اصل دستاویز کی فارمیٹنگ محفوظ نہیں رہتی۔"
      : "DOCX text is imported for translation; document formatting is not preserved.",
    createProject: isUr ? "پروجیکٹ بنائیں" : "Create Project →",
    errNameRequired: isUr ? "پروجیکٹ کا نام ضروری ہے" : "Project name is required",
    errSourceRequired: isUr ? "اصل متن ضروری ہے" : "Source text is required",
    errLangSame: isUr ? "ماخذ اور ہدف زبان مختلف ہونی چاہییں" : "Source and target languages must differ",
    errFileType: isUr ? "صرف .txt اور .docx فائلیں قابلِ قبول ہیں" : "Only .txt and .docx files are supported",
    errFileLarge: isUr ? "فائل بہت بڑی ہے (زیادہ سے زیادہ 512 KB)" : "File too large (max 512 KB)",
    errFileEmpty: isUr ? "فائل میں کوئی قابلِ استعمال متن نہیں" : "File contains no usable text",
    errFileRead: isUr ? "فائل سے متن نہیں نکالا جا سکا۔ کوئی اور فائل آزمائیں۔" : "Could not extract text from file. Please try a different file.",
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const fname = file.name.toLowerCase();
    if (!fname.endsWith(".txt") && !fname.endsWith(".docx")) { setError(t.errFileType); return; }
    if (file.size > 512 * 1024) { setError(t.errFileLarge); return; }
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) { setError(t.errFileEmpty); return; }
      setSourceText(text);
      setError("");
    } catch {
      setError(t.errFileRead);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t.errNameRequired); return; }
    if (!sourceText.trim()) { setError(t.errSourceRequired); return; }
    if (sourceLang === targetLang) { setError(t.errLangSame); return; }
    setError("");
    onCreateProject({ name: name.trim(), sourceLanguage: sourceLang, targetLanguage: targetLang, brief, sourceText });
  };

  const handleLoadExample = () => {
    setName(TRANSLATION_EXAMPLE_PROJECT_NAME);
    setSourceText(TRANSLATION_EXAMPLE_SOURCE);
    setSourceLang("ur");
    setTargetLang("en");
    setError("");
  };

  const inputCls = "w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#1A3A2A] mb-1">{t.title}</h1>
      <p className="text-sm text-gray-500 mb-6">{t.subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Project name */}
        <div>
          <label className={labelCls}>{t.projectName}</label>
          <input type="text" className={inputCls} value={name} onChange={e => { setName(e.target.value); if (e.target.value.trim()) setError(prev => prev === t.errNameRequired ? "" : prev); }} data-testid="project-name-input" placeholder={t.projectNamePlaceholder} maxLength={120} />
        </div>

        {/* Language pair */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t.sourceLang}</label>
            <select className={inputCls} value={sourceLang} onChange={e => { const v = e.target.value as TranslationLanguage; setSourceLang(v); if (v !== targetLang) setError(prev => prev === t.errLangSame ? "" : prev); }}>
              {SUPPORTED_LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t.targetLang}</label>
            <select className={inputCls} value={targetLang} onChange={e => { const v = e.target.value as TranslationLanguage; setTargetLang(v); if (sourceLang !== v) setError(prev => prev === t.errLangSame ? "" : prev); }}>
              {SUPPORTED_LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
        </div>

        {/* Brief */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t.approach}</label>
            <select className={inputCls} value={brief.approach} onChange={e => setBrief(b => ({ ...b, approach: e.target.value as "faithful" | "natural" }))}>
              <option value="faithful">{t.faithful}</option>
              <option value="natural">{t.natural}</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{t.audience}</label>
            <select className={inputCls} value={brief.audience} onChange={e => setBrief(b => ({ ...b, audience: e.target.value as "general" | "academic-professional" }))}>
              <option value="general">{t.general}</option>
              <option value="academic-professional">{t.academicProfessional}</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>{t.additionalInstructions} <span className="font-normal text-gray-400">{t.charsMax(BRIEF_INSTRUCTIONS_MAX)}</span></label>
          <textarea className={`${inputCls} resize-none`} rows={2} maxLength={BRIEF_INSTRUCTIONS_MAX} value={brief.additionalInstructions} onChange={e => setBrief(b => ({ ...b, additionalInstructions: e.target.value }))} placeholder={t.additionalInstructionsPlaceholder} />
        </div>

        {/* Source text */}
        <div>
          <label className={labelCls}>{t.sourceText}</label>
          <div className="flex gap-2 mb-2">
            <input ref={fileRef} type="file" accept=".txt,.docx" className="hidden" onChange={handleFile} />
            <button type="button" onClick={() => fileRef.current?.click()} className="h-8 px-3 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">{t.uploadBtn}</button>
            <button type="button" onClick={handleLoadExample} className="h-8 px-3 rounded-md border border-[#1A3A2A]/20 bg-[#F3F7F2] text-xs font-medium text-[#1A3A2A] hover:bg-[#E8F0E8]">{t.loadExample}</button>
          </div>
          <textarea className={`${inputCls} resize-y`} rows={8} value={sourceText} onChange={e => { setSourceText(e.target.value); if (e.target.value.trim()) setError(prev => prev === t.errSourceRequired ? "" : prev); }} data-testid="source-text-input" placeholder={t.sourceTextPlaceholder} dir="auto" />
          <p className="mt-1 text-xs text-gray-400">{t.docxNote}</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button data-testid="create-project-btn" type="submit" className="w-full h-11 rounded-lg bg-[#1A3A2A] text-white font-semibold text-sm hover:bg-[#12172A] transition-colors">
          {t.createProject}
        </button>
      </form>
    </div>
  );
}
