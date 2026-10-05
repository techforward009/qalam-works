import { describe, expect, test } from "vitest";
import {
  applyResearchToCustomProject,
  buildCustomSermonText,
  createCustomSermonProject,
  markCustomProjectReady,
  parseCustomSermonProject,
  selectCustomEvidence,
  serializeCustomSermonProject,
  updateCustomProjectBasics,
  updateCustomSection,
  validateCustomSermonProject,
} from "../app/tools/khateeb-studio/engine/customSermonProject";
import type {
  KhateebResearchEvidence,
  KhateebResearchResult,
} from "../app/tools/khateeb-studio/engine/researchTypes";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";

function evidence(
  id: string,
  kind: KhateebResearchEvidence["kind"],
  status: KhateebResearchEvidence["status"] = "verified",
): KhateebResearchEvidence {
  return {
    id,
    topicId: "custom",
    kind,
    status,
    titleUr: `عنوان ${id}`,
    titleEn: `Title ${id}`,
    detailUr: `موضوعی ربط ${id}`,
    detailEn: `Topic link ${id}`,
    citationUr: `حوالہ ${id}`,
    citationEn: `Reference ${id}`,
    arabic:
      kind === "quran" || kind === "hadith"
        ? `اصل عربی ${id}`
        : undefined,
    sourceUrl: "https://example.com/source",
  };
}

function result(
  rows: readonly KhateebResearchEvidence[],
): KhateebResearchResult {
  return {
    query: "رزق حلال",
    locale: "ur",
    matchedTopicIds: ["rizq"],
    evidence: rows,
    verifiedCount: rows.filter((item) => item.status === "verified").length,
    sourceLeadCount: rows.filter((item) => item.status === "source-lead").length,
    catalogOnlyCount: rows.filter((item) => item.status === "catalog-only").length,
    canBuildSermon: true,
    providerHints: [],
    gapsUr: [],
    gapsEn: [],
  };
}

describe("Khateeb custom sermon projects", () => {
  test("creates a structured draft with exact requested duration", () => {
    const project = createCustomSermonProject(
      {
        kind: "majlis",
        title: "رزقِ حلال اور عزتِ نفس",
        objective: "توکل اور ذمہ دارانہ کوشش کا ربط واضح کرنا",
        ownMaterial: "اپنی مثال",
        duration: 30,
      },
      "2026-10-05T05:00:00.000Z",
    );

    expect(project.title).toBe("رزقِ حلال اور عزتِ نفس");
    expect(project.sections.reduce((sum, item) => sum + item.minutes, 0)).toBe(
      30,
    );
    expect(project.sections.some((item) => item.provenance === "user")).toBe(
      true,
    );
    expect(validateCustomSermonProject(project)).toEqual([]);
  });

  test("research snapshots verified and unverified material but selects only verified evidence", () => {
    const project = createCustomSermonProject({
      kind: "majlis",
      title: "رزق",
      objective: "رزق کی دینی سمجھ",
      duration: 20,
    });
    const researched = applyResearchToCustomProject(
      project,
      result([
        evidence("q1", "quran"),
        evidence("h1", "hadith"),
        evidence("lead", "source", "source-lead"),
      ]),
    );

    expect(researched.evidence).toHaveLength(3);
    expect(researched.selectedEvidenceIds).toEqual(["q1", "h1"]);
    expect(researched.selectedEvidenceIds).not.toContain("lead");
    expect(
      researched.sections
        .filter((item) => item.provenance === "source-grounded")
        .flatMap((item) => item.evidenceIds),
    ).toEqual(expect.arrayContaining(["q1", "h1"]));
    expect(validateCustomSermonProject(researched)).toEqual([]);
  });

  test("cannot select a source lead into the sermon", () => {
    const researched = applyResearchToCustomProject(
      createCustomSermonProject({
        kind: "general",
        title: "ایک موضوع",
        objective: "ایک مقصد",
        duration: 20,
      }),
      result([
        evidence("h1", "hadith"),
        evidence("lead", "source", "source-lead"),
      ]),
    );

    const changed = selectCustomEvidence(researched, ["h1", "lead"]);
    expect(changed.selectedEvidenceIds).toEqual(["h1"]);
    expect(validateCustomSermonProject(changed)).toEqual([]);
  });

  test("keeps the user's own wording separate from source-grounded text", () => {
    let project = applyResearchToCustomProject(
      createCustomSermonProject({
        kind: "majlis",
        title: "صبر",
        objective: "صبر کو عملی زندگی سے جوڑنا",
        ownMaterial: "میرے گھر کا ایک ذاتی واقعہ",
        duration: 30,
      }),
      result([evidence("h1", "hadith"), evidence("q1", "quran")]),
    );

    const bridge = project.sections.find(
      (item) => item.provenance === "editorial",
    )!;
    project = updateCustomSection(
      project,
      bridge.id,
      "یہ میرا عبوری جملہ ہے۔",
    );

    const text = buildCustomSermonText(project, "ur");
    expect(text).toContain("[مصدقہ ماخذ]");
    expect(text).toContain("[میرا مواد]");
    expect(text).toContain("[قلم کی تدوین]");
    expect(text).toContain("میرے گھر کا ایک ذاتی واقعہ");
    expect(text).toContain("یہ میرا عبوری جملہ ہے۔");
    expect(text).toContain("حوالہ: حوالہ h1");
  });

  test("marks project ready only when a verified hadith or scholarly core is selected", () => {
    const quranOnly = applyResearchToCustomProject(
      createCustomSermonProject({
        kind: "majlis",
        title: "تقوی",
        objective: "تقوی کی وضاحت",
        duration: 20,
      }),
      result([evidence("q1", "quran")]),
    );
    expect(markCustomProjectReady(quranOnly).status).not.toBe("ready");

    const withHadith = applyResearchToCustomProject(
      createCustomSermonProject({
        kind: "majlis",
        title: "رزق",
        objective: "رزق کی وضاحت",
        duration: 20,
      }),
      result([evidence("q1", "quran"), evidence("h1", "hadith")]),
    );
    expect(markCustomProjectReady(withHadith).status).toBe("ready");
  });

  test("editing format or duration preserves the user's existing section notes when possible", () => {
    let project = createCustomSermonProject({
      kind: "majlis",
      title: "اخلاق",
      objective: "اخلاقی تربیت",
      duration: 20,
    });
    const own = project.sections.find((item) => item.kind === "own-material")!;
    project = updateCustomSection(project, own.id, "میرا محفوظ ذاتی نکتہ");
    const changed = updateCustomProjectBasics(project, {
      duration: 45,
      kind: "general",
      researchQuery: "اخلاق اہل بیت",
    });

    expect(changed.duration).toBe(45);
    expect(changed.researchQuery).toBe("اخلاق اہل بیت");
    expect(
      changed.sections.find((item) => item.kind === "own-material")?.userText,
    ).toBe("میرا محفوظ ذاتی نکتہ");
    expect(changed.sections.reduce((sum, item) => sum + item.minutes, 0)).toBe(
      45,
    );
  });

  test("Friday khutbah gets separate first and second khutbah planning blocks", () => {
    const project = createCustomSermonProject({
      kind: "jumuah",
      title: "تقوی اور معاش",
      objective: "تقوی کو معاشی ذمہ داری سے جوڑنا",
      duration: 30,
    });

    expect(project.sections.some((item) => item.kind === "jumuah-first")).toBe(
      true,
    );
    expect(project.sections.some((item) => item.kind === "jumuah-second")).toBe(
      true,
    );
    expect(project.sections.reduce((sum, item) => sum + item.minutes, 0)).toBe(
      30,
    );
  });

  test("works end-to-end with the verified live Rizq research pipeline", () => {
    const project = createCustomSermonProject({
      kind: "majlis",
      title: "رزقِ حلال اور عزتِ نفس",
      objective: "توکل، کوشش اور حلال معاش کو ایک مجلس میں جوڑنا",
      duration: 30,
    });
    const research = researchKhateebTopic({
      query: "رزق",
      locale: "ur",
      maxEvidence: 30,
    });
    const researched = applyResearchToCustomProject(project, research);
    const ready = markCustomProjectReady(researched);
    const text = buildCustomSermonText(ready, "ur");

    expect(ready.status).toBe("ready");
    expect(
      ready.evidence.filter(
        (item) => item.status === "verified" && item.kind === "quran",
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      ready.evidence.filter(
        (item) => item.status === "verified" && item.kind === "hadith",
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(text).toContain("الکافی، ج5، ص78");
    expect(text).toContain("[مصدقہ ماخذ]");
    expect(validateCustomSermonProject(ready)).toEqual([]);
  });

  test("serializes and safely restores a saved project", () => {
    const project = createCustomSermonProject({
      kind: "general",
      title: "اخلاق",
      objective: "اخلاقی تربیت",
      duration: 45,
    });
    const restored = parseCustomSermonProject(
      serializeCustomSermonProject(project),
    );

    expect(restored).toEqual(project);
    expect(parseCustomSermonProject("bad-json")).toBeNull();
  });
});
