"use client";

import { useState } from "react";
import JSZip from "jszip";
import { buildDocxBlob } from "../utils/buildDocxDocument";
import { parseDocumentSettings } from "../utils/documentSettings";
import {
  directionForNode,
  normalizeEditorFontFamily,
  resolveEditorFontFamily,
} from "../utils/fontRegistry";
import type { DocNode, Direction } from "../utils/extractPlainText";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
type Check = { label: string; ok: boolean; detail: string };
type Audit = { sha256: string; source: string; blocks: number; checks: Check[]; blob: Blob };
type QalamFile = { format: string; schemaVersion: number; content: DocNode; documentSettings: unknown };

function isQalamFile(v: unknown): v is QalamFile {
  if (!v || typeof v !== "object") return false;
  const x = v as Partial<QalamFile>;
  return x.format === "qalam-document" && x.schemaVersion === 1
    && x.content?.type === "doc" && Array.isArray(x.content.content)
    && Boolean(x.documentSettings && typeof x.documentSettings === "object");
}
function sourceText(node: DocNode): string {
  return (node.content ?? []).map(child => child.type === "text" ? child.text ?? "" : "").join("");
}
function countHardBreaks(node: DocNode): number {
  return (node.content ?? []).filter(child => child.type === "hardBreak").length;
}
function qName(element: Element | null, name: string): string | null {
  return element?.getAttributeNS(WORD_NS, name) ?? null;
}
function firstChild(element: Element, name: string): Element | null {
  return [...element.children].find(c => c.namespaceURI === WORD_NS && c.localName === name) ?? null;
}
function wordElements(element: Element, name: string): Element[] {
  return Array.from(element.getElementsByTagNameNS(WORD_NS, name));
}
function explicitFonts(node: DocNode): string[] {
  const used = new Set<string>();
  for (const child of node.content ?? []) {
    if (child.type !== "text" || !child.text) continue;
    const style = child.marks?.find(m => m.type === "textStyle");
    const raw = style?.attrs?.fontFamily;
    if (typeof raw !== "string" || !raw.trim()) continue;
    const canonical = normalizeEditorFontFamily(raw);
    used.add(canonical || raw.trim());
  }
  return [...used];
}
function special(node: DocNode, prefix: string): boolean {
  return sourceText(node).trimStart().startsWith(prefix);
}

async function createAudit(source: string, fileName: string, dir: Direction): Promise<Audit> {
  const parsed: unknown = JSON.parse(source);
  if (!isQalamFile(parsed)) throw new Error("This is not a supported version 1 .qalam document.");
  const settings = parseDocumentSettings(parsed.documentSettings);
  // This page never saves source or uploads it. It invokes the same DOCX
  // exporter as Document Studio with the original document JSON and settings.
  const blob = await buildDocxBlob(parsed.content, dir, settings);
  const archive = await JSZip.loadAsync(await blob.arrayBuffer());
  const xmlText = await archive.file("word/document.xml")?.async("text");
  if (!xmlText) throw new Error("Exporter did not produce word/document.xml.");
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  if (xml.getElementsByTagName("parsererror").length) throw new Error("Invalid exported OOXML.");
  const body = wordElements(xml.documentElement, "body")[0];
  if (!body) throw new Error("Exported DOCX has no Word body.");
  const actual = Array.from(body.children).filter(child => child.localName === "p" && child.namespaceURI === WORD_NS);
  const expected = (parsed.content.content ?? []).filter(n => n.type === "paragraph" || n.type === "heading" || n.type === "pageBreak");
  const checks: Check[] = [];
  const record = (label: string, ok: boolean, detail: string) => checks.push({ label, ok, detail });
  record("Paragraph/page-break count", actual.length === expected.length,
    "Source: " + expected.length + "; exported: " + actual.length);
  let sourceBreaks = 0;
  let exportedBreaks = 0;
  let sourcePageBreaks = 0;
  let exportedPageBreaks = 0;
  let unexpectedNoto = 0;
  let missingNamedFaces = 0;
  let lostText = 0;
  let lostAlignment = 0;
  let forcedPagination = 0;
  let changedSizes = 0;

  for (let i = 0; i < Math.min(expected.length, actual.length); i++) {
    const src = expected[i];
    const out = actual[i];
    const spans = wordElements(out, "t").map(el => el.textContent ?? "").join("");
    const runs = wordElements(out, "r");
    const faces = new Set(runs.flatMap(run => wordElements(run, "rFonts")
      .map(el => qName(el, "cs")).filter((v): v is string => Boolean(v))));
    const prop = firstChild(out, "pPr");
    const alignment = prop ? qName(firstChild(prop, "jc"), "val") : null;
    const bidi = prop ? Boolean(firstChild(prop, "bidi")) : false;
    const breaks = wordElements(out, "br");
    if (src.type === "pageBreak") {
      sourcePageBreaks++;
      exportedPageBreaks += breaks.filter(b => qName(b, "type") === "page").length;
      continue;
    }
    if (spans !== sourceText(src)) lostText++;
    const hard = countHardBreaks(src);
    sourceBreaks += hard;
    exportedBreaks += breaks.filter(b => qName(b, "type") !== "page").length;
    const authoredAlign = src.attrs?.textAlign;
    const nodeDir = directionForNode(src, dir);
    const intended = typeof authoredAlign === "string" && authoredAlign !== "justify"
      ? authoredAlign
      : authoredAlign === "justify"
        ? null
        : nodeDir === "rtl" ? "right" : "left";
    if (intended && alignment !== intended) lostAlignment++;
    if (nodeDir === "rtl" && !bidi) lostAlignment++;
    if (prop && ["pageBreakBefore", "keepNext", "keepLines"].some(name => firstChild(prop, name))) forcedPagination++;
    const explicitlySelected = explicitFonts(src);
    for (const family of explicitlySelected) {
      if (!faces.has(family)) missingNamedFaces++;
      if (family !== "Noto Nastaliq Urdu" && faces.has("Noto Nastaliq Urdu")) unexpectedNoto++;
    }
    for (const child of src.content ?? []) {
      if (child.type !== "text" || !child.text) continue;
      const attrs = child.marks?.find(m => m.type === "textStyle")?.attrs;
      const size = typeof attrs?.fontSize === "string" ? parseFloat(attrs.fontSize) : NaN;
      if (!Number.isFinite(size) || size <= 0) continue;
      const family = typeof attrs?.fontFamily === "string"
        ? resolveEditorFontFamily(attrs.fontFamily, nodeDir).docxFamily : null;
      if (!family) continue;
      const halfPoints = String(Math.round(size * 2));
      const matches = runs.filter(run => wordElements(run, "rFonts").some(f => qName(f, "cs") === family));
      if (matches.length && !matches.some(run => wordElements(run, "szCs")
        .some(sz => qName(sz, "val") === halfPoints))) changedSizes++;
    }
    if (special(src, "(ب) تمام افعال") || special(src, "(ج) الامر بین الامرین")
      || special(src, "۴۔ فسخ العزیمہ") || special(src, "السلام علیک یا")) {
      record("Reported paragraph " + (i + 1), spans === sourceText(src)
        && (!intended || alignment === intended) && bidi
        && !(prop && ["pageBreakBefore", "keepNext", "keepLines"].some(name => firstChild(prop, name))),
        "RTL=" + bidi + ", alignment=" + (alignment ?? "(default)") +
        ", page-break/keep flags=" + (prop && ["pageBreakBefore", "keepNext", "keepLines"].some(name => firstChild(prop, name)) ? "present" : "none"));
    }
  }

  record("Exact source Unicode, text and spaces", lostText === 0 && expected.length === actual.length,
    "Different text paragraphs: " + lostText);
  record("Original explicit fonts", missingNamedFaces === 0, "Missing selected faces in Word runs: " + missingNamedFaces);
  record("No silent Noto replacement for named runs", unexpectedNoto === 0, "Offending paragraphs: " + unexpectedNoto);
  record("Explicit complex-script sizes", changedSizes === 0, "Runs with changed size: " + changedSizes);
  record("Authored hard breaks", sourceBreaks === exportedBreaks,
    "Source: " + sourceBreaks + "; exported: " + exportedBreaks);
  record("Authored page breaks", sourcePageBreaks === exportedPageBreaks,
    "Source: " + sourcePageBreaks + "; exported: " + exportedPageBreaks);
  record("RTL and right/center/left alignment", lostAlignment === 0, "Alignment/direction discrepancies: " + lostAlignment);
  record("No unrequested keep/page-break flags", forcedPagination === 0, "Paragraphs with flags: " + forcedPagination);

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  const sha256 = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
  return { sha256, source: fileName, blocks: expected.length, checks, blob };
}

export default function DocxAcceptancePage() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [direction, setDirection] = useState<Direction>("rtl");
  const [audit, setAudit] = useState<Audit | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!sourceFile) return;
    setBusy(true);
    setError("");
    setAudit(null);
    try { setAudit(await createAudit(await sourceFile.text(), sourceFile.name, direction)); }
    catch (e) { setError(e instanceof Error ? e.message : "Verification failed."); }
    finally { setBusy(false); }
  }
  function save(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  function download() {
    if (!audit) return;
    save(audit.blob, "qalam-pr49-same-snapshot.docx");
  }
  function report() {
    if (!audit) return;
    const { blob: _ignore, ...other } = audit;
    void _ignore;
    save(new Blob([JSON.stringify({
      source: other.source, sourceSha256: other.sha256,
      branch: "fix/document-studio-docx-fidelity-20261013",
      purpose: "structural-only; requires Microsoft Word visual acceptance",
      direction, checks: other.checks,
    }, null, 2)], { type: "application/json" }), "qalam-pr49-docx-audit.json");
  }
  return <main className="mx-auto max-w-3xl p-6 space-y-5" dir="ltr">
    <h1 className="text-2xl font-semibold">PR #49 — DOCX Same-Snapshot Acceptance</h1>
    <p>This is an isolated diagnostic page on a draft branch. It reads your .qalam file entirely in this browser, invokes PR #49&apos;s actual Document Studio DOCX exporter, and compares Word XML with the identical input snapshot. It does not upload or overwrite your document.</p>
    <p className="font-semibold">Structural checks are not Microsoft Word visual verification. Microsoft Word with your actual fonts remains the final gate.</p>
    <div className="rounded-lg border p-4 space-y-3">
      <label className="block">Select original saved .qalam file
        <input type="file" accept=".qalam,application/json" onChange={e => {
          setSourceFile(e.target.files?.[0] ?? null); setAudit(null); setError("");
        }} className="block mt-2" />
      </label>
      <label className="block">Document direction
        <select value={direction} onChange={e => { setDirection(e.target.value as Direction); setAudit(null); }}
          className="block mt-2 border rounded p-2 text-black">
          <option value="rtl">RTL (Urdu / Arabic)</option>
          <option value="ltr">LTR</option>
        </select>
      </label>
      <button type="button" disabled={!sourceFile || busy} onClick={() => { void run(); }}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-40">
        {busy ? "Generating and auditing…" : "Generate DOCX and compare exact snapshot"}
      </button>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {audit && <section className="space-y-3">
      <h2 className="text-xl font-semibold">DOCX structural audit</h2>
      <p>Input: {audit.source} · {audit.blocks} top-level blocks</p>
      <p className="text-xs break-all">Source SHA-256: {audit.sha256}</p>
      <p>{audit.checks.filter(c => c.ok).length} of {audit.checks.length} checks passed</p>
      <ul className="list-disc pl-5 space-y-2">
        {audit.checks.map((c, i) => <li key={i}>
          <strong>{c.ok ? "PASS" : "FAIL"} — {c.label}</strong>
          <span className="block text-sm">{c.detail}</span>
        </li>)}
      </ul>
      <div className="flex gap-3 flex-wrap">
        <button type="button" onClick={download} className="rounded bg-slate-900 px-4 py-2 text-white">Download generated DOCX</button>
        <button type="button" onClick={report} className="rounded border px-4 py-2">Download structural audit JSON</button>
      </div>
      <p>The audit inspects XML and preserved source content, not installed font availability or page geometry. Open the generated DOCX in Microsoft Word with all selected fonts installed and compare the visible result against the saved source.</p>
    </section>}
  </main>;
}
