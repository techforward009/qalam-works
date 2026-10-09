import { describe,it,expect } from "vitest";
import { parseFeedback } from "../app/lib/feedback";
describe("tool feedback validation",()=>{
 const valid={tool:"khateeb-studio",rating:"partial",comment:"براہ کرم متن بڑا کریں",page:"/tools/khateeb-studio"};
 it("accepts concise relevant feedback",()=>{expect(parseFeedback(valid)).toEqual(valid);});
 it("rejects unknown tools and unrecognized ratings",()=>{expect(parseFeedback({...valid,tool:"admin"})).toBeNull();expect(parseFeedback({...valid,rating:"excellent"})).toBeNull();});
 it("rejects oversized comments, external paths and extra tracking fields",()=>{expect(parseFeedback({...valid,comment:"a".repeat(1201)})).toBeNull();expect(parseFeedback({...valid,page:"//evil.example"})).toBeNull();expect(parseFeedback({...valid,email:"private"})).toBeNull();});
});
