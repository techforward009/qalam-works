"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  Copy,
  FilePlus2,
  Library,
  Loader2,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import KhateebScriptText from "./KhateebScriptText";
import {
  CUSTOM_SERMON_PREFIX,
  applyResearchToCustomProject,
  buildCustomSermonText,
  createCustomSermonProject,
  customSermonKindLabel,
  customSermonProjectKey,
  markCustomProjectReady,
  parseCustomSermonProject,
  selectCustomEvidence,
  serializeCustomSermonProject,
  updateCustomSection,
  validateCustomSermonProject,
  type CustomSermonKind,
  type CustomSermonProject,
} from "./engine/customSermonProject";
import type { KhateebResearchResult } from "./engine/researchTypes";
import type { SermonDuration } from "./engine/sermonPrep";

type Props = {
  locale: "ur" | "en";
};

function loadProjects(): CustomSermonProject[] {
  if (typeof window === "undefined") return [];
  const rows: CustomSermonProject[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(`${CUSTOM_SERMON_PREFIX}:`)) continue;
    const parsed = parseCustomSermonProject(window.localStorage.getItem(key));
    if (parsed) rows.push(parsed);
  }
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function saveProject(project: CustomSermonProject): void {
  window.localStorage.setItem(
    customSermonProjectKey(project.id),
    serializeCustomSermonProject(project),
  );
}

export default function CustomSermonWorkspace({ locale }: Props) {
  const ur = locale === "ur";
  const [projects, setProjects] = useState<CustomSermonProject[]>([]);
  const [activeId, setActiveId] = useState("");
  const [kind, setKind] = useState<CustomSermonKind>("majlis");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [ownMaterial, setOwnMaterial] = useState("");
  const [duration, setDuration] = useState<SermonDuration>(30);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    setProjects(loadProjects());
  }, []);

  const active = useMemo(
    () => projects.find((project) => project.id === activeId) ?? null,
    [activeId, projects],
  );

  const replaceProject = (project: CustomSermonProject, persist = true) => {
    setProjects((current) => {
      const next = [
        project,
        ...current.filter((item) => item.id !== project.id),
      ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return next;
    });
    setActiveId(project.id);
    if (persist) saveProject(project);
  };

  const createProject = () => {
    if (!title.trim() || !objective.trim()) return;
    const project = createCustomSermonProject({
      kind,
      title,
      objective,
      ownMaterial,
      duration,
    });
    replaceProject(project);
    setTitle("");
    setObjective("");
    setOwnMaterial("");
    setSavedMessage(
      ur ? "نیا مسودہ محفوظ ہوگیا۔" : "New draft saved.",
    );
  };

  const deleteProject = (project: CustomSermonProject) => {
    window.localStorage.removeItem(customSermonProjectKey(project.id));
    setProjects((current) => current.filter((item) => item.id !== project.id));
    if (activeId === project.id) setActiveId("");
  };

  const runResearch = async () => {
    if (!active) return;
    setResearchLoading(true);
    setResearchError("");
    try {
      const response = await fetch("/api/khateeb/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          query: active.researchQuery || active.title,
          locale,
          maxEvidence: 30,
        }),
      });
      if (!response.ok) throw new Error(`research-${response.status}`);
      const result = (await response.json()) as KhateebResearchResult;
      const project = applyResearchToCustomProject(active, result);
      replaceProject(project);
    } catch {
      setResearchError(
        ur
          ? "تحقیق مکمل نہیں ہوسکی؛ دوبارہ کوشش کریں۔"
          : "Research could not be completed. Please try again.",
      );
    } finally {
      setResearchLoading(false);
    }
  };

  const toggleEvidence = (id: string) => {
    if (!active) return;
    const selected = active.selectedEvidenceIds.includes(id)
      ? active.selectedEvidenceIds.filter((item) => item !== id)
      : [...active.selectedEvidenceIds, id];
    replaceProject(selectCustomEvidence(active, selected));
  };

  const updateSectionText = (sectionId: string, value: string) => {
    if (!active) return;
    replaceProject(updateCustomSection(active, sectionId, value), false);
  };

  const saveActive = () => {
    if (!active) return;
    const ready = markCustomProjectReady(active);
    replaceProject(ready);
    setSavedMessage(ur ? "مسودہ محفوظ ہوگیا۔" : "Draft saved.");
  };

  const copyActive = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(buildCustomSermonText(active, locale));
      setSavedMessage(
        ur ? "مکمل مسودہ نقل ہوگیا۔" : "Full draft copied.",
      );
    } catch {
      setSavedMessage(
        ur ? "نقل نہیں ہوسکا۔" : "Could not copy.",
      );
    }
  };

  return (
    <section className="rounded-2xl border border-[#1A3A2A]/15 bg-[#f7faf7] p-5 dark:border-[#35513d] dark:bg-[#102017] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#47654d] dark:text-[#b9d4bf]">
            <FilePlus2 className="h-4 w-4" />
            {ur ? "میری مجلس / میرا موضوع" : "My sermon / my topic"}
          </div>
          <h2 className="mt-2 text-xl font-bold text-[#1A3A2A] dark:text-white">
            {ur
              ? "اپنی مجلس مرحلہ وار تیار کریں"
              : "Develop your own sermon step by step"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#5f6f61] dark:text-[#a8c8b0]">
            {ur
              ? "اپنا عنوان اور مقصد لکھیں۔ قلم مصدقہ مواد الگ جمع کرے گا، آپ کے اپنے نوٹس الگ رہیں گے، اور تدوینی ربط کو کبھی اصل ماخذ کے الفاظ نہیں بنایا جائے گا۔"
              : "Enter your title and objective. Qalam keeps verified source material, your own notes, and editorial bridges in separate layers."}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#47654d] dark:bg-[#162a1e] dark:text-[#b9d4bf]">
          {projects.length} {ur ? "محفوظ مسودے" : "saved drafts"}
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]">
            <h3 className="font-bold text-[#1A3A2A] dark:text-white">
              {ur ? "نیا مسودہ" : "New draft"}
            </h3>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-xs font-semibold text-[#5f6f61] dark:text-[#a8c8b0]">
                  {ur ? "نوعیت" : "Format"}
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["majlis", "jumuah", "general"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setKind(value)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                        kind === value
                          ? "border-[#1A3A2A] bg-[#1A3A2A] text-white"
                          : "border-[#1A3A2A]/15 bg-white text-[#445247] dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-[#b8c8bb]"
                      }`}
                    >
                      {customSermonKindLabel(value, locale)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="grid gap-1 text-xs font-semibold text-[#5f6f61] dark:text-[#a8c8b0]">
                {ur ? "عنوان" : "Title"}
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={ur ? "مثلاً: رزقِ حلال اور عزتِ نفس" : "e.g. Lawful earning and dignity"}
                  className="rounded-lg border border-[#1A3A2A]/15 bg-white px-3 py-2.5 text-sm font-normal text-[#1A3A2A] outline-none focus:border-[#1A3A2A] dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-white"
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold text-[#5f6f61] dark:text-[#a8c8b0]">
                {ur ? "اس مجلس کا مقصد" : "Objective"}
                <textarea
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                  rows={3}
                  placeholder={
                    ur
                      ? "سامع آخر میں کیا سمجھ کر یا کیا کرنے کا ارادہ لے کر اٹھے؟"
                      : "What should the listener understand or intend to do by the end?"
                  }
                  className="rounded-lg border border-[#1A3A2A]/15 bg-white px-3 py-2.5 text-sm font-normal leading-7 text-[#1A3A2A] outline-none focus:border-[#1A3A2A] dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-white"
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold text-[#5f6f61] dark:text-[#a8c8b0]">
                {ur ? "ابتدائی ذاتی نوٹس — اختیاری" : "Initial personal notes — optional"}
                <textarea
                  value={ownMaterial}
                  onChange={(event) => setOwnMaterial(event.target.value)}
                  rows={4}
                  placeholder={
                    ur
                      ? "واقعہ، مثال، شعر، اپنا نکتہ یا وہ چیز جو آپ ضرور شامل کرنا چاہتے ہیں۔"
                      : "A story, example, verse, personal point, or anything you definitely want included."
                  }
                  className="rounded-lg border border-[#1A3A2A]/15 bg-white px-3 py-2.5 text-sm font-normal leading-7 text-[#1A3A2A] outline-none focus:border-[#1A3A2A] dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-white"
                />
              </label>

              <div>
                <div className="text-xs font-semibold text-[#5f6f61] dark:text-[#a8c8b0]">
                  {ur ? "دورانیہ" : "Duration"}
                </div>
                <div className="mt-2 flex gap-2">
                  {([20, 30, 45] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDuration(value)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                        duration === value
                          ? "bg-[#1A3A2A] text-white"
                          : "bg-[#F1F3EF] text-[#445247] dark:bg-[#0e1c15] dark:text-[#b8c8bb]"
                      }`}
                    >
                      {value} {ur ? "منٹ" : "min"}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={createProject}
                disabled={!title.trim() || !objective.trim()}
                className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[#1A3A2A] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FilePlus2 className="h-4 w-4" />
                {ur ? "مسودہ شروع کریں" : "Start draft"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]">
            <div className="flex items-center gap-2">
              <Library className="h-4 w-4 text-[#47654d] dark:text-[#b9d4bf]" />
              <h3 className="font-bold text-[#1A3A2A] dark:text-white">
                {ur ? "میرے محفوظ مسودے" : "My saved drafts"}
              </h3>
            </div>
            <div className="mt-3 space-y-2">
              {projects.length === 0 ? (
                <p className="text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
                  {ur ? "ابھی کوئی مسودہ محفوظ نہیں۔" : "No saved draft yet."}
                </p>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 ${
                      activeId === project.id
                        ? "border-[#1A3A2A]/40 bg-[#f5faf6] dark:border-[#45604b] dark:bg-[#102017]"
                        : "border-[#1A3A2A]/10 dark:border-[#35513d]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveId(project.id)}
                      className="min-w-0 flex-1 text-start"
                    >
                      <div className="truncate text-sm font-bold text-[#1A3A2A] dark:text-white">
                        {project.title}
                      </div>
                      <div className="mt-1 text-[11px] text-[#687469] dark:text-[#9fb0a2]">
                        {customSermonKindLabel(project.kind, locale)} · {project.duration} {ur ? "منٹ" : "min"} · {project.status === "ready" ? (ur ? "تیار" : "ready") : (ur ? "مسودہ" : "draft")}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProject(project)}
                      className="rounded-md p-2 text-[#8d5e55] hover:bg-red-50 dark:hover:bg-red-950/20"
                      aria-label={ur ? "حذف کریں" : "Delete"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          {!active ? (
            <div className="flex min-h-[340px] items-center justify-center rounded-xl border border-dashed border-[#1A3A2A]/20 bg-white p-8 text-center dark:border-[#35513d] dark:bg-[#162a1e]">
              <div>
                <BookOpenCheck className="mx-auto h-8 w-8 text-[#68806f]" />
                <p className="mt-3 text-sm leading-7 text-[#687469] dark:text-[#9fb0a2]">
                  {ur
                    ? "بائیں طرف نیا مسودہ بنائیں یا محفوظ مسودہ کھولیں۔"
                    : "Create a new draft on the left or open a saved draft."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[#687469] dark:text-[#9fb0a2]">
                      {customSermonKindLabel(active.kind, locale)} · {active.duration} {ur ? "منٹ" : "min"}
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-[#1A3A2A] dark:text-white">
                      {active.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[#445247] dark:text-[#b8c8bb]">
                      <strong>{ur ? "مقصد: " : "Objective: "}</strong>
                      {active.objective}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={saveActive}
                      className="flex items-center gap-2 rounded-lg border border-[#1A3A2A]/20 px-3 py-2 text-xs font-semibold text-[#1A3A2A] dark:border-[#45604b] dark:text-[#b9d4bf]"
                    >
                      <Save className="h-4 w-4" />
                      {ur ? "محفوظ کریں" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={copyActive}
                      className="flex items-center gap-2 rounded-lg bg-[#1A3A2A] px-3 py-2 text-xs font-semibold text-white"
                    >
                      <Copy className="h-4 w-4" />
                      {ur ? "مکمل مسودہ نقل کریں" : "Copy full draft"}
                    </button>
                  </div>
                </div>
                {savedMessage ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    {savedMessage}
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-[#1A3A2A] dark:text-white">
                      {ur ? "1 — مصدقہ مواد تلاش کریں" : "1 — Find verified material"}
                    </h4>
                    <p className="mt-1 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
                      {ur
                        ? "تحقیق میں مصدقہ آیات/روایات الگ رہیں گی؛ زیرِ تصدیق ماخذ خودکار طور پر مجلس میں شامل نہیں ہوں گے۔"
                        : "Verified verses/narrations stay separate; source leads are never auto-inserted into the sermon."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runResearch}
                    disabled={researchLoading}
                    className="flex items-center gap-2 rounded-lg bg-[#31513a] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {researchLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {ur ? "تحقیق شروع کریں" : "Run research"}
                  </button>
                </div>
                {researchError ? (
                  <p className="mt-3 text-xs text-red-700 dark:text-red-300">
                    {researchError}
                  </p>
                ) : null}

                {active.evidence.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {active.evidence.map((item) => {
                      const selectable = item.status === "verified";
                      const selected = active.selectedEvidenceIds.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`block rounded-lg border p-3 ${
                            selected
                              ? "border-emerald-500/40 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/15"
                              : "border-[#1A3A2A]/10 bg-[#F7F5EF] dark:border-[#35513d] dark:bg-[#0e1c15]"
                          } ${selectable ? "cursor-pointer" : "opacity-75"}`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={!selectable}
                              onChange={() => toggleEvidence(item.id)}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <strong className="text-sm text-[#1A3A2A] dark:text-white">
                                  {ur ? item.titleUr : item.titleEn}
                                </strong>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  item.status === "verified"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                                }`}>
                                  {item.status === "verified"
                                    ? (ur ? "مصدقہ" : "verified")
                                    : (ur ? "زیرِ تصدیق" : "source lead")}
                                </span>
                              </div>
                              {item.arabic ? (
                                <div dir="rtl" className="mt-2 rounded-md bg-white px-3 py-2 text-sm leading-8 dark:bg-[#162a1e]">
                                  <KhateebScriptText text={item.arabic} forceArabic />
                                </div>
                              ) : null}
                              <p className="mt-2 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
                                {ur ? item.detailUr : item.detailEn}
                              </p>
                              <div className="mt-2 text-[11px] leading-5 text-[#6f5730] dark:text-[#d7bc8a]">
                                {ur ? item.citationUr : item.citationEn}
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]">
                <h4 className="font-bold text-[#1A3A2A] dark:text-white">
                  {ur ? "2 — اپنی مجلس کی ترتیب بنائیں" : "2 — Shape your sermon"}
                </h4>
                <p className="mt-1 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
                  {ur
                    ? "ہر حصے میں آپ اپنی زبان، واقعہ، شعر یا ربط لکھ سکتے ہیں۔ ماخذی متن اس سے الگ محفوظ رہے گا۔"
                    : "Add your own wording, story, poetry, or transition in each section. Source text remains separate."}
                </p>

                <div className="mt-4 space-y-3">
                  {active.sections.map((section) => (
                    <article
                      key={section.id}
                      className="rounded-lg border border-[#1A3A2A]/10 bg-[#F7F5EF] p-3 dark:border-[#35513d] dark:bg-[#0e1c15]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-[#1A3A2A] dark:text-white">
                            {ur ? section.headingUr : section.headingEn}
                          </strong>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            section.provenance === "source-grounded"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                              : section.provenance === "user"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                          }`}>
                            {section.provenance === "source-grounded"
                              ? (ur ? "مصدقہ ماخذ" : "verified source")
                              : section.provenance === "user"
                                ? (ur ? "میرا مواد" : "my material")
                                : (ur ? "قلم کی تدوین" : "Qalam editorial")}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-[#8a6838] dark:text-[#d7bc8a]">
                          {section.minutes} {ur ? "منٹ" : "min"}
                        </span>
                      </div>

                      {section.evidenceIds.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {section.evidenceIds.map((id) => {
                            const item = active.evidence.find((row) => row.id === id);
                            if (!item) return null;
                            return (
                              <div
                                key={id}
                                className="rounded-md border border-emerald-500/20 bg-white p-3 dark:border-emerald-800/40 dark:bg-[#162a1e]"
                              >
                                <div className="text-xs font-bold text-[#31513a] dark:text-[#b9d4bf]">
                                  {ur ? item.titleUr : item.titleEn}
                                </div>
                                {item.arabic ? (
                                  <div dir="rtl" className="mt-2 text-sm leading-8">
                                    <KhateebScriptText text={item.arabic} forceArabic />
                                  </div>
                                ) : null}
                                <div className="mt-2 text-[11px] text-[#6f5730] dark:text-[#d7bc8a]">
                                  {ur ? item.citationUr : item.citationEn}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      <textarea
                        value={section.userText}
                        onChange={(event) =>
                          updateSectionText(section.id, event.target.value)
                        }
                        rows={3}
                        placeholder={
                          section.provenance === "source-grounded"
                            ? (ur
                                ? "اس ماخذ کے بعد آپ کیا سمجھائیں گے؟ اپنی زبان میں لکھیں۔"
                                : "What will you explain after this source? Write it in your own voice.")
                            : section.provenance === "user"
                              ? (ur
                                  ? "اپنا واقعہ، شعر، مثال یا ذاتی نکتہ لکھیں۔"
                                  : "Add your story, poetry, example, or personal point.")
                              : (ur
                                  ? "اس حصے کا ربط یا عبوری جملہ اپنی زبان میں لکھیں۔"
                                  : "Write the transition or editorial bridge in your own voice.")
                        }
                        className="mt-3 w-full rounded-lg border border-[#1A3A2A]/15 bg-white px-3 py-2.5 text-sm leading-7 text-[#1A3A2A] outline-none focus:border-[#1A3A2A] dark:border-[#35513d] dark:bg-[#162a1e] dark:text-white"
                      />
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]">
                <h4 className="font-bold text-[#1A3A2A] dark:text-white">
                  {ur ? "3 — آخری جانچ" : "3 — Final check"}
                </h4>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-[#F7F5EF] p-3 text-xs dark:bg-[#0e1c15]">
                    <strong className="block text-[#1A3A2A] dark:text-white">
                      {active.selectedEvidenceIds.length}
                    </strong>
                    <span className="text-[#687469] dark:text-[#9fb0a2]">
                      {ur ? "منتخب مصدقہ اندراج" : "verified selections"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-[#F7F5EF] p-3 text-xs dark:bg-[#0e1c15]">
                    <strong className="block text-[#1A3A2A] dark:text-white">
                      {active.sections.reduce((sum, item) => sum + item.minutes, 0)}
                    </strong>
                    <span className="text-[#687469] dark:text-[#9fb0a2]">
                      {ur ? "کل منٹ" : "total minutes"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-[#F7F5EF] p-3 text-xs dark:bg-[#0e1c15]">
                    <strong className="block text-[#1A3A2A] dark:text-white">
                      {validateCustomSermonProject(active).length}
                    </strong>
                    <span className="text-[#687469] dark:text-[#9fb0a2]">
                      {ur ? "ساختی مسائل" : "structural issues"}
                    </span>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">
                  {ur
                    ? "اصل آیت/حدیث صرف مصدقہ خانے سے نقل کریں۔ آپ کے نوٹس اور قلم کی تدوین الگ شناخت کے ساتھ محفوظ رہتے ہیں۔"
                    : "Quote verses/hadith only from verified source blocks. Your notes and Qalam editorial text retain separate provenance."}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
