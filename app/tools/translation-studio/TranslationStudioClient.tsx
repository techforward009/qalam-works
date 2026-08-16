"use client";
import React, { useState, useEffect, useCallback } from "react";
import type { TranslationProject, TranslationLanguage, TranslationBrief } from "./utils/translationTypes";
import { segmentText } from "./utils/segmentation";
import { loadAllProjects, saveProject, deleteProject } from "./utils/projectStore";
import { generateProjectId } from "./utils/projectId";
import ProjectSetupPanel from "./components/ProjectSetupPanel";
import ProjectListPanel from "./components/ProjectListPanel";
import TranslationWorkspace from "./components/TranslationWorkspace";

type View = "list" | "new" | "workspace";

export default function TranslationStudioClient() {
  const [view, setView] = useState<View>("list");
  const [projects, setProjects] = useState<TranslationProject[]>([]);
  const [activeProject, setActiveProject] = useState<TranslationProject | null>(null);

  useEffect(() => {
    setProjects(loadAllProjects());
  }, []);

  const handleCreateProject = useCallback((params: {
    name: string;
    sourceLanguage: TranslationLanguage;
    targetLanguage: TranslationLanguage;
    brief: TranslationBrief;
    sourceText: string;
  }) => {
    const segments = segmentText(params.sourceText, params.sourceLanguage, params.targetLanguage);
    const now = new Date().toISOString();
    const project: TranslationProject = {
      schemaVersion: 1,
      id: generateProjectId(),
      name: params.name,
      sourceLanguage: params.sourceLanguage,
      targetLanguage: params.targetLanguage,
      brief: params.brief,
      glossary: [],
      segments,
      createdAt: now,
      updatedAt: now,
    };
    const result = saveProject(project);
    if (!result.ok) {
      alert(result.error === "quota" ? "Storage is full. Please delete an old project first." : "Failed to save project. Please try again.");
      return;
    }
    setProjects(loadAllProjects());
    setActiveProject(project);
    setView("workspace");
  }, []);

  const handleOpenProject = useCallback((id: string) => {
    const p = projects.find(x => x.id === id) ?? null;
    setActiveProject(p);
    setView(p ? "workspace" : "list");
  }, [projects]);

  const handleDeleteProject = useCallback((id: string) => {
    deleteProject(id);
    setProjects(loadAllProjects());
    if (activeProject?.id === id) {
      setActiveProject(null);
      setView("list");
    }
  }, [activeProject]);

  const handleProjectChange = useCallback((updated: TranslationProject) => {
    setActiveProject(updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, []);

  if (view === "workspace" && activeProject) {
    return (
      <TranslationWorkspace
        project={activeProject}
        onProjectChange={handleProjectChange}
        onClose={() => { setProjects(loadAllProjects()); setView("list"); }}
      />
    );
  }

  if (view === "new") {
    return (
      <div>
        <button onClick={() => setView("list")} className="mx-4 mt-4 text-sm text-[#1A3A2A] hover:underline">← Back</button>
        <ProjectSetupPanel onCreateProject={handleCreateProject} />
      </div>
    );
  }

  return (
    <ProjectListPanel
      projects={projects}
      onOpen={handleOpenProject}
      onDelete={handleDeleteProject}
      onNew={() => setView("new")}
    />
  );
}
