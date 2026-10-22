/** Private research persistence. Explicit R2 selection never falls back to deleted Blob. */
import { ResearchPersistenceError, type ResearchBlobClient } from "../../tools/research-studio/engine";
import { createResearchR2Client } from "./researchR2Store";
import { researchBlobClientFromEnv as legacyBlobClientFromEnv } from "./vercelResearchBlob";

export async function researchBlobClientFromEnv(): Promise<ResearchBlobClient> {
  const backend = (process.env.QALAM_RESEARCH_STORAGE_BACKEND ?? "vercel-blob").trim();
  if (backend === "cloudflare-r2") return createResearchR2Client(process.env);
  if (backend === "vercel-blob") return legacyBlobClientFromEnv();
  throw new ResearchPersistenceError("unavailable");
}
