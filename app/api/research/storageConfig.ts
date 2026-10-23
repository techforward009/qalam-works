import { NextResponse } from "next/server";

export const RESEARCH_STORAGE_NOT_CONFIGURED = "research-storage-not-configured";
let loggedMissingBackend = false;

export class ResearchStorageNotConfiguredError extends Error {
  readonly code = RESEARCH_STORAGE_NOT_CONFIGURED;
  constructor() {
    super("Research storage is not configured.");
    this.name = "ResearchStorageNotConfiguredError";
  }
}

/** No implicit provider and no fallback. Log only a fixed code, once per process. */
export function configuredResearchBackend(): string {
  const backend = process.env.QALAM_RESEARCH_STORAGE_BACKEND?.trim();
  if (backend) return backend;
  if (!loggedMissingBackend) {
    loggedMissingBackend = true;
    console.error(RESEARCH_STORAGE_NOT_CONFIGURED);
  }
  throw new ResearchStorageNotConfiguredError();
}

/** Authenticate first; fail before reading uploads, sources or making storage calls. */
export function rejectUnconfiguredResearchStorage(): NextResponse | null {
  try { configuredResearchBackend(); return null; }
  catch (error) {
    if (!(error instanceof ResearchStorageNotConfiguredError)) throw error;
    return NextResponse.json({error:error.message,code:error.code}, {
      status:503,headers:{"Cache-Control":"private, no-store"},
    });
  }
}
