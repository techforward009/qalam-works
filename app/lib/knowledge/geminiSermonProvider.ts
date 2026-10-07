/** Native Gemini Interactions transport; existing sermon validation stays mandatory. */
export function geminiSermonFetch(fetchImpl: typeof fetch, attemptTimeoutMs?: number): typeof fetch {
  let alternateModel: string | undefined;
  return async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    const headers = new Headers(init?.headers);
    const key = headers.get("Authorization")?.replace(/^Bearer /, "");
    if (!key) throw new Error("not-configured");
    const messages = request.messages as { role: string; content: string }[];
    if (!Array.isArray(messages) || messages.some(message => !["system", "user"].includes(message.role) || typeof message.content !== "string")) throw new Error("unavailable");
    const attemptSignal = AbortSignal.timeout(attemptTimeoutMs ?? (request.response_format?.json_schema?.name === "sermon_composition" ? 60_000 : 30_000));
    const signal = init?.signal ? AbortSignal.any([init.signal, attemptSignal]) : attemptSignal;
    const switchModel = (reason: "timeout" | "service-unavailable") => {
      if (!alternateModel && request.model === "gemini-3.8-flash") {
        alternateModel = "gemini-3.7-flash";
        console.warn("Sermon Gemini model fallback", { from: request.model, to: alternateModel, reason });
      }
    };
    try {
    const response = await fetchImpl("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        model: alternateModel ?? request.model, store: false,
        system_instruction: messages.filter(message => message.role === "system").map(message => message.content).join("\n"),
        input: messages.filter(message => message.role === "user").map(message => message.content).join("\n"),
        generation_config: { temperature: request.temperature, max_output_tokens: request.max_tokens, thinking_level: "low", thinking_summaries: "none" },
        response_format: { type: "text", mime_type: "application/json", schema: request.response_format.json_schema.schema },
      }),
    });
    if (!response.ok) {
      // The outer retry handler retains its three-call limit and shared deadline.
      if (response.status === 503) switchModel("service-unavailable");
      return response;
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("unavailable");
    const chunks: Uint8Array[] = []; let bytes = 0;
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 160_000) { await reader.cancel(); throw new Error("unavailable"); }
        chunks.push(chunk.value);
      }
    } finally { reader.releaseLock(); }
    const buffer = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    const result = JSON.parse(new TextDecoder().decode(buffer));
    if (result.status !== "completed" || !Array.isArray(result.steps)) throw new Error("unavailable");
    const content = result.steps.filter((step: {type?:string}) => step.type === "model_output")
      .flatMap((step: {content?:unknown[]}) => Array.isArray(step.content) ? step.content : [])
      .filter((part: {type?:string;text?:unknown}) => part?.type === "text" && typeof part.text === "string")
      .map((part: {text:string}) => part.text).join("");
    if (!content.trim()) throw new Error("unavailable");
    return Response.json({ choices: [{ finish_reason: "stop", message: { content } }], usage: { completion_tokens: result.usage?.total_output_tokens } });
    } catch (error) {
      if (attemptSignal.aborted && !init?.signal?.aborted) {
        switchModel("timeout");
        return new Response(null, { status: 503 });
      }
      throw error;
    }
  };
}
