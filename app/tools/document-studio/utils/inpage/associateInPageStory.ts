import type { InPageObjectMetadata, InPageRunAroundEvidence } from "./parseInPageObjectMetadata";

/** An opt-in screen-only object/styled-text *hypothesis*.
 * No stored frames, reflow, PDF, editing or source-file mutations. */
export type InPageTentativeBoxPreview = {
  storyNumber: number;
  descriptorOffset: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  text: string;
  runAround: InPageRunAroundEvidence;
};

/** Fail closed: never duplicate the longest/main story or guess between
 * multiple box candidates. This is experimental, not general INP import. */
export function associateOneInPageBoxStory(
  metadata: InPageObjectMetadata | null,
  stories: readonly (readonly string[])[],
  mainStoryIndex: number,
): InPageTentativeBoxPreview | null {
  if (metadata?.version !== 3 || metadata.candidates.length !== 1 || stories.length > 64 ||
      metadata.candidates[0].descriptorSubtype !== 6) return null;
  const box = metadata.candidates[0], index = box.candidateStoryIndex;
  if (index === undefined || !Number.isInteger(index) || index < 0 ||
      index >= stories.length || index === mainStoryIndex || mainStoryIndex < 0 ||
      mainStoryIndex >= stories.length) return null;
  const text = stories[index].join("\n");
  const mainText = stories[mainStoryIndex].join("\n");
  if (!text.trim() || text === mainText || text.length > 20000 ||
      ![box.xMm, box.yMm, box.widthMm, box.heightMm].every(Number.isFinite) ||
      box.widthMm <= 0 || box.heightMm <= 0) return null;
  return {
    storyNumber: index + 1, descriptorOffset: box.descriptorOffset,
    xMm: box.xMm, yMm: box.yMm, widthMm: box.widthMm, heightMm: box.heightMm,
    runAround: box.runAround, text,
  };
}

/** Convert a reviewed native box hypothesis into an editable Qalam frame.
 * Run Around metadata is retained, not applied to main story layout. */
export function makeEditableInPageFrame(
  box: InPageTentativeBoxPreview,
  documentId: string,
  page: { widthMm: number; heightMm: number },
): import("../../components/StudioObjectLayer").StudioFrame | null {
  if (!documentId || documentId.length > 160 ||
      !Number.isSafeInteger(box.storyNumber) || box.storyNumber < 1 ||
      !Number.isSafeInteger(box.descriptorOffset) || box.descriptorOffset < 0 ||
      ![box.xMm, box.yMm, box.widthMm, box.heightMm, page.widthMm, page.heightMm].every(Number.isFinite) ||
      box.xMm < 0 || box.yMm < 0 || box.widthMm <= 0 || box.heightMm <= 0 ||
      box.widthMm > 1000 || box.heightMm > 1000 ||
      box.xMm + box.widthMm > page.widthMm + 0.01 ||
      box.yMm + box.heightMm > page.heightMm + 0.01 ||
      !box.text.trim() || box.text.length > 20000) return null;
  return {
    id: "inpage-" + documentId + "-" + box.descriptorOffset,
    kind: "text", page: 1,
    xMm: box.xMm, yMm: box.yMm, wMm: box.widthMm, hMm: box.heightMm,
    flip: false, text: box.text,
    inPageSource: {
      version: 3, storyNumber: box.storyNumber,
      descriptorOffset: box.descriptorOffset,
      runAround: box.runAround,
    },
  };
}

/**
 * Two native InPage300 controlled documents identify profile 6 -> raw
 * reference 7 -> story slot 7 and profile 7 -> raw reference 9 -> slot 8.
 * The literal value 9 is NOT a direct story-array index. This is a narrow
 * 2-box conversion guard, not a general object-reference decoder.
 * All unsupported combinations must fail CLOSED.
 */
export function associateObservedTwoInPageBoxes(
  metadata: InPageObjectMetadata | null,
  stories: readonly (readonly string[])[],
  mainStoryIndex: number,
): InPageTentativeBoxPreview[] {
  const candidates = metadata?.candidates;
  if (metadata?.version !== 3 || !candidates || candidates.length !== 2 ||
      stories.length !== 9 || mainStoryIndex !== 6) return [];
  const [first, second] = candidates;
  if (first.descriptorSubtype !== 6 || second.descriptorSubtype !== 7 ||
      first.storyReferenceCode !== 7 || second.storyReferenceCode !== 9 ||
      first.descriptorOffset >= second.descriptorOffset) return [];
  const main = stories[6].join("\n");
  const texts = [stories[7].join("\n"), stories[8].join("\n")];
  if (!main.trim() || texts.some(text => !text.trim() || text.length > 20000 || text === main) ||
      texts[0] === texts[1]) return [];
  const valid = (box: typeof first) =>
    [box.xMm, box.yMm, box.widthMm, box.heightMm].every(Number.isFinite) &&
    box.xMm >= 0 && box.yMm >= 0 && box.widthMm > 0 && box.heightMm > 0 &&
    box.xMm < 2000 && box.yMm < 2000 &&
    box.widthMm < 2000 && box.heightMm < 2000;
  if (!candidates.every(valid)) return [];
  return candidates.map((box, index) => ({
    storyNumber: index + 8,
    descriptorOffset: box.descriptorOffset,
    xMm: box.xMm, yMm: box.yMm, widthMm: box.widthMm, heightMm: box.heightMm,
    text: texts[index], runAround: box.runAround,
  }));
}

/** Single-box compatibility, or the documented restricted 2-box profile. */
export function associateObservedInPageBoxStories(
  metadata: InPageObjectMetadata | null,
  stories: readonly (readonly string[])[],
  mainStoryIndex: number,
): InPageTentativeBoxPreview[] {
  if (metadata?.candidates.length === 1) {
    const one = associateOneInPageBoxStory(metadata, stories, mainStoryIndex);
    return one ? [one] : [];
  }
  return associateObservedTwoInPageBoxes(metadata, stories, mainStoryIndex);
}
