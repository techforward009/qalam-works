// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReadySermonComposer from "../app/tools/khateeb-studio/ReadySermonComposer";
import { createCustomSermonProject } from "../app/tools/khateeb-studio/engine/customSermonProject";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function project(){const p=createCustomSermonProject({title:"صبر",objective:"تیاری",kind:"majlis",duration:30});return {...p,sections:p.sections.map((s,i)=>({...s,id:`composed-${i+1}`,userText:"یہ تیار مجلس کا متن ہے۔"}))};}
it("requires only a topic and sends duration without manual source selection",async()=>{
 const p=project();const request=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>({ok:true,json:async()=>({project:p})}));vi.stubGlobal("fetch",request);const saved=vi.fn(()=>true);
 render(<ReadySermonComposer locale="ur" project={null} onPrepared={saved}/>);
 fireEvent.change(screen.getByLabelText("مجلس کا موضوع"),{target:{value:"صبر"}});fireEvent.click(screen.getByRole("button",{name:"میری مجلس تیار کریں"}));await waitFor(()=>expect(saved).toHaveBeenCalledWith(p));
 expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toEqual({title:"صبر",duration:30,locale:"ur"});
});
it("shows the current sermon and revises from its existing text without replacing it on failure",async()=>{
 const p={...project(),duration:20 as const};const request=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>({ok:false,json:async()=>({code:"unverified"})}));vi.stubGlobal("fetch",request);const saved=vi.fn(()=>true);
 render(<ReadySermonComposer locale="ur" project={p} onPrepared={saved}/>);
 expect(screen.getByRole("heading",{name:"تیار مجلس: صبر"})).toBeTruthy();
 fireEvent.change(screen.getByLabelText("کیا تبدیلی چاہیے؟"),{target:{value:"زبان آسان کریں"}});fireEvent.click(screen.getByRole("button",{name:"تبدیلی کے ساتھ نیا نسخہ بنائیں"}));
 expect((await screen.findByRole("alert")).textContent).toContain("پچھلا نسخہ محفوظ ہے");expect(saved).not.toHaveBeenCalled();
 const body=JSON.parse(request.mock.calls[0][1]!.body as string);expect(body.duration).toBe(20);expect(body.title).toBe("صبر");expect(body.instruction).toBe("زبان آسان کریں");expect(body.previous).toContain("یہ تیار مجلس کا متن ہے");
});
