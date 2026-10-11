import {expect,it,vi} from "vitest";
import {createOpenRouterTrialSession,estimateOpenRouterTrialCeiling,OPENROUTER_TRIAL_MODELS,verifyOpenRouterTrialKeyCap} from "../app/lib/knowledge/openRouterTrial";

const request=(max_completion_tokens=120)=>({
  method:"POST",headers:{Authorization:"Bearer old-provider-secret","Content-Type":"application/json"},
  body:JSON.stringify({
    model:"ignore-upstream-model",messages:[{role:"system",content:"صرف ماخذ سے لکھیں"},{role:"user",content:"صبر"}],
    max_completion_tokens,temperature:0.3,response_format:{type:"json_object"}
  })
} as RequestInit);
it("routes three known models in priority order and hides old credentials and source provider",async()=>{
  const fetchImpl=vi.fn(async()=>new Response(JSON.stringify({choices:[{message:{content:'{"sections":[]}'}}],usage:{cost:0.0002}}),{status:200}));
  const session=createOpenRouterTrialSession({apiKey:"openrouter-secret",fetchImpl,maxTrialUsd:0.1});
  const response=await session.fetchFor(["qwen","deepseek","lite"])("https://api.groq.com/openai/v1/chat/completions",request());
  expect(response.status).toBe(200);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  const [url,init]=fetchImpl.mock.calls[0] as unknown as [string,RequestInit];
  expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
  const body=JSON.parse(init.body as string);
  expect(body.models).toEqual([
    "qwen/qwen3.5-flash-02-23","deepseek/deepseek-v3.2","google/gemini-3.1-flash-lite"
  ]);
  expect(body.model).toBeUndefined();
  expect(body.response_format.type).toBe("json_object");
  expect(body.temperature).toBe(0.3);
  expect(JSON.stringify(body)).not.toContain("old-provider-secret");
  expect(JSON.stringify(body)).not.toContain("ignore-upstream-model");
  expect(init.headers).toMatchObject({Authorization:"Bearer openrouter-secret"});
  expect(session.status().calls).toBe(1);
  expect(session.status().observedUsd).toBe(0.0002);
  expect(JSON.stringify(session.status())).not.toContain("secret");
});
it("does not send any request when conservative maximum exceeds budget",async()=>{
  const fetchImpl=vi.fn(async()=>new Response("{}",{status:200}));
  const session=createOpenRouterTrialSession({apiKey:"example",maxTrialUsd:0.00001,fetchImpl});
  await expect(session.fetchFor(["lite"])("ignored",request(5000))).rejects.toThrow("openrouter-trial-budget-exceeded");
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(session.status().calls).toBe(0);
});
it("enforces request cap even when a remote provider fails",async()=>{
  const fetchImpl=vi.fn(async()=>new Response("rate limited",{status:429}));
  const session=createOpenRouterTrialSession({apiKey:"example",maxRequests:1,fetchImpl});
  const first=await session.fetchFor(["qwen"])("ignored",request());
  expect(first.status).toBe(429);
  await expect(session.fetchFor(["qwen"])("ignored",request())).rejects.toThrow("openrouter-request-cap");
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
it("keeps strict schema and compatible routing preferences for independent audit",async()=>{
  const fetchImpl=vi.fn(async()=>new Response(JSON.stringify({choices:[{message:{content:"{}"}}]}),{status:200}));
  const session=createOpenRouterTrialSession({apiKey:"example",fetchImpl});
  const init=request();
  init.body=JSON.stringify({...JSON.parse(init.body as string),response_format:{
    type:"json_schema",json_schema:{name:"review",strict:true,schema:{type:"object",additionalProperties:false,properties:{reviews:{type:"array"}},required:["reviews"]}}
  }});
  await session.fetchFor(["lite"])("ignored",init);
  const body=JSON.parse((fetchImpl.mock.calls[0] as unknown as [string,RequestInit])[1].body as string);
  expect(body.model).toBe("google/gemini-3.1-flash-lite");
  expect(body.provider).toEqual({require_parameters:true});
  expect(body.response_format.json_schema.strict).toBe(true);
});
it("rejects arbitrary models, bad outputs, and large contexts",async()=>{
  const session=createOpenRouterTrialSession({apiKey:"example",fetchImpl:vi.fn()});
  expect(()=>session.fetchFor(["unknown" as "qwen"])).toThrow("invalid-openrouter-model");
  await expect(session.fetchFor(["qwen"])("ignored",request(5001))).rejects.toThrow("invalid-openrouter-output-limit");
  const huge=request();huge.body=JSON.stringify({messages:[{role:"user",content:"ا".repeat(60_000)}],max_completion_tokens:100});
  await expect(session.fetchFor(["qwen"])("ignored",huge)).rejects.toThrow("openrouter-context-cap");
});
it("uses the maximum fallback price in conservative reservations",()=>{
  const reserve=estimateOpenRouterTrialCeiling(["qwen","lite"],2000,1000);
  expect(reserve).toBeCloseTo((2000*0.25+1000*1.5)/1_000_000,8);
  expect(OPENROUTER_TRIAL_MODELS.qwen.id).toBe("qwen/qwen3.5-flash-02-23");
});

it("requires a real server-side API key spending cap before any paid experiment",async()=>{
 const allowed=vi.fn(async()=>new Response(JSON.stringify({data:{limit:1,limit_remaining:0.88}}),{status:200}));
 await expect(verifyOpenRouterTrialKeyCap({apiKey:"local-key",fetchImpl:allowed})).resolves.toEqual({hardLimitUsd:1,remainingUsd:0.88});
 expect((allowed.mock.calls[0] as unknown as [string])[0]).toBe("https://openrouter.ai/api/v1/key");
 const bad=vi.fn(async()=>new Response(JSON.stringify({data:{limit:null,limit_remaining:null}}),{status:200}));
 await expect(verifyOpenRouterTrialKeyCap({apiKey:"key",fetchImpl:bad})).rejects.toThrow("openrouter-key-hard-limit-required");
 const larger=vi.fn(async()=>new Response(JSON.stringify({data:{limit:20,limit_remaining:17}}),{status:200}));
 await expect(verifyOpenRouterTrialKeyCap({apiKey:"key",maxKeyUsd:1,fetchImpl:larger})).rejects.toThrow("openrouter-key-hard-limit-required");
 const failure=vi.fn(async()=>new Response("Unauthorized",{status:401}));
 await expect(verifyOpenRouterTrialKeyCap({apiKey:"invalid",fetchImpl:failure})).rejects.toThrow("openrouter-key-cap-unavailable");
});
