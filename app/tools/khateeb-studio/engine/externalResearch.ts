import { discoverEShia, type EShiaDiscoveryHit } from "./eshiaDiscovery";
import { fetchEShiaPage } from "./eshiaPage";
import { eShiaQueryVariants } from "./eshiaQueryVariants";
import { researchKhateebTopic } from "./researchEngine";
import type { KhateebResearchEvidence, KhateebResearchRequest, KhateebResearchResult } from "./researchTypes";

function excerpt(text: string, query: string, max = 900): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  const variants = eShiaQueryVariants(query)
    .flatMap((value) => normalizeForRelevance(value).split(" "))
    .filter((item) => item.length >= 3);
  const tokens = Array.from(
    new Set([
      ...normalizeForRelevance(query).split(" ").filter((item) => item.length >= 3),
      ...variants,
    ]),
  );

  const hay = normalizeForRelevance(clean);
  const hitIndexes = tokens
    .map((token) => hay.indexOf(token))
    .filter((value) => value >= 0);

  const index = hitIndexes.length ? Math.min(...hitIndexes) : 0;
  const start = Math.max(0, index - Math.floor(max / 5));
  const sliced = clean.slice(start, start + max).trim();
  return start > 0 ? `…${sliced}` : sliced;
}

const RELEVANCE_STOP_WORDS = new Set([
  "میں", "سے", "کے", "کی", "کا", "کو", "اور", "پر", "ایک", "یہ", "وہ",
  "اسلامی", "طریقے", "ذمہ", "داری", "پانے", "کرنے", "اسباب",
]);

function normalizeForRelevance(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/gu, "")
    .replace(/[أإآ]/gu, "ا")
    .replace(/ى/gu, "ی")
    .replace(/ي/gu, "ی")
    .replace(/ك/gu, "ک")
    .replace(/ء/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function relevanceTerms(query: string): readonly string[] {
  const values = [query, ...eShiaQueryVariants(query)];
  const terms = new Set<string>();
  for (const value of values) {
    for (let token of normalizeForRelevance(value).split(" ")) {
      if (token.length < 3 || RELEVANCE_STOP_WORDS.has(token)) continue;
      if (token.startsWith("ال") && token.length > 4) token = token.slice(2);
      terms.add(token);
    }
  }
  return [...terms];
}

function sourceRelevanceScore(title: string, text: string, query: string): number {
  const hay = normalizeForRelevance(`${title} ${text}`);
  const terms = relevanceTerms(query);
  const matched = terms.filter((term) => hay.includes(term));
  const exact = hay.includes(normalizeForRelevance(query));
  return (exact ? 10 : 0) + matched.length;
}

function sourceAuthorityBonus(title: string): number {
  const value = normalizeForRelevance(title);
  const preferred = [
    "\u0627\u0644\u06a9\u0627\u0641\u06cc",
    "\u0627\u0644\u0643\u0627\u0641\u064a",
    "\u0645\u064a\u0632\u0627\u0646 \u0627\u0644\u062d\u0643\u0645\u0647",
    "\u0645\u064a\u0632\u0627\u0646 \u0627\u0644\u062d\u0643\u0645\u0629",
    "\u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u0634\u064a\u0639\u0647",
    "\u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u0634\u064a\u0639\u0629",
    "\u0628\u062d\u0627\u0631 \u0627\u0644\u0627\u0646\u0648\u0627\u0631",
    "\u0627\u0644\u062e\u0635\u0627\u0644",
    "\u062c\u0627\u0645\u0639 \u0627\u062d\u0627\u062f\u064a\u062b \u0627\u0644\u0634\u064a\u0639\u0647",
    "\u062c\u0627\u0645\u0639 \u0623\u062d\u0627\u062f\u064a\u062b \u0627\u0644\u0634\u064a\u0639\u0629",
    "\u0627\u0644\u0645\u062d\u062c\u0647 \u0627\u0644\u0628\u064a\u0636\u0627\u0621",
    "\u0627\u0644\u0645\u062d\u062c\u0629 \u0627\u0644\u0628\u064a\u0636\u0627\u0621",
    "\u0627\u0644\u0645\u064a\u0632\u0627\u0646 \u0641\u064a \u062a\u0641\u0633\u064a\u0631 \u0627\u0644\u0642\u0631\u0627\u0646",
    "\u0627\u0644\u0645\u064a\u0632\u0627\u0646 \u0641\u064a \u062a\u0641\u0633\u064a\u0631 \u0627\u0644\u0642\u0631\u0622\u0646",
    "\u0645\u0633\u062a\u062f\u0631\u0643 \u0633\u0641\u064a\u0646\u0647 \u0627\u0644\u0628\u062d\u0627\u0631",
    "\u0645\u0633\u062a\u062f\u0631\u0643 \u0633\u0641\u064a\u0646\u0629 \u0627\u0644\u0628\u062d\u0627\u0631",
    "\u0645\u0634\u06a9\u0627\u0647 \u0627\u0644\u0627\u0646\u0648\u0627\u0631",
    "\u0645\u0634\u0643\u0627\u0629 \u0627\u0644\u0623\u0646\u0648\u0627\u0631",
    "\u0631\u0648\u0636\u0647 \u0627\u0644\u0648\u0627\u0639\u0638\u064a\u0646",
    "\u0631\u0648\u0636\u0629 \u0627\u0644\u0648\u0627\u0639\u0638\u064a\u0646",
  ];
  return preferred.some((item) =>
    value.includes(normalizeForRelevance(item))
  ) ? 4 : 0;
}

function sourceIsRelevant(title: string, text: string, query: string): boolean {
  const terms = relevanceTerms(query);
  const score = sourceRelevanceScore(title, text, query);
  const minimum = terms.length <= 2 ? 1 : 2;
  return score >= minimum;
}


function sourceThemesUr(text: string): readonly string[] {
  const hay = normalizeForRelevance(text);
  const themes: string[] = [];
  const push = (label: string) => {
    if (!themes.includes(label)) themes.push(label);
  };
  if (/حلال|رزق حلال|طلب الحلال/u.test(hay)) push("کسبِ حلال");
  if (/توکل|التوکل|ثقه بالله|الرزق من الله/u.test(hay)) push("توکل اور اعتماد علی اللہ");
  if (/قناعت|يقنع|الحرص|طمع/u.test(hay)) push("قناعت اور حرص سے اجتناب");
  if (/صلة الرحم|ارحام|رحم/u.test(hay)) push("صلۂ رحم");
  if (/استغفار|توبه|توبہ/u.test(hay)) push("استغفار و توبہ");
  if (/تقوی|تقوى|متق/u.test(hay)) push("تقویٰ");
  if (/خمس|سهم امام|حق حلال/u.test(hay)) push("حقوقِ مالیہ کی ادائیگی");
  if (/بسط الرزق|يقسم|مقسوم|قسمة الرزق/u.test(hay)) push("تقسیمِ رزق اور رضائے الٰہی");
  return themes.slice(0, 3);
}

export async function researchKhateebTopicWithEShia(
  request: KhateebResearchRequest,
  options: { fetchImpl?: typeof fetch; maxEShiaPages?: number } = {},
): Promise<KhateebResearchResult> {
  const local = researchKhateebTopic(request);
  const variants = eShiaQueryVariants(request.query);
  const discovered: EShiaDiscoveryHit[] = [];
  let sawUnavailable = false;
  const fetchBudget = Math.max(8, Math.min(options.maxEShiaPages ?? 10, 12));
  const discoveryBudget = Math.min(fetchBudget * 2, 20);
  const perVariant = 2;

  for (const variant of variants) {
    const result = await discoverEShia(variant, {
      fetchImpl: options.fetchImpl,
      limit: perVariant,
    });
    if (result.status === "unavailable") sawUnavailable = true;
    if (result.status !== "ok") continue;
    for (const hit of result.hits.slice(0, perVariant)) {
      if (!discovered.some((item) => item.url === hit.url)) discovered.push(hit);
      if (discovered.length >= discoveryBudget) break;
    }
    if (discovered.length >= discoveryBudget) break;
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
      .slice(0, fetchBudget)
      .map((hit) => fetchEShiaPage(hit.url, request.query, { fetchImpl: options.fetchImpl })),
  );

  const externalEvidence: KhateebResearchEvidence[] = records
    .filter((record): record is NonNullable<typeof record> => Boolean(record))
    .filter((record) => sourceIsRelevant(record.bookTitle, record.text, request.query))
    .sort(
      (a, b) =>
        (sourceRelevanceScore(b.bookTitle, b.text, request.query) +
          sourceAuthorityBonus(b.bookTitle)) -
        (sourceRelevanceScore(a.bookTitle, a.text, request.query) +
          sourceAuthorityBonus(a.bookTitle)),
    )
    .map((record, index) => ({
      id: `eshia-live-${record.bookId}-${record.volume}-${record.page}-${index}`,
      topicId: local.matchedTopicIds[0] ?? "live-research",
      kind: "source",
      status: "source-lead",
      titleUr: record.bookTitle,
      titleEn: record.bookTitle,
      detailUr: excerpt(record.text, request.query),
      detailEn: excerpt(record.text, request.query),
      citationUr: record.citationUr,
      citationEn: `${record.bookTitle}, vol. ${record.volume}, p. ${record.page}${record.author ? `, ${record.author}` : ""}.`,
      sourceUrl: record.url,
      providerId: "eshia-library",
      themesUr: sourceThemesUr(`${record.bookTitle} ${record.text}`),
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
