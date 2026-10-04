import { describe, expect, test } from "vitest";
import {
  buildLiveHadithCandidate,
  buildLiveHadithCandidateQueue,
  candidateQueueSummaryUr,
} from "../app/tools/khateeb-studio/engine/hadithCandidateQueue";
import type { KhateebResearchEvidence } from "../app/tools/khateeb-studio/engine/researchTypes";

function lead(
  id: string,
  text: string,
  status: KhateebResearchEvidence["status"] = "source-lead",
): KhateebResearchEvidence {
  return {
    id,
    topicId: "live-research",
    kind: "source",
    status,
    titleUr: "الکافی",
    titleEn: "Al-Kafi",
    detailUr: text,
    detailEn: text,
    citationUr: "الکافی، ج2، ص609۔",
    citationEn: "Al-Kafi, vol. 2, p. 609.",
    sourceUrl: "https://lib.eshia.ir/11005/2/609",
    providerId: "eshia-library",
    sourceExcerpt: text,
    sourceExcerptStatus: "page-excerpt",
  };
}

describe("Khateeb live hadith candidate queue", () => {
  test("promotes a hadith-like eShia page excerpt only to candidate, never verified", () => {
    const evidence = lead(
      "eshia-live-1",
      "قال أبو عبد الله عليه السلام: الصبر من الإيمان بمنزلة الرأس من الجسد.",
    );
    const candidate = buildLiveHadithCandidate(evidence);

    expect(candidate).not.toBeNull();
    expect(candidate?.status).toBe("candidate");
    expect(candidate?.score).toBeGreaterThanOrEqual(7);
    expect(candidate?.signals).toEqual(
      expect.arrayContaining(["qala", "imam", "honorific"]),
    );
    expect(candidate?.missing).toContain("primary-source-confirmation");
    expect(evidence.status).toBe("source-lead");
  });

  test("keeps weakly attributed page text in needs-context state", () => {
    const candidate = buildLiveHadithCandidate(
      lead(
        "eshia-live-2",
        "عن بعض أصحابنا في باب الصبر كلام طويل يحتاج إلى مراجعة المصدر.",
      ),
    );

    expect(candidate?.status).toBe("needs-context");
    expect(candidate?.missing).toContain("explicit-attribution");
  });

  test("drops ordinary prose from the hadith verification queue", () => {
    const prose = lead(
      "eshia-live-3",
      "هذا الفصل يبحث في معنى الصبر وآثاره الاجتماعية والتربوية في حياة الإنسان.",
    );
    const candidate = buildLiveHadithCandidate(prose);
    const queue = buildLiveHadithCandidateQueue([prose]);

    expect(candidate?.status).toBe("not-hadith-like");
    expect(queue).toEqual([]);
  });

  test("never creates a candidate from a verified local record or non-eShia source", () => {
    const verified = lead(
      "local-verified",
      "قال أبو عبد الله عليه السلام: نص.",
      "verified",
    );
    const otherProvider = {
      ...lead("other-provider", "قال أبو عبد الله عليه السلام: نص."),
      providerId: "other",
    };

    expect(buildLiveHadithCandidate(verified)).toBeNull();
    expect(buildLiveHadithCandidate(otherProvider)).toBeNull();
  });

  test("ranks stronger candidates before records that need more context", () => {
    const strong = lead(
      "strong",
      "قال أبو جعفر عليه السلام: إن المؤمن يصبر عند البلاء ويحمد الله.",
    );
    const context = lead(
      "context",
      "عن بعض أصحابنا في معنى الصبر كلام مروي في هذا الباب.",
    );

    const queue = buildLiveHadithCandidateQueue([context, strong]);

    expect(queue).toHaveLength(2);
    expect(queue[0].evidenceId).toBe("strong");
    expect(queue[0].status).toBe("candidate");
    expect(queue[1].status).toBe("needs-context");
  });

  test("summary explicitly says candidates are not auto-verified", () => {
    const queue = buildLiveHadithCandidateQueue([
      lead(
        "strong",
        "قال أبو عبد الله عليه السلام: الصبر من الإيمان بمنزلة الرأس من الجسد.",
      ),
    ]);

    expect(candidateQueueSummaryUr(queue)).toContain("خودکار طور پر مصدقہ روایت نہیں");
  });
});
