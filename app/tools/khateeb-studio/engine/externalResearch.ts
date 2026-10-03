import { discoverEShia, type EShiaDiscoveryHit } from "./eshiaDiscovery";
import { fetchEShiaPage } from "./eshiaPage";
import { eShiaQueryVariants } from "./eshiaQueryVariants";
import { researchKhateebTopic } from "./researchEngine";
import type { KhateebResearchEvidence, KhateebResearchRequest, KhateebResearchResult } from "./researchTypes";

function excerpt(text: string, query: string, max = 1400): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const tokens = query
    .normalize("NFKC")
    .split(/\s+/)
    .filter((item) => item.length >= 3);
  const lower = clean.toLowerCase();
  const index = tokens
    .map((token) => lower.indexOf(token.toLowerCase()))
    .find((value) => typeof value === "number" && value >= 0) ?? 0;
  const start = Math.max(0, index - Math.floor(max / 4));
  return clean.slice(start, start + max).trim();
}

export async function researchKhateebTopicWithEShia(
  request: KhateebResearchRequest,
  options: { fetchImpl?: typeof fetch; maxEShiaPages?: number } = {},
): Promise<KhateebResearchResult> {
  const local = researchKhateebTopic(request);
  const variants = eShiaQueryVariants(request.query);
  const discovered: EShiaDiscoveryHit[] = [];
  let sawUnavailable = false;

  for (const variant of variants) {
    const result = await discoverEShia(variant, {
      fetchImpl: options.fetchImpl,
      limit: Math.max(3, Math.min(options.maxEShiaPages ?? 5, 8)),
    });
    if (result.status === "unavailable") sawUnavailable = true;
    if (result.status !== "ok") continue;
    for (const hit of result.hits) {
      if (!discovered.some((item) => item.url === hit.url)) discovered.push(hit);
      if (discovered.length >= (options.maxEShiaPages ?? 5)) break;
    }
    if (discovered.length >= (options.maxEShiaPages ?? 5)) break;
  }

  if (!discovered.length) {
    return {
      ...local,
      gapsUr:
        sawUnavailable
          ? [...local.gapsUr, "ای شیعہ کی براہِ راست تلاش اس وقت مکمل نہیں ہو سکی؛ مقامی مصدقہ مواد بدستور محفوظ ہے۔"]
          : [...local.gapsUr, "ای شیعہ میں اس عبارت کے لیے براہِ راست نتیجہ نہیں ملا؛ متبادل عربی/فارسی موضوعاتی الفاظ بھی آزمائے گئے۔"],
      gapsEn:
        sawUnavailable
          ? [...local.gapsEn, "Live eShia discovery could not be completed; verified local material remains available."]
          : [...local.gapsEn, "No direct eShia result was found; Arabic/Persian concept variants were also tried."],
    };
  }

  const records = await Promise.all(
    discovered
      .slice(0, options.maxEShiaPages ?? 5)
      .map((hit) => fetchEShiaPage(hit.url, request.query, { fetchImpl: options.fetchImpl })),
  );

  const externalEvidence: KhateebResearchEvidence[] = records
    .filter((record): record is NonNullable<typeof record> => Boolean(record))
    .map((record, index) => ({
      id: `eshia-live-${record.bookId}-${record.volume}-${record.page}-${index}`,
      topicId: local.matchedTopicIds[0] ?? "live-research",
      kind: "source",
      status: "verified",
      titleUr: record.bookTitle,
      titleEn: record.bookTitle,
      detailUr: excerpt(record.text, request.query),
      detailEn: excerpt(record.text, request.query),
      citationUr: record.citationUr,
      citationEn: `${record.bookTitle}, vol. ${record.volume}, p. ${record.page}${record.author ? `, ${record.author}` : ""}.`,
      sourceUrl: record.url,
      providerId: "eshia-library",
      arabic: excerpt(record.text, request.query),
    }));

  const maxEvidence = Math.min(Math.max(request.maxEvidence ?? 40, 5), 100);
  const evidence = [...local.evidence, ...externalEvidence].slice(0, maxEvidence);
  const verifiedCount = evidence.filter((item) => item.status === "verified").length;
  const sourceLeadCount = evidence.filter((item) => item.status === "source-lead").length;
  const catalogOnlyCount = evidence.filter((item) => item.status === "catalog-only").length;

  return {
    ...local,
    evidence,
    verifiedCount,
    sourceLeadCount,
    catalogOnlyCount,
    canBuildSermon: verifiedCount > 0,
    gapsUr:
      externalEvidence.length > 0
        ? local.gapsUr.filter((item) => !item.includes("مقامی مصدقہ تحقیقی اندراج"))
        : local.gapsUr,
    gapsEn:
      externalEvidence.length > 0
        ? local.gapsEn.filter((item) => !item.includes("No verified local research entry"))
        : local.gapsEn,
  };
}
