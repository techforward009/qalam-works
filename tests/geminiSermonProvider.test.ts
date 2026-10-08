import { describe, expect, it, vi } from 'vitest';
import { geminiSermonFetch } from '../app/lib/knowledge/geminiSermonProvider';
const init={headers:{Authorization:'Bearer test-key'},body:JSON.stringify({model:'gemini-3.8-flash',max_tokens:4500,temperature:0.2,messages:[{role:'system',content:'rules'},{role:'user',content:'evidence'}],response_format:{json_schema:{schema:{type:'object'}}}})};
describe('native Gemini response boundary',()=>{
 it('separates instructions, disables storage and ignores thought output',async()=>{
  const fetchMock=vi.fn(async()=>Response.json({status:'completed',steps:[{type:'thought',content:[{type:'text',text:'private thinking'}]},{type:'model_output',content:[{type:'thought',text:'ignored'},{type:'text',text:'{"sections":[]}'}]}]}));
  const response=await geminiSermonFetch(fetchMock)('ignored',init);
  expect((await response.json()).choices[0].message.content).toBe('{"sections":[]}');
  const call=fetchMock.mock.calls[0] as unknown as [string,RequestInit];
  expect(call[0]).not.toContain('test-key');expect(call[1].headers).toEqual({'Content-Type':'application/json','x-goog-api-key':'test-key'});
  expect(JSON.parse(call[1].body as string).generation_config).toEqual({max_output_tokens:4500,thinking_level:'low',thinking_summaries:'none'});
  expect(JSON.parse(call[1].body as string)).toMatchObject({store:false,system_instruction:'rules',input:'evidence',generation_config:{thinking_level:'low',max_output_tokens:4500},response_format:{mime_type:'application/json'}});
 });
 it.each(['incomplete','failed','in_progress','requires_action'])('rejects %s even with valid JSON',async status=>{
  await expect(geminiSermonFetch(async()=>Response.json({status,steps:[{type:'model_output',content:[{type:'text',text:'{}'}]}]}))('ignored',init)).rejects.toThrow('unavailable');
 });
 it('passes service errors to the existing retry handler',async()=>{
  const error=new Response('service unavailable',{status:503});expect(await geminiSermonFetch(async()=>error)('ignored',init)).toBe(error);
 });
 it('rejects oversized responses',async()=>{
  await expect(geminiSermonFetch(async()=>new Response(' '.repeat(160001)))('ignored',init)).rejects.toThrow('unavailable');
 });
 it('does not publish thought-only output',async()=>{
  await expect(geminiSermonFetch(async()=>Response.json({status:'completed',steps:[{type:'thought',content:[{type:'text',text:'{}'}]}]}))('ignored',init)).rejects.toThrow('unavailable');
 });
});

it('tries the alternate Gemini model only on 503 within the existing call limit',async()=>{
 const {fetchSermonProvider}=await import('../app/lib/knowledge/sermonProviderFetch');
 const models:string[]=[];
 const fetchMock=vi.fn(async(_url:RequestInfo|URL,request?:RequestInit)=>{
  models.push(JSON.parse(request!.body as string).model);
  return models.length===1?new Response('unavailable',{status:503}):Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'{}'}]}]});
 });
 const result=await fetchSermonProvider('ignored',init,geminiSermonFetch(fetchMock),async()=>{});
 expect(result.ok).toBe(true);expect(models).toEqual(['gemini-3.8-flash','gemini-3.7-flash']);
});
it.each([400,401,403,404,429])('does not switch models after HTTP %s',async status=>{
 const models:string[]=[];const adapter=geminiSermonFetch(async(_url,request)=>{models.push(JSON.parse(request!.body as string).model);return new Response('rejected',{status});});
 await adapter('ignored',init);await adapter('ignored',init);expect(models).toEqual(['gemini-3.8-flash','gemini-3.8-flash']);
});
it('does not exceed three provider requests when both models are unavailable',async()=>{
 const {fetchSermonProvider}=await import('../app/lib/knowledge/sermonProviderFetch');const models:string[]=[];
 const adapter=geminiSermonFetch(async(_url,request)=>{models.push(JSON.parse(request!.body as string).model);return new Response('unavailable',{status:503});});
 expect((await fetchSermonProvider('ignored',init,adapter,async()=>{})).status).toBe(503);
 expect(models).toEqual(['gemini-3.8-flash','gemini-3.7-flash','gemini-3.7-flash']);
});

it('reaches the alternate model after an attempt times out before the overall deadline',async()=>{
 const {fetchSermonProvider}=await import('../app/lib/knowledge/sermonProviderFetch');const models:string[]=[];
 const adapter=geminiSermonFetch(async(_url,request)=>{
  models.push(JSON.parse(request!.body as string).model);
  if(models.length===1)return await new Promise<Response>((_resolve,reject)=>request!.signal!.addEventListener('abort',()=>reject(request!.signal!.reason),{once:true}));
  return Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'{}'}]}]});
 },10);
 const result=await fetchSermonProvider('ignored',{...init,signal:AbortSignal.timeout(1000)},adapter,async()=>{});
 expect(result.ok).toBe(true);expect(models).toEqual(['gemini-3.8-flash','gemini-3.7-flash']);
});
it('preserves overall cancellation instead of starting the alternate model',async()=>{
 const {fetchSermonProvider}=await import('../app/lib/knowledge/sermonProviderFetch');const controller=new AbortController();let calls=0;
 const adapter=geminiSermonFetch(async()=>{calls++;controller.abort(new Error('cancelled'));throw controller.signal.reason;},1000);
 await expect(fetchSermonProvider('ignored',{...init,signal:controller.signal},adapter,async()=>{})).rejects.toThrow('cancelled');expect(calls).toBe(1);
});
it('does not retry malformed completed output on another model',async()=>{
 const {fetchSermonProvider}=await import('../app/lib/knowledge/sermonProviderFetch');let calls=0;
 const adapter=geminiSermonFetch(async()=>{calls++;return Response.json({status:'completed',steps:[]});});
 await expect(fetchSermonProvider('ignored',init,adapter,async()=>{})).rejects.toThrow('unavailable');expect(calls).toBe(1);
});
