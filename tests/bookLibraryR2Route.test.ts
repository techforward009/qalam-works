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
  it("shows the real Sahifa supplication body for a title-only R2 search", async () => {
    const src={id:"sahifa-ur",book:"sahifa",language:"ur",filename:"sahifa-ur.docx",sha256:"a".repeat(64),translator:null};
    const record={id:"sahifa-ur:supplication:24",sourceId:src.id,book:"sahifa",language:"ur",kind:"supplication",number:24,
      title:"24. دُعَآؤُهٗ لِاَبَوَیْهِ",textSha256:"b".repeat(64),
      reference:{sourceId:src.id,section:"supplication",number:24,locator:"word/document.xml",printPage:null},
      paragraphs:[{id:"sahifa-ur:supplication:24:p1",text:"اپنے والدین کے حق میں حضرتؑ کی دُعا:"},
        {id:"sahifa-ur:supplication:24:p2",text:"اے اللہ! میرے ماں باپ کو عزت و کرامت سے مخصوص فرما۔"}]};
    r2.catalog.mockResolvedValue({ready:true,sources:[src],recordCount:1});
    r2.source.mockResolvedValue({records:[record],source:src});
    const url="https://qalam.test/api/khateeb/library?op=search&query=%D9%88%D8%A7%D9%84%D8%AF%DB%8C%D9%86&book=sahifa&language=ur&page=1";
    const response=await GET(new NextRequest(url));
    expect(response.status).toBe(200);
    const data=await response.json();
    expect(data.total).toBe(1);
    expect(data.hits[0].snippet).toContain("اے اللہ!");
    expect(data.hits[0].snippet).not.toContain("حضرتؑ کی دُعا");
    expect(data.hits[0].referenceLabelUr).toBe("صحیفہ کاملہ سجادیہ، دعا 24");
    expect(blob).not.toHaveBeenCalled();
  });

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
