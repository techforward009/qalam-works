"use client";
import React, { useState, useRef } from "react";
import type { TranslationLanguage, TranslationBrief } from "../utils/translationTypes";
import { SUPPORTED_LANGUAGES, defaultBrief, BRIEF_INSTRUCTIONS_MAX } from "../utils/translationTypes";
import { TRANSLATION_EXAMPLE_SOURCE, TRANSLATION_EXAMPLE_PROJECT_NAME } from "../utils/exampleProject";

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

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) { setError("File too large (max 512 KB)"); return; }
    if (!file.name.toLowerCase().endsWith(".txt")) { setError("Only .txt files supported"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSourceText((ev.target?.result as string) ?? "");
      setError((prev) => (prev === "Source text is required" ? "" : prev));
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Project name is required"); return; }
    if (!sourceText.trim()) { setError("Source text is required"); return; }
    if (sourceLang === targetLang) { setError("Source and target languages must differ"); return; }
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
      <h1 className="text-2xl font-bold text-[#1A3A2A] mb-1">Translation Studio</h1>
      <p className="text-sm text-gray-500 mb-6">New Translation Project</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Project name */}
        <div>
          <label className={labelCls}>Project Name</label>
          <input type="text" className={inputCls} value={name} onChange={e => { setName(e.target.value); if (e.target.value.trim()) setError(prev => prev === "Project name is required" ? "" : prev); }} placeholder="e.g. Annual Report 2026" maxLength={120} />
        </div>

        {/* Language pair */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Source Language</label>
            <select className={inputCls} value={sourceLang} onChange={e => { const v = e.target.value as TranslationLanguage; setSourceLang(v); if (v !== targetLang) setError(prev => prev === 'Source and target languages must differ' ? '' : prev); }}>
              {SUPPORTED_LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Target Language</label>
            <select className={inputCls} value={targetLang} onChange={e => { const v = e.target.value as TranslationLanguage; setTargetLang(v); if (sourceLang !== v) setError(prev => prev === 'Source and target languages must differ' ? '' : prev); }}>
              {SUPPORTED_LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
        </div>

        {/* Brief */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Approach</label>
            <select className={inputCls} value={brief.approach} onChange={e => setBrief(b => ({ ...b, approach: e.target.value as "faithful" | "natural" }))}>
              <option value="faithful">Faithful</option>
              <option value="natural">Natural</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Audience</label>
            <select className={inputCls} value={brief.audience} onChange={e => setBrief(b => ({ ...b, audience: e.target.value as "general" | "academic-professional" }))}>
              <option value="general">General</option>
              <option value="academic-professional">Academic / Professional</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Additional Instructions <span className="font-normal text-gray-400">({BRIEF_INSTRUCTIONS_MAX} chars max)</span></label>
          <textarea className={`${inputCls} resize-none`} rows={2} maxLength={BRIEF_INSTRUCTIONS_MAX} value={brief.additionalInstructions} onChange={e => setBrief(b => ({ ...b, additionalInstructions: e.target.value }))} placeholder="Any specific terminology, register, or style notes…" />
        </div>

        {/* Source text */}
        <div>
          <label className={labelCls}>Source Text</label>
          <div className="flex gap-2 mb-2">
            <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFile} />
            <button type="button" onClick={() => fileRef.current?.click()} className="h-8 px-3 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">Upload .txt</button>
            <button type="button" onClick={handleLoadExample} className="h-8 px-3 rounded-md border border-[#1A3A2A]/20 bg-[#F3F7F2] text-xs font-medium text-[#1A3A2A] hover:bg-[#E8F0E8]">Load Example</button>
          </div>
          <textarea className={`${inputCls} resize-y`} rows={8} value={sourceText} onChange={e => { setSourceText(e.target.value); if (e.target.value.trim()) setError(prev => prev === "Source text is required" ? "" : prev); }} placeholder="Paste source text here, or upload a .txt file. One paragraph per segment." dir="auto" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="w-full h-11 rounded-lg bg-[#1A3A2A] text-white font-semibold text-sm hover:bg-[#12172A] transition-colors">
          Create Project →
        </button>
      </form>
    </div>
  );
}
