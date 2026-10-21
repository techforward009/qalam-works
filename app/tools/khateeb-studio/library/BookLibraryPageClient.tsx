"use client";

import BookReader from "../BookReader";
import { useLanguage } from "../../../lib/language-context";
import {
  addCustomBookExcerpt,
  createCustomSermonProject,
  customSermonProjectKey,
  serializeCustomSermonProject,
} from "../engine/customSermonProject";
import { CUSTOM_SERMON_ACTIVE_KEY, loadCustomProjects } from "../engine/customSermonStorage";
import type { BookExcerpt } from "../engine/bookLibrary";

export default function BookLibraryPageClient() {
  const { language, dir } = useLanguage();
  const ur = language === "ur";

  function addToMySermon(excerpt: BookExcerpt) {
    try {
      const loaded = loadCustomProjects(window.localStorage);
      const active = loaded.projects.find(project => project.id === loaded.activeId);
      const base = active ?? createCustomSermonProject({
        kind: "majlis",
        title: ur ? "کتاب سے منتخب عبارت" : "Passage from Book Library",
        objective: ur ? "مستند کتابی ماخذ سے منتخب عبارت کی تدوین" : "Prepare a selected passage from a verified book source",
        duration: 20,
      });
      const next = addCustomBookExcerpt(base, excerpt);
      window.localStorage.setItem(customSermonProjectKey(next.id), serializeCustomSermonProject(next));
      window.localStorage.setItem(CUSTOM_SERMON_ACTIVE_KEY, next.id);
      return true;
    } catch {
      return false;
    }
  }

  return <main dir={dir} className="min-h-screen bg-[#f2efe8] px-3 py-5 text-[#1A3A2A] dark:bg-[#0c1710] dark:text-white sm:px-6 sm:py-8 lg:px-10">
    <div className="mx-auto w-full max-w-[58rem]">
      <BookReader locale={ur ? "ur" : "en"} onAdd={addToMySermon}/>
    </div>
  </main>;
}
