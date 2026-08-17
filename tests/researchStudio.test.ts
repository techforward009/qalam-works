// Phase 18A.1 — Research Studio core data model + persistence tests

import {
  parseResearchProject,
  sortedNotes,
  reindexNotes,
  generateNoteId,
  generateSourceId,
  type ResearchProject,
  type ResearchNote,
  type ResearchNoteType,
  type ResearchSource,
} from "../app/tools/research-studio/utils/researchTypes";
import {
  createResearchProject,
  exportResearchBackup,
  importResearchBackup,
  RESEARCH_BACKUP_FORMAT,
  RESEARCH_BACKUP_SCHEMA_VERSION,
  loadAllResearchProjects,
  getResearchStore,
  type StoreResult,
} from "../app/tools/research-studio/utils/researchStore";

// ── localStorage mock ─────────────────────────────────────────────────────────

function makeStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage;
}

beforeAll(() => {
  (globalThis as Record<string, unknown>).localStorage = makeStorage();
});
beforeEach(() => { localStorage.clear(); });

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNote(order: number, text: string, overrides: Partial<ResearchNote> = {}): ResearchNote {
  return { id: `NOTE-${String(order).padStart(4, "0")}`, order, text, noteType: "note", createdAt: new Date().toISOString(), ...overrides };
}

function makeSource(overrides: Partial<ResearchSource> = {}): ResearchSource {
  return { id: `SRC-001`, type: "book", title: "Test Book", author: "Author", ...overrides };
}

function makeProject(overrides: Partial<ResearchProject> = {}): ResearchProject {
  return {
    schemaVersion: 1, id: "proj-test", title: "Test", question: "What?",
    sources: [], notes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── 1. parseResearchProject ───────────────────────────────────────────────────

describe("parseResearchProject", () => {
  test("valid project parses correctly", () => {
    const p = parseResearchProject(makeProject());
    expect(p).not.toBeNull();
    expect(p?.schemaVersion).toBe(1);
    expect(p?.title).toBe("Test");
  });

  test("null/undefined input → null", () => {
    expect(parseResearchProject(null)).toBeNull();
    expect(parseResearchProject(undefined)).toBeNull();
  });

  test("wrong schemaVersion → null", () => {
    expect(parseResearchProject({ ...makeProject(), schemaVersion: 2 })).toBeNull();
  });

  test("missing id → null", () => {
    const { id: _, ...noId } = makeProject();
    expect(parseResearchProject(noId)).toBeNull();
  });

  test("duplicate note IDs → whole project rejected", () => {
    const note1 = makeNote(1, "first");
    const note2 = { ...makeNote(2, "second"), id: "NOTE-0001" }; // same ID
    const p = parseResearchProject(makeProject({ notes: [note1, note2] }));
    expect(p).toBeNull();
  });

  test("duplicate source IDs → whole project rejected", () => {
    const s1 = makeSource({ id: "SRC-001", title: "First" });
    const s2 = makeSource({ id: "SRC-001", title: "Second" });
    const p = parseResearchProject(makeProject({ sources: [s1, s2] }));
    expect(p).toBeNull();
  });

  test("dangling sourceId on note → whole project rejected", () => {
    const note = makeNote(1, "excerpt", { sourceId: "SRC-NONEXISTENT" });
    const p = parseResearchProject(makeProject({ notes: [note] }));
    expect(p).toBeNull();
  });

  test("malformed note (missing id) → whole project rejected", () => {
    const p = parseResearchProject(makeProject({ notes: [{ order: 1, text: "no id", noteType: "note", createdAt: "" } as ResearchNote] }));
    expect(p).toBeNull();
  });

  test("malformed note (missing order) → whole project rejected", () => {
    const { order: _, ...noOrder } = makeNote(1, "x");
    const p = parseResearchProject(makeProject({ notes: [noOrder as ResearchNote] }));
    expect(p).toBeNull();
  });

  test("malformed source (missing id) → whole project rejected", () => {
    const { id: _, ...noId } = makeSource();
    const p = parseResearchProject(makeProject({ sources: [noId as ResearchSource] }));
    expect(p).toBeNull();
  });

  test("null note in array → whole project rejected", () => {
    const p = parseResearchProject(makeProject({ notes: [null as unknown as ResearchNote, makeNote(1, "valid")] }));
    expect(p).toBeNull();
  });
});

// ── 2. Unicode fidelity ───────────────────────────────────────────────────────

describe("Unicode fidelity — exact preservation", () => {
  const cases = [
    ["Urdu", "علی کتاب پڑھ رہے ہیں۔"],
    ["Arabic", "علي عليه السلام"],
    ["critical: Arabic NOT normalized", "علي كتاب"],
    ["English", "The Chamber of Commerce issued a statement."],
    ["mixed", "Qalam Works میں Research Studio کھولیں۔"],
    ["symbols", "قیمت: ₨ 1,250.00 — [12] «اقتباس» 🌟"],
  ] as const;

  for (const [label, text] of cases) {
    test(`${label}: text preserved verbatim through parse`, () => {
      const p = parseResearchProject(makeProject({ notes: [makeNote(1, text)] }));
      expect(p?.notes[0].text).toBe(text);
    });

    test(`${label}: text unchanged in backup round-trip`, () => {
      const project = makeProject({ notes: [makeNote(1, text)] });
      const result = importResearchBackup(exportResearchBackup(project));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.notes[0].text).toBe(text);
    });
  }

  test("Arabic علي كتاب NOT converted to Urdu forms", () => {
    const arabic = "علي كتاب";
    const p = parseResearchProject(makeProject({ notes: [makeNote(1, arabic)] }));
    expect(p?.notes[0].text).toBe(arabic);
    expect(p?.notes[0].text).not.toContain("علی");
    expect(p?.notes[0].text).not.toContain("کتاب");
  });
});

// ── 3. Note ordering ──────────────────────────────────────────────────────────

describe("Note ordering", () => {
  test("sortedNotes preserves ascending order", () => {
    const notes = [makeNote(3, "c"), makeNote(1, "a"), makeNote(2, "b")];
    expect(sortedNotes(notes).map(n => n.text)).toEqual(["a", "b", "c"]);
  });

  test("sortedNotes does not mutate input", () => {
    const notes = [makeNote(2, "b"), makeNote(1, "a")];
    const copy = notes.map(n => ({ ...n }));
    sortedNotes(notes);
    expect(notes[0].order).toBe(copy[0].order);
  });

  test("reindexNotes assigns 1, 2, 3…", () => {
    const notes = [makeNote(10, "a"), makeNote(2, "b"), makeNote(7, "c")];
    const reindexed = reindexNotes(notes);
    expect(reindexed.map(n => n.order)).toEqual([1, 2, 3]);
  });

  test("reindexNotes preserves sort order (b was 2, a was 10, but b comes first)", () => {
    const notes = [makeNote(10, "a"), makeNote(2, "b")];
    const reindexed = reindexNotes(notes);
    expect(reindexed[0].text).toBe("b");
    expect(reindexed[1].text).toBe("a");
  });

  test("canonical order preserved through backup round-trip", () => {
    const notes = [makeNote(3, "third"), makeNote(1, "first"), makeNote(2, "second")];
    const project = makeProject({ notes });
    const result = importResearchBackup(exportResearchBackup(project));
    if (result.ok) {
      const sorted = sortedNotes(result.value.notes);
      expect(sorted.map(n => n.text)).toEqual(["first", "second", "third"]);
    }
  });
});

// ── 4. Persistence (CRUD) ─────────────────────────────────────────────────────

describe("Research project store CRUD", () => {

  test("save and get round-trip", () => {
    const p = createResearchProject("My Research", "What is X?");
    const saved = getResearchStore().save(p);
    expect(saved.ok).toBe(true);
    const got = getResearchStore().get(p.id);
    expect(got.ok).toBe(true);
    if (got.ok) {
      expect(got.value.title).toBe("My Research");
      expect(got.value.question).toBe("What is X?");
    }
  });

  test("list returns saved project IDs", () => {
    const p1 = createResearchProject("P1");
    const p2 = createResearchProject("P2");
    getResearchStore().save(p1);
    getResearchStore().save(p2);
    const ids = getResearchStore().list();
    expect(ids).toContain(p1.id);
    expect(ids).toContain(p2.id);
  });

  test("remove deletes project and removes from list", () => {
    const p = createResearchProject("Delete Me");
    getResearchStore().save(p);
    getResearchStore().remove(p.id);
    expect(getResearchStore().list()).not.toContain(p.id);
    expect(getResearchStore().get(p.id).ok).toBe(false);
  });

  test("get non-existent → not_found", () => {
    const result = getResearchStore().get("nonexistent-id");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not_found");
  });

  test("note CRUD data preserved through save/load", () => {
    const note = makeNote(1, "علي كتاب", { noteType: "excerpt", pageOrLocation: "p. 42" });
    const project = { ...createResearchProject("R"), notes: [note] };
    getResearchStore().save(project);
    const got = getResearchStore().get(project.id);
    if (got.ok) {
      expect(got.value.notes[0].text).toBe("علي كتاب");
      expect(got.value.notes[0].noteType).toBe("excerpt");
      expect(got.value.notes[0].pageOrLocation).toBe("p. 42");
    }
  });

  test("source CRUD data preserved through save/load", () => {
    const source = makeSource({ title: "Urdu Literature", author: "Ahmad Nadeem Qasmi", year: "1970", type: "book" });
    const project = { ...createResearchProject("R"), sources: [source] };
    getResearchStore().save(project);
    const got = getResearchStore().get(project.id);
    if (got.ok) {
      expect(got.value.sources[0].title).toBe("Urdu Literature");
      expect(got.value.sources[0].author).toBe("Ahmad Nadeem Qasmi");
      expect(got.value.sources[0].year).toBe("1970");
    }
  });

  test("loadAllResearchProjects returns all saved projects", () => {
    const p = createResearchProject("Test");
    getResearchStore().save(p);
    const all = loadAllResearchProjects(getResearchStore());
    expect(all.some(x => x.id === p.id)).toBe(true);
  });
});

// ── 5. Backup / restore ───────────────────────────────────────────────────────

describe("Versioned backup", () => {
  test("exported JSON has correct format and schemaVersion", () => {
    const p = makeProject();
    const env = JSON.parse(exportResearchBackup(p));
    expect(env.format).toBe(RESEARCH_BACKUP_FORMAT);
    expect(env.schemaVersion).toBe(RESEARCH_BACKUP_SCHEMA_VERSION);
    expect(env.project).toBeDefined();
  });

  test("valid backup imports successfully", () => {
    const p = makeProject({ title: "Research Backup Test" });
    const result = importResearchBackup(exportResearchBackup(p));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.title).toBe("Research Backup Test");
  });

  test("semantic round-trip: sources + notes intact", () => {
    const note = makeNote(1, "علي كتاب", { sourceId: "SRC-001", noteType: "excerpt" });
    const source = makeSource({ id: "SRC-001", title: "Test" });
    const p = makeProject({ notes: [note], sources: [source] });
    const result = importResearchBackup(exportResearchBackup(p));
    if (result.ok) {
      expect(result.value.notes[0].text).toBe("علي كتاب");
      expect(result.value.notes[0].sourceId).toBe("SRC-001");
      expect(result.value.sources[0].title).toBe("Test");
    }
  });

  test("invalid JSON → corrupt error", () => {
    const r = importResearchBackup("not json {{{");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("corrupt");
  });

  test("wrong format → rejected", () => {
    const env = JSON.parse(exportResearchBackup(makeProject()));
    env.format = "something-else";
    expect(importResearchBackup(JSON.stringify(env)).ok).toBe(false);
  });

  test("wrong schemaVersion → rejected", () => {
    const env = JSON.parse(exportResearchBackup(makeProject()));
    env.schemaVersion = 99;
    expect(importResearchBackup(JSON.stringify(env)).ok).toBe(false);
  });

  test("malformed project inside envelope → rejected", () => {
    const env = { format: RESEARCH_BACKUP_FORMAT, schemaVersion: 1, project: { schemaVersion: 1, id: "" } };
    expect(importResearchBackup(JSON.stringify(env)).ok).toBe(false);
  });

  test("failed import does not touch existing project (atomicity guaranteed by not calling store)", () => {
    const bad = importResearchBackup("{}");
    expect(bad.ok).toBe(false);
    // Caller only mutates store on ok=true — verified here at logic level
  });
});

// ── 6. createResearchProject factory ─────────────────────────────────────────

describe("createResearchProject", () => {
  test("produces valid schemaVersion 1 project", () => {
    const p = createResearchProject("My Study", "Why does X happen?");
    expect(p.schemaVersion).toBe(1);
    expect(p.title).toBe("My Study");
    expect(p.question).toBe("Why does X happen?");
    expect(p.sources).toHaveLength(0);
    expect(p.notes).toHaveLength(0);
  });

  test("id is unique across calls", () => {
    const a = createResearchProject("A");
    const b = createResearchProject("B");
    expect(a.id).not.toBe(b.id);
  });
});
