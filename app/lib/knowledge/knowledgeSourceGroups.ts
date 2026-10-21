import type { KnowledgePassage } from "./retrieval";

export type KnowledgeSourceGroup = {
  id: string;
  referenceUr: string;
  referenceEn: string;
  passages: KnowledgePassage[];
};

/**
 * One reference card may contain distinct Arabic/Urdu edition excerpts,
 * each retaining its own verified source ID, paragraph ID and label.
 * NEVER infer that two paragraphs are line-by-line translations.
 */
export function groupKnowledgeSources(passages: readonly KnowledgePassage[]): KnowledgeSourceGroup[] {
  const groups: KnowledgeSourceGroup[] = [];
  for (const passage of passages) {
    const match = (passage.collection === "nahj" || passage.collection === "sahifa")
      ? groups.find(group => group.referenceUr === passage.referenceUr &&
          group.passages[0]?.collection === passage.collection &&
          !group.passages.some(previous => previous.language === passage.language))
      : undefined;
    if (match) {
      match.passages.push(passage);
    } else {
      groups.push({
        id: passage.id,
        referenceUr: passage.referenceUr,
        referenceEn: passage.referenceEn,
        passages: [passage],
      });
    }
  }
  return groups;
}
