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
  if (metadata?.version !== 3 || metadata.candidates.length !== 1 || stories.length > 64) return null;
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
