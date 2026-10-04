import { describe, expect, test } from "vitest";
import {
  VERIFIED_HADITH_CORPUS,
  validateVerifiedHadithCorpus,
  type VerifiedHadithRecord,
} from "../app/tools/khateeb-studio/engine/verifiedHadithCorpus";

describe("Khateeb verified hadith corpus integrity", () => {
  test("the complete corpus satisfies verification invariants", () => {
    expect(validateVerifiedHadithCorpus()).toEqual([]);
  });

  test("rejects a verified record whose display text is not present verbatim in its witness", () => {
    const source = VERIFIED_HADITH_CORPUS.find(
      (row) => row.status === "verified" && row.witnesses.length > 0,
    )!;
    const broken: VerifiedHadithRecord = {
      ...source,
      id: "integrity-broken-verbatim",
      dossierPrimaryTextId: "integrity-broken-verbatim",
      exactArabic: "عبارة ليست في الشاهد",
    };

    expect(validateVerifiedHadithCorpus([broken])).toContain(
      "integrity-broken-verbatim: exactArabic is not a verbatim witness segment",
    );
  });

  test("rejects ellipses in text claimed as exact and verified", () => {
    const source = VERIFIED_HADITH_CORPUS.find(
      (row) => row.status === "verified" && row.witnesses.length > 0,
    )!;
    const witness = source.witnesses[0];
    const broken: VerifiedHadithRecord = {
      ...source,
      id: "integrity-broken-ellipsis",
      dossierPrimaryTextId: "integrity-broken-ellipsis",
      exactArabic: "نص ... ناقص",
      verificationWitnessId: "broken-witness",
      witnesses: [
        {
          ...witness,
          id: "broken-witness",
          exactArabic: "نص ... ناقص",
          textVerified: true,
        },
      ],
    };

    const errors = validateVerifiedHadithCorpus([broken]);
    expect(errors).toContain(
      "integrity-broken-ellipsis: verified exactArabic contains ellipsis",
    );
    expect(errors).toContain(
      "integrity-broken-ellipsis/broken-witness: verified witness contains ellipsis",
    );
  });

  test("pending records cannot carry verified exact text", () => {
    const source = VERIFIED_HADITH_CORPUS.find(
      (row) => row.status === "pending-verification",
    )!;
    const broken: VerifiedHadithRecord = {
      ...source,
      id: "integrity-broken-pending",
      dossierPrimaryTextId: "integrity-broken-pending",
      exactArabic: "نص",
      verificationWitnessId: "pretend-witness",
    };

    expect(validateVerifiedHadithCorpus([broken])).toContain(
      "integrity-broken-pending: pending record must not expose verified exact text or witness",
    );
  });
});
