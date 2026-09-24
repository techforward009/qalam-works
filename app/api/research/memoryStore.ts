import {
  createMemoryResearchEngineStore,
  type ResearchEngineStore,
} from "../../tools/research-studio/engine";

let apiStore: ResearchEngineStore | null = null;

/** One process-local store shared by the research API. Restart clears it. */
export function getResearchApiStore(): ResearchEngineStore {
  if (!apiStore) apiStore = createMemoryResearchEngineStore();
  return apiStore;
}
