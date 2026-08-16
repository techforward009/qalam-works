"use client";
import React from "react";
import type { TranslationProject } from "../utils/translationTypes";
import { SUPPORTED_LANGUAGES } from "../utils/translationTypes";

interface ProjectListPanelProps {
  projects: TranslationProject[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

function langLabel(id: string) {
  return SUPPORTED_LANGUAGES.find(l => l.id === id)?.label.split(" — ")[0] ?? id;
}

export default function ProjectListPanel({ projects, onOpen, onDelete, onNew }: ProjectListPanelProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A3A2A]">Translation Studio</h1>
          <p className="text-sm text-gray-500">Saved on this device</p>
        </div>
        <button onClick={onNew} className="h-10 px-4 rounded-lg bg-[#1A3A2A] text-white text-sm font-semibold hover:bg-[#12172A]">
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📄</p>
          <p className="text-sm">No projects yet. Create one to get started.</p>
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
                    {langLabel(p.sourceLanguage)} → {langLabel(p.targetLanguage)} · {segTotal} segments · {segFinal} final / {segDraft} draft
                  </p>
                  <p className="text-xs text-gray-400">Updated {new Date(p.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => onOpen(p.id)} className="h-9 px-4 rounded-md border border-[#1A3A2A]/20 text-sm font-medium text-[#1A3A2A] hover:bg-[#F3F7F2]">
                    Open
                  </button>
                  <button onClick={() => { if (window.confirm(`Delete "${p.name}"?`)) onDelete(p.id); }} className="h-9 px-3 rounded-md border border-red-200 text-sm text-red-600 hover:bg-red-50">
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
