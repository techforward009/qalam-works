import { describe,it,expect } from "vitest";
import { isFeedbackAdmin, summarizeFeedback } from "../app/lib/feedbackAdmin";
describe("feedback report security",()=>{
 const secret="long-feedback-admin-secret-that-is-private";
 it("requires exact admin credential",()=>{expect(isFeedbackAdmin("Bearer "+secret,secret)).toBe(true);expect(isFeedbackAdmin("Bearer "+secret+"x",secret)).toBe(false);expect(isFeedbackAdmin(null,secret)).toBe(false);expect(isFeedbackAdmin("Bearer abc","short")).toBe(false);});
 it("aggregates counts per tool",()=>{expect(summarizeFeedback([{tool:"khateeb-studio",rating:"helpful",comment:"",page:"/",createdAt:"2026-01-01"},{tool:"khateeb-studio",rating:"partial",comment:"",page:"/",createdAt:"2026-01-02"}])).toEqual({"khateeb-studio":{total:2,helpful:1,partial:1,notHelpful:0}});});
});
