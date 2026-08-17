/**
 * Canonical Translation Export Model — Batch 17D.1.
 *
 * This is the ONLY place that transforms a TranslationProject into
 * an export representation. Copy, TXT, and later DOCX/handoff must all
 * consume this model instead of independently reading project state.
 *
 * INVARIANT: what the translator wrote in the target field is what
 * Qalam Works exports. This layer is a serializer, not a text processor.
 * It must never invoke processText(), Urdu/Arabic normalization, punctuation
 * cleanup, or fall back to source text for an empty target.
 */

import type { TranslationProject, TranslationSegment } from "./translationTypes";
import { languageDir } from "./translationTypes";

export interface TranslationExportBlock {
  id: string;
  /** Segment order — used to verify sort before serialization. */
  order: number;
  /** The translator's target text, verbatim. Empty string if untranslated. */
  text: string;
  /** Base direction of the target text for layout consumers. */
  direction: "rtl" | "ltr";
}

export interface TranslationExportModel {
  /** Project display name, verbatim. */
  title: string;
  targetLanguage: string;
  sourceLanguage: string;
  /**
   * Blocks in canonical segment order (ascending `order`).
   * The current segment model has no explicit paragraph-break metadata:
   * each segment is a flat paragraph-equivalent. Blocks are therefore
   * joined with a double newline (\n\n) when serialised — one blank line
   * between segments. This matches the source document's paragraph model
   * as imported by segmentText(). If a future model adds explicit break
   * markers this field will carry them.
   */
  blocks: TranslationExportBlock[];
  totalSegments: number;
  translatedSegments: number;
  untranslatedSegments: number;
}

/**
 * Builds the canonical export model from a project.
 *
 * Ordering: segments sorted by `order` (ascending). The authoritative
 * source is segment.order, not array position, key enumeration, or UI
 * filtered order. Tests verify this.
 *
 * Empty targets: the block's `text` is the empty string "".
 * Source text is NEVER substituted.
 *
 * No text processing: target values are passed through verbatim.
 */
export function buildTranslationExportModel(
  project: TranslationProject
): TranslationExportModel {
  const sorted = [...project.segments].sort((a, b) => a.order - b.order);
  const fallbackDir = languageDir(project.targetLanguage);

  const blocks: TranslationExportBlock[] = sorted.map((seg) => ({
    id: seg.id,
    order: seg.order,
    text: seg.target, // verbatim — no normalization, no source fallback
    direction: seg.target.trim().length > 0 ? seg.targetDir : fallbackDir,
  }));

  const translatedSegments = blocks.filter((b) => b.text.trim().length > 0).length;

  return {
    title: project.name,
    targetLanguage: project.targetLanguage,
    sourceLanguage: project.sourceLanguage,
    blocks,
    totalSegments: blocks.length,
    translatedSegments,
    untranslatedSegments: blocks.length - translatedSegments,
  };
}

/**
 * Serialises an export model to a plain UTF-8 text string (no BOM).
 * BOM is added by the TXT download caller; this keeps the text pure for
 * clipboard use and parity tests.
 *
 * Convention (deterministic):
 *  - Segments are separated by a single blank line (\n\n).
 *  - An empty target block emits an empty line (preserving document position).
 *  - A single trailing newline (\n) terminates the output.
 *  - Newline character is always \n, never \r\n.
 */
export function serializeExportModelToText(model: TranslationExportModel): string {
  if (model.blocks.length === 0) return "";
  return model.blocks.map((b) => b.text).join("\n\n") + "\n";
}

/**
 * Builds a DOCX Blob from a canonical export model.
 * Each block becomes one paragraph with the exact verbatim target text.
 * No text normalization, no Urdu/Arabic conversion, no source fallback.
 *
 * Direction is set per-paragraph from block.direction ("rtl" | "ltr"):
 *  - RTL → bidi=true, alignment=right, font="Noto Naskh Arabic"
 *  - LTR → bidi=false, alignment=left, font="Aptos"
 *
 * Empty blocks (untranslated) become empty paragraphs that preserve
 * document position; source text is never substituted.
 */
export async function buildDocxFromExportModel(model: TranslationExportModel): Promise<Blob> {
  const {
    Document, Paragraph, TextRun, AlignmentType, Packer,
  } = await import("docx") as typeof import("docx");

  const paragraphs = model.blocks.map((block) => {
    const isRtl = block.direction === "rtl";
    return new Paragraph({
      bidirectional: isRtl,
      alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: [
        new TextRun({
          text: block.text, // verbatim — no normalization
          font: isRtl ? "Noto Naskh Arabic" : "Aptos",
          size: 24, // 12pt
        }),
      ],
    });
  });

  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBlob(doc);
}

/**
 * Sanitizes a project name for use as a filename stem.
 * Removes / \ : * ? " < > | and null bytes; collapses internal whitespace
 * to hyphens; trims leading/trailing hyphens and whitespace.
 * Preserves Urdu, Arabic, Persian and other Unicode letters.
 * Returns a stable fallback if the result is empty.
 */
export function sanitizeFilenameBase(name: string, fallback = "translation"): string {
  const stripped = name
    .replace(/[/\\:*?"<>|\0]/g, "")   // forbidden filename chars
    .replace(/\s+/g, "-")             // collapse whitespace to hyphens
    .replace(/^-+|-+$/g, "")          // trim leading/trailing hyphens
    .trim();
  return stripped.length > 0 ? stripped : fallback;
}
