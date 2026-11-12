import type { BookExcerpt } from "./bookCorpus";
import { kafiHadithNumber } from "./bookCorpus";

/**
 * EXPERIMENTAL, NOT WIRED INTO PRODUCTION.
 *
 * An owner-reviewed reference sidecar is editorial metadata, never an amendment
 * to the original Arabic source, paragraph IDs, printed markers or translations.
 * This pure function produces only an optional supplemental citation preview.
 */
export type KafiCitationReview = {
  status: "reviewed" | "pending";
  source_id: string; source_sha256: string;
  record_id: string; record_sha256: string; paragraph_id: string;
  volume: number; printed_local_number: number | null;
  print_page: number | null; book_title: string | null;
  chapter_title: string | null; edition: string | null; evidence_url: string | null;
};
export type KafiCitationPreview = {
  labelUr: string; edition: string; evidenceUrl: string;
  sourceParagraphId: string; previewOnly: true;
};
const SUPPORTED_EDITION = "11027";

function editionPageUrl(value: string, volume: number, page: number): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || !["lib.eshia.ir", "ar.lib.eshia.ir"].includes(parsed.hostname)
      || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.port) return false;
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length === 3 && parts[0] === SUPPORTED_EDITION && parts[1] === String(volume)
      && parts[2] === String(page);
  } catch { return false; }
}

/**
 * Returns null rather than inventing bibliographic facts if any source identity
 * or printed local number disagrees. The caller must separately obtain the
 * reviewed sidecar from its authorised private repository.
 */
export function previewKafiCitation(
  excerpt: Readonly<BookExcerpt>, review: Readonly<KafiCitationReview> | null,
): KafiCitationPreview | null {
  if (!review || review.status !== "reviewed" || excerpt.language !== "ar"
    || !excerpt.sourceId.startsWith("kafi-v") || !excerpt.sourceId.endsWith("-ar")
    || review.source_id !== excerpt.sourceId || review.source_sha256 !== excerpt.sourceSha256
    || review.record_id !== excerpt.recordId || review.record_sha256 !== excerpt.recordSha256
    || !Number.isInteger(review.volume) || review.volume < 1 || review.volume > 8
    || excerpt.sourceId !== `kafi-v${review.volume}-ar`
    || !review.edition || !review.edition.trim() || review.edition.length > 250
    || !review.evidence_url || !review.print_page
    || !Number.isInteger(review.print_page) || review.print_page < 1
    || !Number.isInteger(review.printed_local_number) || review.printed_local_number! < 1
    || !editionPageUrl(review.evidence_url, review.volume, review.print_page)) return null;

  const paragraph = excerpt.paragraphs.find(p => p.id === review.paragraph_id);
  if (!paragraph || kafiHadithNumber(paragraph.text) !== review.printed_local_number) return null;
  // The printed number pertains to that paragraph, not to a synthesized
  // section ordinal or a book/chapter inferred from unrelated material.
  const number = review.printed_local_number;
  const labelUr = `الکافی، جلد ${review.volume}، روایت ${number}، صفحہ ${review.print_page}`;
  return {
    labelUr,
    edition: review.edition,
    evidenceUrl: review.evidence_url,
    sourceParagraphId: review.paragraph_id,
    previewOnly: true,
  };
}
