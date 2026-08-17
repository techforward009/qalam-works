"use client";
import React from "react";
import type { TranslationProject } from "../utils/translationTypes";
import { SUPPORTED_LANGUAGES } from "../utils/translationTypes";

interface ProjectListPanelProps {
  projects: TranslationProject[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  isUr?: boolean;
}

function langLabel(id: string) {
  return SUPPORTED_LANGUAGES.find(l => l.id === id)?.label.split(" — ")[0] ?? id;
}

export default function ProjectListPanel({ projects, onOpen, onDelete, onNew, isUr }: ProjectListPanelProps) {
  const t = {
    title: isUr ? "ٹرانسلیشن اسٹوڈیو" : "Translation Studio",
    savedOnDevice: isUr ? "اس ڈیوائس پر محفوظ" : "Saved on this device",
    newProject: isUr ? "+ نیا پروجیکٹ" : "+ New Project",
    noProjects: isUr ? "ابھی کوئی پروجیکٹ نہیں۔ شروع کرنے کے لیے ایک بنائیں۔" : "No projects yet. Create one to get started.",
    segments: isUr ? "سیگمنٹ" : "segments",
    final: isUr ? "حتمی" : "final",
    draft: isUr ? "مسودہ" : "draft",
    updated: isUr ? "تازہ کاری" : "Updated",
    open: isUr ? "کھولیں" : "Open",
    deleteName: (name: string) => isUr ? `"${name}" حذف کریں؟` : `Delete "${name}"?`,
  };
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A3A2A]">{t.title}</h1>
          <p className="text-sm text-gray-500">{t.savedOnDevice}</p>
        </div>
        <button onClick={onNew} className="h-10 px-4 rounded-lg bg-[#1A3A2A] text-white text-sm font-semibold hover:bg-[#12172A]">
          {t.newProject}
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📄</p>
          <p className="text-sm">{t.noProjects}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {projects.map(p => {
            const segTotal = p.segments.length;
            const segFinal = p.segments.filter(s => s.status === "final").length;
            const segDraft = p.segments.filter(s => s.status === "draft").length;
            return (
              <li key={p.id} className="border border-[#1A3A2A]/10 rounded-lg bg-white p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1A3A2A] truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {langLabel(p.sourceLanguage)} → {langLabel(p.targetLanguage)} · {segTotal} {t.segments} · {segFinal} {t.final} / {segDraft} {t.draft}
                  </p>
                  <p className="text-xs text-gray-400">{t.updated} {new Date(p.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => onOpen(p.id)} className="h-9 px-4 rounded-md border border-[#1A3A2A]/20 text-sm font-medium text-[#1A3A2A] hover:bg-[#F3F7F2]">
                    {t.open}
                  </button>
                  <button onClick={() => { if (window.confirm(t.deleteName(p.name))) onDelete(p.id); }} className="h-9 px-3 rounded-md border border-red-200 text-sm text-red-600 hover:bg-red-50">
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
