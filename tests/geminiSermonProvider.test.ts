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
