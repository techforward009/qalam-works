/**
 * POST /api/document-studio/transcribe
 *
 * Accepts a multipart upload with an audio blob and an optional language hint.
 * Forwards the audio to OpenAI's transcription API and returns { text }.
 *
 * Security:
 *   - OPENAI_API_KEY never leaves the server.
 *   - Raw audio is not logged or stored.
 *   - File type and size are validated before any external call.
 *   - No transcript content is included in server logs.
 *
 * Environment variables:
 *   OPENAI_API_KEY            — required; transcription service credential
 *   OPENAI_TRANSCRIBE_MODEL   — optional; defaults to gpt-4o-transcribe
 */

export const runtime    = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

// OpenAI hard limit for audio transcription uploads.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB

// Language codes accepted as hints. "mixed" → no hint sent (model auto-detects).
const VALID_LANG_HINTS = new Set(["ur", "en"]);

function err(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Configuration guard ───────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[transcribe] OPENAI_API_KEY not configured");
    return err("Transcription service not configured.", 503);
  }

  const model = process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe";

  // ── Parse multipart upload ────────────────────────────────────────────────
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return err("Multipart audio upload required.", 400);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return err("Could not parse multipart form data.", 400);
  }

  const audioEntry = formData.get("audio");
  if (!(audioEntry instanceof File)) {
    return err("No audio file in request.", 400);
  }

  // ── Validate audio file ───────────────────────────────────────────────────
  if (!audioEntry.type.startsWith("audio/")) {
    return err("Uploaded file must be audio.", 400);
  }

  if (audioEntry.size === 0) {
    return err("Empty audio recording.", 400);
  }

  if (audioEntry.size > MAX_AUDIO_BYTES) {
    return err("Recording exceeds maximum allowed size.", 413);
  }

  // ── Language hint ─────────────────────────────────────────────────────────
  // "ur" or "en" → forward to API for better accuracy.
  // "mixed" or absent → do not set language (model auto-detects per segment).
  const langHint = formData.get("language");
  const language =
    typeof langHint === "string" && VALID_LANG_HINTS.has(langHint)
      ? langHint
      : null;

  // ── Forward to OpenAI ─────────────────────────────────────────────────────
  const upstream = new FormData();
  upstream.append("file", audioEntry, audioEntry.name || "recording.webm");
  upstream.append("model", model);
  if (language) {
    upstream.append("language", language);
  }
  // response_format defaults to json which gives { text }

  let transcription: string;
  try {
    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });

    if (!resp.ok) {
      // Log status only — never log body (may echo the audio or key metadata)
      console.error("[transcribe] OpenAI API error:", resp.status);
      return err("Transcription service returned an error.", 502);
    }

    const json = await resp.json();
    transcription = typeof json.text === "string" ? json.text : "";
  } catch (e) {
    console.error("[transcribe] Fetch failed:", (e as Error).message);
    return err("Failed to reach transcription service.", 502);
  }

  // Return minimal response — no provider metadata, no audio reference.
  return NextResponse.json({ text: transcription });
}
