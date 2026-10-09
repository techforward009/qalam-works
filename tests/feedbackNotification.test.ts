import {describe,expect,it,vi} from "vitest";
import {FEEDBACK_NOTIFICATION_TO,notifyFeedback} from "../app/lib/feedbackNotification";
const entry={tool:"khateeb-studio",rating:"partial",comment:"متن بڑا کریں",createdAt:"2026-10-09T09:00:00Z"};
describe("feedback email delivery",()=>{
 it("uses info@qalamworks.com and never sends without configured credentials",async()=>{
  const fetchMock=vi.fn().mockResolvedValue({ok:true});
  expect(FEEDBACK_NOTIFICATION_TO).toBe("info@qalamworks.com");
  expect(await notifyFeedback(entry,{},fetchMock)).toBe("not-configured");
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it("emails feedback without leaking provider key or altering the submitted comment",async()=>{
  const fetchMock=vi.fn().mockResolvedValue({ok:true});
  expect(await notifyFeedback(entry,{RESEND_API_KEY:"secret",QALAM_FEEDBACK_FROM_EMAIL:"feedback@qalamworks.com"},fetchMock)).toBe("sent");
  const [url,options]=fetchMock.mock.calls[0];
  expect(url).toBe("https://api.resend.com/emails");
  const body=JSON.parse(options.body);
  expect(body.to).toEqual(["info@qalamworks.com"]);
  expect(body.text).toContain(entry.comment);
  expect(body.text).not.toContain("secret");
 });
 it("reports mail failures without treating them as feedback write failures",async()=>{
  expect(await notifyFeedback(entry,{RESEND_API_KEY:"x",QALAM_FEEDBACK_FROM_EMAIL:"feedback@qalamworks.com"},vi.fn().mockResolvedValue({ok:false}))).toBe("failed");
 });
});
