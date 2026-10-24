import { describe, expect, it } from "vitest";
import { parseLeading, migrateLeading, migrateDocumentLeading, autoLeadingPt, leadingPt } from "../app/tools/document-studio/utils/leading";
import { blockLeadingPt } from "../app/tools/document-studio/utils/autoLeading";
import { defaultDocumentSettings, parseDocumentSettings, withStudioUrduFont } from "../app/tools/document-studio/utils/documentSettings";
import { caretGeometry } from "../app/tools/document-studio/utils/caretGeometry";

describe("point leading",()=>{
 it.each(["5","5pt","20pt","800pt","999pt"])("parses %s",raw=>expect(parseLeading(raw)).toEqual({mode:"points",value:parseFloat(raw)}));
 it("parses Auto and rejects partial/invalid values",()=>{
  expect(parseLeading(" Auto ")).toEqual({mode:"auto"});
  for(const value of ["",0,"0pt","-1","5oops",Infinity,NaN,"1e3",10000]) expect(parseLeading(value)).toBeNull();
 });
 it("migrates old multipliers once, rounded to half a point",()=>{
  expect(migrateLeading(1.5,12)).toEqual({mode:"points",value:18});
  expect(migrateLeading(1.15,13)).toEqual({mode:"points",value:15});
  expect(migrateLeading({mode:"points",value:5},12)).toEqual({mode:"points",value:5});
  const old={type:"doc",content:[{type:"paragraph",attrs:{lineHeight:1.5},content:[{type:"text",text:"اردو",marks:[{type:"textStyle",attrs:{fontSize:"28pt"}}]}]}]};
  const next=migrateDocumentLeading(old,12);
  expect(next.content![0].attrs).toMatchObject({leading:{mode:"points",value:42},lineHeight:null});
  expect(migrateDocumentLeading(next,12)).toEqual(next);
 });
 it("Auto follows the paragraph font and size without replacing exact leading",()=>{
  expect(autoLeadingPt("Mehr Nastaliq Web",12)).toBeCloseTo(19.8);
  expect(autoLeadingPt("Jameel Noori Nastaleeq",28)).toBeCloseTo(46.2);
  expect(autoLeadingPt("Arial",12)).toBe(15);
  expect(leadingPt({mode:"points",value:5},"Mehr Nastaliq Web",36)).toBe(5);
  expect(blockLeadingPt({type:"paragraph",content:[{type:"text",text:"اردو",marks:[{type:"textStyle",attrs:{fontSize:"28pt"}}]}]},"Mehr Nastaliq Web",defaultDocumentSettings().typography,"rtl")).toBeCloseTo(46.2);
 });
 it("defaults to Mehr, Auto and zero after-space; saved fonts survive opening",()=>{
  const settings=defaultDocumentSettings();expect(settings.typography).toMatchObject({defaultRtlFontId:"mehr-nastaliq-web",leading:{mode:"auto"},paragraphAfterPt:0});
  settings.typography.defaultRtlFontId="jameel-noori-nastaleeq";
  expect(withStudioUrduFont(settings).typography.defaultRtlFontId).toBe("jameel-noori-nastaleeq");
  expect(parseDocumentSettings({typography:{bodyFontSizePt:12,lineHeight:2}}).typography.leading).toEqual({mode:"points",value:24});
 });
});
it.each([.5,1,1.5])("clamps the entire leading-height caret at both guides, scale %s",scale=>{
 const base={x:900,top:990,height:26.4,scale,rtl:true,blockLeft:40,blockRight:700,contentLeft:40,contentRight:700,contentTop:48,contentBottom:1000};
 const last=caretGeometry(base);expect(last.top+last.height).toBeLessThanOrEqual(1000);expect(last.height).toBeCloseTo(26.4,8);expect(last.width*scale).toBe(2);expect((700-last.left-last.width)*scale).toBeCloseTo(1);
 const first=caretGeometry({...base,top:-100,rtl:false,x:40});expect(first.top).toBeGreaterThanOrEqual(48);expect((first.left-40)*scale).toBeCloseTo(1);
});
it("PDF and DOCX retain explicit 5pt leading rather than multiplying the font size",async()=>{
 const {buildPdfHtml}=await import("../app/tools/document-studio/utils/buildPdfHtml");
 const {createDocxDocument}=await import("../app/tools/document-studio/utils/buildDocxDocument");
 const {Packer}=await import("docx");const {default:JSZip}=await import("jszip");
 const doc={type:"doc",content:[{type:"paragraph",attrs:{dir:"rtl",leading:{mode:"points",value:5}},content:[{type:"text",text:"اردو"}]}]};
 const settings=defaultDocumentSettings();
 expect(buildPdfHtml(doc,"rtl",{faces:[]},settings.typography).html).toContain("line-height:5pt");
 const xml=await (await JSZip.loadAsync(await Packer.toBuffer(createDocxDocument(doc,"rtl",settings)))).file("word/document.xml")!.async("text");
 expect(xml).toContain('w:line="100"');expect(xml).toContain('w:lineRule="exact"');
});
it("small leading paginates by pitch rather than overlapping ink height",async()=>{
 const {placeInkLines}=await import("../app/tools/document-studio/utils/pdfInkPagination");
 const lines=Array.from({length:8},(_,i)=>({block:i,heading:false,baseline:20+i*5,offset:0,frameTop:0,frameBottom:30,frameLeft:0,frameRight:100,inkTop:-15,inkBottom:15,inkLeft:0,inkRight:100,metricTop:-15,metricBottom:15,boxTop:-20,boxBottom:-15}));
 const placed=placeInkLines(lines,32);expect(placed.map(p=>p.page)).toEqual([0,0,0,0,0,0,1,1]);
});
