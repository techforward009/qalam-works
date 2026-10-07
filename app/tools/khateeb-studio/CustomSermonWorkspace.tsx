"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  Copy,
  FilePlus2,
  Library,
  Printer,
  Loader2,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
const BookLibraryPanel = dynamic(() => import("./BookLibraryPanel"), { ssr: false });
import { PATIENCE_QURAN } from "./engine/patienceBookGuide";
import BookPassageText from "./BookPassageText";
import { bookExcerptText, bookExcerptReference, cleanBookTitle, type BookExcerpt } from "./engine/bookLibrary";
import KhateebScriptText, { renderKhateebSalawat } from "./KhateebScriptText";
import ClipboardFeedback from "./ClipboardFeedback";
import { useCopyFeedback } from "./useCopyFeedback";
import { CUSTOM_SERMON_ACTIVE_KEY, loadCustomProjects, buildCustomBackup, prepareCustomRestore, persistRestoredProjects, sortCustomProjects } from "./engine/customSermonStorage";
import {
  addCustomBookExcerpt,
  removeCustomBookExcerpt,
  applyResearchToCustomProject,
  buildCustomSermonText,
  createCustomSermonProject,
  customSermonKindLabel,
  customSermonProjectKey,
  markCustomProjectReady,
  selectCustomEvidence,
  serializeCustomSermonProject,
  updateCustomProjectBasics,
  updateCustomSection,
  validateCustomSermonProject,
  type CustomSermonKind,
  type CustomSermonProject,
} from "./engine/customSermonProject";
import type { KhateebResearchResult } from "./engine/researchTypes";
import type { SermonDuration } from "./engine/sermonPrep";

type Props = {
  locale: "ur" | "en";
  initialProject?: CustomSermonProject;
  onInitialProjectApplied?: () => void;
};

export default function CustomSermonWorkspace({ locale, initialProject, onInitialProjectApplied }: Props) {
  const ur = locale === "ur";
  const [projects, setProjects] = useState<CustomSermonProject[]>([]);
  const [activeId, setActiveId] = useState("");
  const [kind, setKind] = useState<CustomSermonKind>("majlis");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [ownMaterial, setOwnMaterial] = useState("");
  const [duration, setDuration] = useState<SermonDuration>(30);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [storageError, setStorageError] = useState("");
  const projectsRef = useRef(projects);
  const unsavedIds = useRef(new Set<string>());
  const feedback = useCopyFeedback();
  const storageFailure = ur ? "مسودہ محفوظ نہیں ہوسکا۔ آپ کا متن ابھی صفحے پر موجود ہے؛ محفوظ فائل بنائیں یا دوبارہ محفوظ کریں۔" : "The draft could not be saved. Your text is still on this page; export a backup or retry Save.";
  const rememberActive = (id: string) => {
    try { window.localStorage.setItem(CUSTOM_SERMON_ACTIVE_KEY, id); } catch { /* The draft itself is saved independently. */ }
  };
  const setProjectList = (rows: CustomSermonProject[]) => {
    projectsRef.current = rows;
    setProjects(rows);
  };

  useEffect(() => {
    try {
      const loaded = loadCustomProjects(window.localStorage);
      setProjectList(loaded.projects);
      setActiveId(loaded.activeId);
      if (loaded.invalidCount) setStorageError(locale === "ur" ? "کچھ محفوظ اندراجات خراب ہیں؛ درست مسودے کھول دیے گئے ہیں۔" : "Some saved records are damaged; valid drafts have been opened.");
    } catch {
      setStorageError(locale === "ur" ? "محفوظ مسودے نہیں کھل سکے۔ براؤزر کی حفاظت کی سہولت دستیاب نہیں؛ اپنی محفوظ فائل واپس لائیں۔" : "Saved drafts could not be opened. Browser storage is unavailable; import your backup file.");
    }
  }, []);

  const active = useMemo(
    () => projects.find((project) => project.id === activeId) ?? null,
    [activeId, projects],
  );

  const replaceProject = (project: CustomSermonProject, select = true) => {
    setProjectList(sortCustomProjects([project, ...projectsRef.current.filter(item => item.id !== project.id)]));
    if (select) { setActiveId(project.id); rememberActive(project.id); }
    try {
      window.localStorage.setItem(customSermonProjectKey(project.id), serializeCustomSermonProject(project));
      unsavedIds.current.delete(project.id);
      setStorageError(unsavedIds.current.size ? storageFailure : "");
      setSavedMessage(ur ? "تبدیلیاں محفوظ ہوگئیں۔" : "Changes saved.");
      return true;
    } catch {
      unsavedIds.current.add(project.id);
      setSavedMessage("");
      setStorageError(storageFailure);
      return false;
    }
  };

  const consumedInitial = useRef("");
  useEffect(() => {
    if (initialProject && consumedInitial.current !== initialProject.id) {
      consumedInitial.current = initialProject.id;
      if (!projectsRef.current.some(p => p.id === initialProject.id)) replaceProject(initialProject);
      else setActiveId(initialProject.id);
      onInitialProjectApplied?.();
    }
  }, [initialProject]);

  const updateActiveBasics = (
    patch: Partial<
      Pick<
        CustomSermonProject,
        "kind" | "title" | "objective" | "ownMaterial" | "duration" | "researchQuery"
      >
    >,
  ) => {
    if (!active) return;
    replaceProject(updateCustomProjectBasics(active, patch), false);
  };

  const exportProjects = () => {
    const payload = buildCustomBackup(projectsRef.current);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "qalam-khateeb-my-sermons.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importProjects = async (file: File | null) => {
    if (!file) return;
    setImportError("");
    try {
      const restored = prepareCustomRestore(await file.text(), projectsRef.current);
      try {
        persistRestoredProjects(window.localStorage, restored.added);
      } catch {
        setImportError(storageFailure);
        return;
      }
      setProjectList(restored.projects);
      setActiveId(restored.activeId);
      rememberActive(restored.activeId);
      setStorageError(unsavedIds.current.size ? storageFailure : "");
      setSavedMessage(ur ? "محفوظ فائل بحال ہوگئی۔ مختلف نسخے الگ محفوظ ہیں۔" : "Backup restored. Different versions are kept as separate drafts.");
    } catch {
      setImportError(
        ur
          ? "یہ قلم خطیب اسٹوڈیو کی درست محفوظ فائل نہیں۔"
          : "This is not a valid Khateeb Studio backup file.",
      );
    }
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
    const saved = replaceProject(project);
    setTitle("");
    setObjective("");
    setOwnMaterial("");
    if (saved) setSavedMessage(ur ? "نیا مسودہ محفوظ ہوگیا۔" : "New draft saved.");
  };

  const deleteProject = (project: CustomSermonProject) => {
    try { window.localStorage.removeItem(customSermonProjectKey(project.id)); }
    catch { setStorageError(storageFailure); return; }
    unsavedIds.current.delete(project.id);
    const remaining = projectsRef.current.filter(item => item.id !== project.id);
    setProjectList(remaining);
    if (activeId === project.id) { setActiveId(remaining[0]?.id ?? ""); rememberActive(remaining[0]?.id ?? ""); }
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
      const latest = projectsRef.current.find(project => project.id === active.id);
      if (latest) replaceProject(applyResearchToCustomProject(latest, result), false);
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

  const addBookExcerpt = (excerpt: BookExcerpt) => {
    const latest = projectsRef.current.find(project => project.id === activeId);
    if (!latest) throw new Error("missing-project");
    return replaceProject(addCustomBookExcerpt(latest, excerpt), false);
  };

  const updateSectionText = (sectionId: string, value: string) => {
    if (!active) return;
    replaceProject(updateCustomSection(active, sectionId, value), false);
  };

  const saveActive = () => {
    if (!active) return;
    const ready = markCustomProjectReady(active);
    if (replaceProject(ready)) setSavedMessage(ur ? "مسودہ محفوظ ہوگیا۔" : "Draft saved.");
  };

  const copyActive = async () => {
    if (!active) return;
    await feedback.copy(buildCustomSermonText(active, locale));
  };

  const printActive = () => {
    document.documentElement.dataset.khateebPrint = "custom";
    window.print();
  };


  return (
    <section data-testid="custom-sermon-workspace" className="rounded-2xl border border-[#1A3A2A]/15 bg-[#f7faf7] p-5 dark:border-[#35513d] dark:bg-[#102017] sm:p-6">
      <ClipboardFeedback state={feedback.state} onDismiss={feedback.dismiss} />
      {storageError ? <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{storageError}</p> : null}
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
          <p className="mt-1 max-w-3xl text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
            {ur
              ? "مسودہ اسی براؤزر اور اسی آلے میں خودکار طور پر محفوظ ہوتا ہے؛ دوسرے آلے کے لیے محفوظ فائل بنائیں۔"
              : "Drafts auto-save in this browser on this device. Export a backup to move them elsewhere."}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Library className="h-4 w-4 text-[#47654d] dark:text-[#b9d4bf]" />
                <h3 className="font-bold text-[#1A3A2A] dark:text-white">
                  {ur ? "میرے محفوظ مسودے" : "My saved drafts"}
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={exportProjects}
                  disabled={projects.length === 0}
                  className="rounded-md border border-[#1A3A2A]/15 px-2.5 py-1 text-[11px] font-semibold text-[#445247] disabled:opacity-40 dark:border-[#35513d] dark:text-[#b8c8bb]"
                >
                  {ur ? "محفوظ فائل بنائیں" : "Export"}
                </button>
                <label className="cursor-pointer rounded-md border border-[#1A3A2A]/15 px-2.5 py-1 text-[11px] font-semibold text-[#445247] dark:border-[#35513d] dark:text-[#b8c8bb]">
                  {ur ? "محفوظ فائل واپس لائیں" : "Import"}
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) => {
                      void importProjects(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            {importError ? (
              <p className="mt-2 text-[11px] text-red-700 dark:text-red-300">
                {importError}
              </p>
            ) : null}
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
                      onClick={() => { setActiveId(project.id); rememberActive(project.id); }}
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
                    <button type="button" onClick={printActive} className="flex items-center gap-2 rounded-lg border border-[#1A3A2A]/20 px-3 py-2 text-xs font-semibold">
                      <Printer className="h-4 w-4" />{ur ? "مسودہ چھاپیں / پی ڈی ایف محفوظ کریں" : "Print draft / Save PDF"}
                    </button>
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
                  <div role="status" aria-live="polite" className="mt-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    {savedMessage}
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]">
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-semibold text-[#5f6f61] dark:text-[#a8c8b0]">
                    {ur ? "عنوان" : "Title"}
                    <input
                      value={active.title}
                      onChange={(event) =>
                        updateActiveBasics({ title: event.target.value })
                      }
                      className="rounded-lg border border-[#1A3A2A]/15 bg-white px-3 py-2 text-sm font-normal text-[#1A3A2A] outline-none focus:border-[#1A3A2A] dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-[#5f6f61] dark:text-[#a8c8b0]">
                    {ur ? "تحقیقی سوال / تلاش" : "Research query"}
                    <input
                      value={active.researchQuery}
                      onChange={(event) =>
                        updateActiveBasics({ researchQuery: event.target.value })
                      }
                      className="rounded-lg border border-[#1A3A2A]/15 bg-white px-3 py-2 text-sm font-normal text-[#1A3A2A] outline-none focus:border-[#1A3A2A] dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-[#5f6f61] dark:text-[#a8c8b0] sm:col-span-2">
                    {ur ? "مقصد" : "Objective"}
                    <textarea
                      value={active.objective}
                      onChange={(event) =>
                        updateActiveBasics({ objective: event.target.value })
                      }
                      rows={2}
                      className="rounded-lg border border-[#1A3A2A]/15 bg-white px-3 py-2 text-sm font-normal leading-7 text-[#1A3A2A] outline-none focus:border-[#1A3A2A] dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-white"
                    />
                  </label>
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    {(["majlis", "jumuah", "general"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateActiveBasics({ kind: value })}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          active.kind === value
                            ? "border-[#1A3A2A] bg-[#1A3A2A] text-white"
                            : "border-[#1A3A2A]/15 bg-white text-[#445247] dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-[#b8c8bb]"
                        }`}
                      >
                        {customSermonKindLabel(value, locale)}
                      </button>
                    ))}
                    {([20, 30, 45] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateActiveBasics({ duration: value })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          active.duration === value
                            ? "bg-[#6f5730] text-white"
                            : "bg-[#F1F3EF] text-[#445247] dark:bg-[#0e1c15] dark:text-[#b8c8bb]"
                        }`}
                      >
                        {value} {ur ? "منٹ" : "min"}
                      </button>
                    ))}
                  </div>
                </div>

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
                                  <KhateebScriptText text={item.arabic} forceArabic nonQuran={item.kind !== "quran"} />
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
                <button type="button" aria-expanded={libraryOpen} aria-controls="custom-book-library" onClick={() => setLibraryOpen(value => !value)} className="flex w-full items-center justify-between gap-3 text-start font-bold text-[#1A3A2A] dark:text-white">
                  <span>{ur ? "کتابی ذخیرہ — تلاش اور اقتباس" : "Book library — search and quote"}</span>
                  <span aria-hidden="true">{libraryOpen ? "−" : "+"}</span>
                </button>
                <p className="mt-2 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">{ur ? "نہج البلاغہ اور صحیفہ سجادیہ سے منتخب عبارت، اصل نسخے اور حوالہ کے ساتھ شامل کریں۔" : "Add selected passages from Nahj al-Balagha and Sahifa Sajjadiyya with their edition and reference."}</p>
                <div id="custom-book-library" className="mt-4" hidden={!libraryOpen}>
                  {libraryOpen ? <BookLibraryPanel key={active.id} locale={locale} onCreateDraft={replaceProject} onAdd={addBookExcerpt} addedIds={(active.bookExcerpts ?? []).map(x => x.id)} /> : null}
                </div>
                {active.bookExcerpts?.length ? <div className="mt-4 space-y-3">
                  <h5 className="font-semibold">{ur ? "مجلس کے محفوظ کتابی اقتباسات" : "Saved book excerpts in this sermon"}</h5>
                  {active.bookExcerpts.map(excerpt => <article key={excerpt.id} className="rounded-lg border border-[#31513a]/20 p-3">
                    <strong dir="auto" className="block text-sm">{renderKhateebSalawat(cleanBookTitle(excerpt.title))}</strong>
                    <p className="mt-1 text-xs leading-6">{ur ? "فراہم کردہ کتابی نسخہ؛ ترجمہ اور حواشی کی نسبت ماخذ کے مطابق ہے۔" : "Supplied book edition; translation and commentary retain their source attribution."}</p>
                    {excerpt.paragraphs.map(p => <BookPassageText key={p.id} text={p.text} language={excerpt.language} />)}
                    {excerpt.suppliedTranslation ? <div className="mt-3 border-t pt-3"><p className="text-xs">{ur ? "فراہم کردہ ترجمہ" : "Supplied translation"} — {excerpt.suppliedTranslation.translator}{excerpt.suppliedTranslation.source ? ` — ${excerpt.suppliedTranslation.source}` : ""}</p><BookPassageText text={excerpt.suppliedTranslation.text} language={excerpt.suppliedTranslation.language} /></div> : null}
                    <p dir="auto" className="mt-3 break-words text-xs leading-6">{bookExcerptReference(excerpt, locale)}{excerpt.translator ? ` · ${excerpt.translator}` : ""}</p>
                    <div className="mt-3 flex gap-3">
                      <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={() => void feedback.copy(bookExcerptText(excerpt, locale))}>{ur ? "اقتباس اور حوالہ نقل کریں" : "Copy excerpt and reference"}</button>
                      <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={() => { const latest = projectsRef.current.find(p => p.id === active.id); if (latest) replaceProject(removeCustomBookExcerpt(latest, excerpt.id), false); }}>{ur ? "اقتباس ہٹائیں" : "Remove excerpt"}</button>
                    </div>
                  </article>)}
                </div> : null}
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

                <div className="mt-4 rounded-lg border border-blue-200/70 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/10">
                  <label className="grid gap-1 text-xs font-semibold text-blue-900 dark:text-blue-200">
                    {ur ? "میرا بنیادی مواد" : "My core material"}
                    <textarea
                      value={active.ownMaterial}
                      onChange={(event) =>
                        updateActiveBasics({ ownMaterial: event.target.value })
                      }
                      rows={4}
                      placeholder={
                        ur
                          ? "اپنا واقعہ، شعر، مثال، تجربہ یا مرکزی ذاتی نکتہ یہاں مسلسل محفوظ کریں۔"
                          : "Keep your own story, poetry, example, experience, or core personal point here."
                      }
                      className="rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm font-normal leading-7 text-[#1A3A2A] outline-none dark:border-blue-900/40 dark:bg-[#162a1e] dark:text-white"
                    />
                  </label>
                </div>

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
                                    <KhateebScriptText text={item.arabic} forceArabic nonQuran={item.kind !== "quran"} />
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
                        aria-label={ur ? `${section.headingUr} — میرے نوٹس` : `${section.headingEn} — my notes`}
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
      {active ? <section id="khateeb-custom-print-area" className="hidden" dir={ur ? "rtl" : "ltr"}>
        {buildCustomSermonText(active, locale).split("\n").map((line, index) => {
          const excerpt = active.bookExcerpts?.find(item => item.paragraphs.some(p => p.text.split("\n").includes(line)));
          const quran = PATIENCE_QURAN.some(q => q.text === line) || active.evidence.some(item => item.kind === "quran" && item.arabic === line);
          const arabic = quran || active.evidence.some(item => item.arabic === line);
          return <div key={index} dir="auto" className="min-h-2 whitespace-pre-wrap break-words text-sm leading-8">{excerpt || arabic ? <BookPassageText text={line} language={arabic ? "ar" : excerpt!.language} quran={quran} /> : renderKhateebSalawat(line)}</div>;
        })}
      </section> : null}
    </section>
  );
}
