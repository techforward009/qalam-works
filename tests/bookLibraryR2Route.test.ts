import { beforeEach, describe, expect, it, vi } from "vitest";

const r2 = vi.hoisted(() => ({
  selected: vi.fn(),
  catalog: vi.fn(),
  record: vi.fn(),
  source: vi.fn(),
}));
const blob = vi.hoisted(() => vi.fn());

vi.mock("../app/api/research/bookLibraryR2Reader", () => ({
  bookLibraryR2IsSelected: r2.selected,
  loadBookLibraryR2Catalog: r2.catalog,
  readBookRecordFromR2: r2.record,
  readBookSourceFromR2: r2.source,
}));
vi.mock("../app/api/research/vercelResearchBlob", () => ({ researchBlobClientFromEnv: blob }));

import { NextRequest } from "next/server";
import { GET } from "../app/api/khateeb/library/route";

describe("Book Library R2 route switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    r2.selected.mockResolvedValue(true);
    r2.catalog.mockResolvedValue({ ready: true, revision: "r1", sources: [], recordCount: 1 });
  });

  it("serves a record via R2 without constructing the Blob client", async () => {
    r2.record.mockResolvedValue({ record: { id: "nahj-ar:sermon:1", paragraphs: [] }, source: { id: "nahj-ar" } });
    const response = await GET(new NextRequest("https://qalam.test/api/khateeb/library?op=record&sourceId=nahj-ar&id=nahj-ar%3Asermon%3A1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ record: { id: "nahj-ar:sermon:1" } });
    expect(r2.record).toHaveBeenCalledWith("nahj-ar", "nahj-ar:sermon:1");
    expect(blob).not.toHaveBeenCalled();
  });

  it("fails closed when the R2 mirror is unavailable", async () => {
    r2.catalog.mockRejectedValue(new Error("offline"));
    const response = await GET(new NextRequest("https://qalam.test/api/khateeb/library?op=catalog"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "unavailable" });
    expect(blob).not.toHaveBeenCalled();
  });
});
