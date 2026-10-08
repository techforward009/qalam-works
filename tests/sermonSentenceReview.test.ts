import { expect, it, vi } from "vitest";
import { createSermonSentenceReviewer, parseSentenceReviews, parseCompactSentenceReviews, sermonRejectedSentences, sermonSentences } from "../app/lib/knowledge/sermonReview";
import type { AnswerInput, ResearchClaim } from "../app/lib/knowledge/researchAnswer";

const input: AnswerInput = { question: "صبر", locale: "ur", evidence: [
  { ref: 1, passage: { id: "quran:2:45", collection: "quran", language: "ar", referenceUr: "قرآن، 2:45", referenceEn: "Quran, 2:45", text: "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ", sourceSha256: "a".repeat(64), translator: null, suppliedTranslation: { language: "ur", translator: "فراہم کردہ مترجم", text: "اور صبر اور نماز کا سہارا لو اور یہ (نماز) بارگراں ہے، مگر خشوع رکھنے والوں پر نہیں۔" } } },
  { ref: 2, passage: { id: "quran:2:153", collection: "quran", language: "ar", referenceUr: "قرآن، 2:153", referenceEn: "Quran, 2:153", text: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", sourceSha256: "a".repeat(64), translator: null, suppliedTranslation: { language: "ur", translator: "فراہم کردہ مترجم", text: "اللہ یقینا صبر کرنے والوں کے ساتھ ہے۔" } } },
] };
const claims: ResearchClaim[] = [{ id: "section-1", text: "محترم سامعین! نماز خشوع رکھنے والوں کے سوا کسی پر بھاری نہیں ہوتی۔", citations: [{ passageId: "quran:2:45", quote: input.evidence[0].passage.text }] }];
const review = () => ({ reviews: [{ claimId: "section-1", sentences: [
  { index: 1, verdict: "nonfactual", reason: "nonfactual", refs: [] },
  { index: 2, verdict: "unsupported", reason: "contradiction", refs: [1] },
] }] });

it("checks each Urdu sentence including a greeting and a reversed exception", () => {
  expect(sermonSentences(claims[0].text)).toHaveLength(2);
  expect(parseSentenceReviews(review(), input, claims)).toEqual({ reviews: [{ claimId: "section-1", verdict: "unsupported", reason: "contradiction" }] });
});
it("rejects a skipped or duplicated sentence rather than accepting the rest of a section", () => {
  const missing = review(); missing.reviews[0].sentences.pop();
  expect(parseSentenceReviews(missing, input, claims)).toBeNull();
  const duplicate = review(); duplicate.reviews[0].sentences[1].index = 1;
  expect(parseSentenceReviews(duplicate, input, claims)).toBeNull();
});
it("requires supporting references from that section, not another available verse", () => {
  const wrong = review(); wrong.reviews[0].sentences[1] = { index: 2, verdict: "supported", reason: "entailed", refs: [2] };
  expect(parseSentenceReviews(wrong, input, claims)).toBeNull();
  wrong.reviews[0].sentences[1].refs = [];
  expect(parseSentenceReviews(wrong, input, claims)).toBeNull();
});
it("requires explicit consistent reasons and refuses an unnumbered audit", () => {
  const wrong = review(); wrong.reviews[0].sentences[1].reason = "entailed";
  expect(parseSentenceReviews(wrong, input, claims)).toBeNull();
  expect(parseSentenceReviews({ supported: true }, input, claims)).toBeNull();
});
it("uses a separate source-only reasoning request and never returns model reasoning as sermon text", async () => {
  const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(compactReview()), reasoning: "not part of the response" } }] })));
  const provider = createSermonSentenceReviewer({ apiKey: "test-key", fetchImpl: fetchMock })!;
  expect(await provider.review(input, claims)).toMatchObject({ reviews: [{ claimId: "section-1", verdict: "unsupported", reason: "contradiction" }] });
  const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
  expect(body.max_completion_tokens).toBe(500);
  expect(body.reasoning_effort).toBe("low"); expect(body.model).toBe("openai/gpt-oss-120b"); expect(body.reasoning_format).toBeUndefined();
  expect(body.messages[0].content).toContain("reverses the exception");
  expect(body.response_format).toEqual({type:"json_object"});
  expect(body.messages[0].content).toContain('{"reviews":[{"claimId":"section id","sentences":[{"i":1,"v":"s","r":"e","refs":[1]}]}]}');
  const request = JSON.parse(body.messages[1].content);
  expect(request.evidence).toHaveLength(1);
  expect(request.sections[0].sentences).toHaveLength(2);expect(request.sections[0].refs).toEqual([1]);
  expect(request.evidence[0].suppliedTranslation.text).toBe(input.evidence[0].passage.suppliedTranslation?.text);
});
it("fails closed on provider rejection and incomplete review output", async () => {
  const rejected = createSermonSentenceReviewer({ apiKey: "test", fetchImpl: vi.fn(async () => new Response("", { status: 429 })) })!;
  await expect(rejected.review(input, claims)).rejects.toThrow("provider-rate-limited");
  const malformed = createSermonSentenceReviewer({ apiKey: "test", fetchImpl: vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"reviews":[]}' } }] }))) })!;
  await expect(malformed.review(input, claims)).rejects.toThrow("provider-format");
  expect(createSermonSentenceReviewer({ apiKey: "" })).toBeNull();
});

const compactReview=()=>({reviews:[{claimId:"section-1",sentences:[{i:1,v:"n",r:"n",refs:[]},{i:2,v:"u",r:"c",refs:[1]}]}]});
it("compact audits retain every sentence, own-source scope and reasons",()=>{
 expect(parseCompactSentenceReviews(compactReview(),input,claims)).toEqual(parseSentenceReviews(review(),input,claims));
 const missing=compactReview();missing.reviews[0].sentences.pop();expect(parseCompactSentenceReviews(missing,input,claims)).toBeNull();
 const wrong=compactReview();wrong.reviews[0].sentences[1].v="s";wrong.reviews[0].sentences[1].r="e";wrong.reviews[0].sentences[1].refs=[2];expect(parseCompactSentenceReviews(wrong,input,claims)).toBeNull();
 const invalid=compactReview();invalid.reviews[0].sentences[1].r="__proto__";expect(parseCompactSentenceReviews(invalid,input,claims)).toBeNull();
 expect(parseCompactSentenceReviews(review(),input,claims)).toBeNull();
});

it("reviews long sections in bounded batches and checks every section before acceptance",async()=>{
 const longClaims=Array.from({length:5},(_,i)=>({...claims[0],id:`section-${i+1}`,text:("نماز خشوع رکھنے والوں پر بھاری نہیں ہوتی۔ ").repeat(40)}));
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,init?:RequestInit)=>{
  const body=JSON.parse(init!.body as string);const request=JSON.parse(body.messages[1].content);
  expect(request.sections).toHaveLength(1);expect(request.evidence).toHaveLength(1);
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reviews:request.sections.map((s:{claimId:string;sentences:{index:number}[]})=>({claimId:s.claimId,sentences:s.sentences.map(x=>({i:x.index,v:"s",r:"e",refs:[1]}))}))})}}]}));
 });
 const smallerClaims=longClaims.map(c=>({...c,text:c.text.slice(0,1000)}));
 const checked=await createSermonSentenceReviewer({apiKey:"test",fetchImpl:fetchMock})!.review(input,smallerClaims) as {reviews:unknown[]};
 expect(checked.reviews).toHaveLength(5);expect(fetchMock).toHaveBeenCalledTimes(5);
});
it("does not accept earlier batches if a later batch is incomplete",async()=>{
 const separate=Array.from({length:2},(_,i)=>({...claims[0],id:`section-${i+1}`,text:"نماز خشوع رکھنے والوں پر بھاری نہیں ہوتی۔ ".repeat(50)}));let calls=0;
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,init?:RequestInit)=>{
  const request=JSON.parse(JSON.parse(init!.body as string).messages[1].content);
  const reviews=calls++===0?request.sections.map((s:{claimId:string;sentences:{index:number}[]})=>({claimId:s.claimId,sentences:s.sentences.map(x=>({i:x.index,v:"s",r:"e",refs:[1]}))})):[];
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reviews})}}]}));
 });
 await expect(createSermonSentenceReviewer({apiKey:"test",fetchImpl:fetchMock})!.review(input,separate)).rejects.toThrow("provider-format");expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("independently audits sentences on Cloudflare Qwen when existing credentials are available",async()=>{
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({result:{choices:[{message:{content:JSON.stringify(compactReview()),reasoning:"private internal reasoning"}}]}})));
 const provider=createSermonSentenceReviewer({apiKey:"groq-key",cloudflareAccountId:"account",cloudflareToken:"cloudflare-key",fetchImpl:fetchMock})!;
 expect(await provider.review(input,claims)).toMatchObject({reviews:[{claimId:"section-1",verdict:"unsupported",reason:"contradiction"}]});
 expect(fetchMock.mock.calls[0][0]).toBe("https://api.cloudflare.com/client/v4/accounts/account/ai/v1/chat/completions");const request=fetchMock.mock.calls[0][1]!;expect((request.headers as Record<string,string>).Authorization).toBe("Bearer cloudflare-key");const body=JSON.parse(request.body as string);expect(body.model).toBe("@cf/qwen/qwen3.8-27b");expect(body.chat_template_kwargs.enable_thinking).toBe(false);expect(body.max_completion_tokens).toBe(3000);expect(body.reasoning_format).toBeUndefined();expect(createSermonSentenceReviewer({cloudflareAccountId:"account",cloudflareToken:"key"})).not.toBeNull();
});

it("accepts fenced complete JSON without relaxing sentence coverage",async()=>{
 const fetchMock=vi.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:"stop",message:{content:"```json\n"+JSON.stringify(compactReview())+"\n```"}}]})));
 expect(await createSermonSentenceReviewer({cloudflareAccountId:"account",cloudflareToken:"key",fetchImpl:fetchMock})!.review(input,claims)).toMatchObject({reviews:[{claimId:"section-1",verdict:"unsupported",reason:"contradiction"}]});
});

it("overlaps at most two independent Cloudflare batches and rejects any incomplete result",async()=>{
 const longClaims=Array.from({length:5},(_,i)=>({...claims[0],id:`section-${i+1}`,text:"نماز خشوع رکھنے والوں پر بھاری نہیں ہوتی۔ ".repeat(25)}));let active=0,maximum=0;
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,init?:RequestInit)=>{
  active++;maximum=Math.max(maximum,active);await new Promise(resolve=>setTimeout(resolve,1));active--;const request=JSON.parse(JSON.parse(init!.body as string).messages[1].content);
  return new Response(JSON.stringify({choices:[{finish_reason:"stop",message:{content:JSON.stringify({reviews:request.sections.map((s:{claimId:string;sentences:{index:number}[]})=>({claimId:s.claimId,sentences:s.sentences.map(x=>({i:x.index,v:"s",r:"e",refs:[1]}))}))})}}]}));
 });
 const provider=createSermonSentenceReviewer({cloudflareAccountId:"account",cloudflareToken:"key",fetchImpl:fetchMock})!;const checked=await provider.review(input,longClaims) as {reviews:unknown[]};expect(checked.reviews).toHaveLength(5);expect(maximum).toBe(2);expect(fetchMock).toHaveBeenCalledTimes(5);
 const missing=vi.fn(async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reviews:[]})}}]})));await expect(createSermonSentenceReviewer({cloudflareAccountId:"account",cloudflareToken:"key",fetchImpl:missing})!.review(input,longClaims)).rejects.toThrow("provider-format");expect(missing).toHaveBeenCalledTimes(2);
});

it("provides repair feedback only from a complete validated audit and server-owned sentence text",async()=>{
 const fetchMock=vi.fn(async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(compactReview())}}]})));const audited=await createSermonSentenceReviewer({apiKey:"test",fetchImpl:fetchMock})!.review(input,claims);
 expect(sermonRejectedSentences(audited,input,claims)).toEqual([{claimId:"section-1",index:2,reason:"contradiction",text:"نماز خشوع رکھنے والوں کے سوا کسی پر بھاری نہیں ہوتی۔"}]);
 const missing={reviews:(audited as {reviews:unknown}).reviews,sentenceAudit:review().reviews.map(r=>({...r,sentences:[]}))};expect(sermonRejectedSentences(missing,input,claims)).toBeNull();
 expect(sermonRejectedSentences({...audited as object,reviews:[{claimId:"section-1",verdict:"supported",reason:"entailed"}]},input,claims)).toBeNull();
});

it("uses the explicitly selected reviewer and does not silently use another credential",async()=>{
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(compactReview())}}]})));await createSermonSentenceReviewer({apiKey:"groq-key",cloudflareAccountId:"account",cloudflareToken:"cf-key",preferredProvider:"groq",fetchImpl:fetchMock})!.review(input,claims);expect(fetchMock.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/chat/completions");expect(createSermonSentenceReviewer({cloudflareAccountId:"account",cloudflareToken:"cf-key",preferredProvider:"groq"})).toBeNull();expect(createSermonSentenceReviewer({apiKey:"groq-key",preferredProvider:"cloudflare"})).toBeNull();
});

it("audits all sentences on Gemini without falling back to a different configured service",async()=>{
 const raw={reviews:[{claimId:"section-1",sentences:[{i:1,v:"n",r:"n",refs:[]},{i:2,v:"u",r:"c",refs:[1]}]}]};
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({status:"completed",steps:[{type:"model_output",content:[{type:"text",text:JSON.stringify(raw)}]}]})));
 const provider=createSermonSentenceReviewer({geminiKey:"gemini-test",apiKey:"groq-test",cloudflareAccountId:"account",cloudflareToken:"cf-test",fetchImpl:fetchMock})!;
 const result=await provider.review(input,claims);expect(result).toMatchObject({reviews:[{claimId:"section-1",verdict:"unsupported",reason:"contradiction"}]});
 expect(fetchMock.mock.calls[0][0]).toBe("https://generativelanguage.googleapis.com/v1beta/interactions");const body=JSON.parse(fetchMock.mock.calls[0][1]!.body as string);expect(body.model).toBe("gemini-3.8-flash");expect(body.generation_config.max_output_tokens).toBeGreaterThanOrEqual(4500);expect(body.max_completion_tokens).toBeUndefined();expect(body.reasoning_format).toBeUndefined();
 expect(createSermonSentenceReviewer({preferredProvider:"gemini",apiKey:"groq-test"})).toBeNull();
});

it("keeps provider audits in bounded JSON batches while preserving every sentence",async()=>{
 const compactClaims=Array.from({length:3},(_,i)=>({...claims[0],id:`compact-${i+1}`,text:"نماز سے مدد لینے کی ہدایت ہے۔ ".repeat(4)}));
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,init?:RequestInit)=>{
  const request=JSON.parse(JSON.parse(init!.body as string).messages[1].content);
  expect(request.sections.reduce((n:number,section:{sentences:unknown[]})=>n+section.sentences.length,0)).toBeLessThanOrEqual(8);
  expect(JSON.parse(init!.body as string).max_completion_tokens).toBeLessThanOrEqual(900);
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reviews:request.sections.map((section:{claimId:string;sentences:{index:number}[]})=>({claimId:section.claimId,sentences:section.sentences.map(sentence=>({i:sentence.index,v:"s",r:"e",refs:[1]}))}))})}}]}));
 });
 const checked=await createSermonSentenceReviewer({apiKey:"test",fetchImpl:fetchMock})!.review(input,compactClaims) as {reviews:unknown[]};
 expect(checked.reviews).toHaveLength(3);expect(fetchMock).toHaveBeenCalledTimes(2);
});
