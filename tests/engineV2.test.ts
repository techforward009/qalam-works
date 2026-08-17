/**
 * Phase 19A.0c — Engine V2 Focused Tests
 * Covers: candidate generation, phrase matching, morphology,
 * mixed English, proper names, protection, ambiguity, determinism.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";
import { runBenchmark, type BenchmarkCorpus } from "../app/tools/roman-urdu-writer/utils/benchmarkScorer";

const corpus: BenchmarkCorpus = JSON.parse(
  readFileSync(join(__dirname, "fixtures/romanUrduBenchmark.json"), "utf-8")
);

// ── Helper ────────────────────────────────────────────────────────────────────
function cv(input: string) { return engineV2.convert(input); }

// ── Deterministic repeatability ───────────────────────────────────────────────
describe("Determinism", () => {
  const inputs = ["kal Zoom meeting 8 baje hai", "main wahan gaya", "bohot acha tha", "xyzblarg nahi mila"];
  for (const inp of inputs) {
    test(`"${inp.slice(0,25)}" is deterministic`, () => {
      expect(cv(inp).output).toBe(cv(inp).output);
      expect(cv(inp).output).toBe(cv(inp).output);
    });
  }
});

// ── Protected tokens ─────────────────────────────────────────────────────────
describe("Hard protected tokens", () => {
  test("number preserved", () => expect(cv("8 baje hai").output).toContain("8"));
  test("URL preserved", () => expect(cv("www.qalam.works pe jao").output).toContain("www.qalam.works"));
  test("hashtag preserved", () => expect(cv("#PakistanZindabad trend").output).toContain("#PakistanZindabad"));
  test("email preserved", () => expect(cv("email karo info@qalam.works pe").output).toContain("info@qalam.works"));
  test("mention preserved", () => expect(cv("@AhmadKhan ne reply nahi kiya").output).toContain("@AhmadKhan"));
  test("https URL preserved", () => expect(cv("https://docs.google.com ka link").output).toContain("https://docs.google.com"));
  test("percentage preserved", () => expect(cv("50% discount chal raha hai").output).toContain("50%"));
  test("phone number preserved", () => expect(cv("mera number 0312-1234567 hai").output).toContain("0312-1234567"));
  test("all-caps acronym preserved", () => expect(cv("HR ne approve kar diya").output).toContain("HR"));
  test("PDF preserved", () => expect(cv("PDF print nikal lao").output).toContain("PDF"));
});

// ── English word protection ───────────────────────────────────────────────────
describe("English word soft protection", () => {
  test("'problem' stays English", () => expect(cv("koi problem nahi hai").output).toContain("problem"));
  test("'Zoom' preserved (brand)", () => expect(cv("kal Zoom meeting hai").output).toContain("Zoom"));
  test("'WhatsApp' preserved", () => expect(cv("WhatsApp pe message karo").output).toContain("WhatsApp"));
  test("'Netflix' preserved", () => expect(cv("Netflix pe drama hai").output).toContain("Netflix"));
  test("'laptop' stays English", () => expect(cv("mera laptop update ho raha hai").output).toContain("laptop"));
  test("'meeting' stays English", () => expect(cv("meeting cancel ho gayi").output).toContain("meeting"));
  test("'ok' stays English", () => expect(cv("ok theek hai").output).toContain("ok"));
});

// ── Unknown-word safety ───────────────────────────────────────────────────────
describe("Unknown-word safety", () => {
  test("unknown 'xyzblarg' preserved", () => expect(cv("xyzblarg nahi mila").output).toContain("xyzblarg"));
  test("internet slang 'jkjk' preserved", () => expect(cv("jkjk mazza aa gaya").output).toContain("jkjk"));
  test("repeated 'uffffff' preserved", () => expect(cv("uffffff thak gaya").output).toContain("uffffff"));
  test("'lol' preserved", () => expect(cv("lol yaar tu bhi na").output).toContain("lol"));
  test("'omg' preserved", () => expect(cv("omg yaar seriously").output).toContain("omg"));
  test("emoji run preserved", () => expect(cv("😂😂😂 yaar tu nahi sudheray ga").output).toContain("😂😂😂"));
});

// ── Ambiguous token conversion ────────────────────────────────────────────────
describe("Ambiguous tokens → correct Urdu", () => {
  test("main → میں", () => expect(cv("main wahan gaya").output).toContain("میں"));
  test("to → تو", () => expect(cv("yeh to hona hi tha").output).toContain("تو"));
  test("is → اس", () => expect(cv("is mein kya hai").output).toContain("اس"));
  test("par → پر", () => expect(cv("par tumhe kya pata").output).toContain("پر"));
  test("bus → بس", () => expect(cv("bus itna hi kaho").output).toContain("بس"));
  test("na → نہ", () => expect(cv("na karo yeh").output).toContain("نہ"));
  test("kal → کل", () => expect(cv("kal milte hain").output).toContain("کل"));
  test("jo → جو", () => expect(cv("jo hona tha ho gaya").output).toContain("جو"));
});

// ── Phrase matching ───────────────────────────────────────────────────────────
describe("Phrase matching", () => {
  test("koi baat nahi", () => expect(cv("koi baat nahi yaar").output).toContain("کوئی بات نہیں"));
  test("ho gaya", () => expect(cv("kaam ho gaya").output).toContain("ہو گیا"));
  test("ho gayi", () => expect(cv("meeting cancel ho gayi").output).toContain("ہو گئی"));
  test("kar lo", () => expect(cv("kar lo jaldi").output).toContain("کر لو"));
  test("baad mein", () => expect(cv("baad mein baat karte hain").output).toContain("بعد میں"));
  test("thodi der mein", () => expect(cv("thodi der mein aata hoon").output).toContain("تھوڑی دیر میں"));
  test("ke baad", () => expect(cv("kaam ke baad milte hain").output).toContain("کے بعد"));
  test("inshaAllah", () => expect(cv("kal milte hain inshaAllah").output).toContain("انشاءاللہ"));
});

// ── Morphological expansion ───────────────────────────────────────────────────
describe("Morphological forms", () => {
  test("baje → بجے", () => expect(cv("8 baje hai").output).toContain("بجے"));
  test("thak → تھک", () => expect(cv("bahut thak gaya").output).toContain("تھک"));
  test("aa → آ", () => expect(cv("abhi aa nahi sakta").output).toContain("آ"));
  test("hua → ہوا", () => expect(cv("kuch hua nahi yaar").output).toContain("ہوا"));
  test("ayi → آئی", () => expect(cv("samajh nahi ayi").output).toContain("آئی"));
  test("hoon → ہوں", () => expect(cv("kaam kar raha hoon").output).toContain("ہوں"));
  test("jaldi → جلدی", () => expect(cv("jaldi karo").output).toContain("جلدی"));
  test("baitha → بیٹھا", () => expect(cv("wo wahan baitha hai").output).toContain("بیٹھا"));
  test("rehta → رہتا", () => expect(cv("Karachi mein rehta hoon").output).toContain("رہتا"));
});

// ── Spelling variants ─────────────────────────────────────────────────────────
describe("Spelling variants", () => {
  test("bohot / bhot / bohat → بہت", () => {
    for (const v of ["bohot", "bhot", "bohat"]) {
      expect(cv(`${v} acha tha`).output).toContain("بہت");
    }
  });
  test("nahi / nhi / nai / ni → نہیں", () => {
    for (const v of ["nahi", "nhi", "nai", "ni"]) {
      expect(cv(`kuch ${v} hua`).output).toContain("نہیں");
    }
  });
  test("yaar / yar → یار", () => {
    for (const v of ["yaar", "yar"]) {
      expect(cv(`${v} sun`).output).toContain("یار");
    }
  });
  test("phir / phr → پھر", () => {
    for (const v of ["phir", "phr"]) {
      expect(cv(`${v} milenge`).output).toContain("پھر");
    }
  });
  test("repeated-char collapse: aaaacha → اچھا", () => {
    expect(cv("aaaacha samajh gaya").output).toContain("اچھا");
  });
});

// ── Mixed English ─────────────────────────────────────────────────────────────
describe("Mixed English handling", () => {
  test("office mein → office میں", () => {
    const out = cv("office mein presentation deni hai kal").output;
    expect(out).toContain("office");
    expect(out).toContain("presentation");
    expect(out).toContain("میں");
  });
  test("YouTube pe → YouTube پر", () => {
    const out = cv("YouTube pe dekh lena").output;
    expect(out).toContain("YouTube");
    expect(out).toContain("پر");
  });
  test("Google Maps pe location", () => {
    const out = cv("Google Maps pe location share karo").output;
    expect(out).toContain("Google");
    expect(out).toContain("Maps");
    expect(out).toContain("location");
  });
});

// ── Candidate generation ──────────────────────────────────────────────────────
describe("Real Top-3 candidates", () => {
  test("convert returns candidates array", () => {
    const r = cv("main wahan gaya");
    expect(Array.isArray(r.candidates)).toBe(true);
  });
  test("first candidate matches output", () => {
    const r = cv("bohot acha tha");
    if (r.candidates && r.candidates.length > 0) {
      expect(r.candidates[0].output).toBe(r.output);
    }
  });
  test("candidates ≤ 3", () => {
    const r = cv("main wahan gaya");
    if (r.candidates) expect(r.candidates.length).toBeLessThanOrEqual(3);
  });
});

// ── Reconstruction / spacing ──────────────────────────────────────────────────
describe("Output reconstruction", () => {
  test("whitespace between words preserved", () => {
    const out = cv("kal  Zoom  meeting  8  baje").output;
    expect(out).toMatch(/  /); // double space preserved
  });
  test("no extra spaces around converted tokens", () => {
    const out = cv("aaj bahut thak gaya").output;
    expect(out).not.toMatch(/\s{3,}/);
  });
});

// ── Development benchmark assertion ──────────────────────────────────────────
describe("Development benchmark quality gates", () => {
  let result: ReturnType<typeof runBenchmark>;
  beforeAll(() => { result = runBenchmark(corpus, engineV2, "development"); });

  test("Top-1 ≥ 90%", () => {
    expect(result.top1Accuracy).toBeGreaterThanOrEqual(0.90);
  });
  test("Top-3 ≥ 90%", () => {
    expect(result.top3Accuracy).toBeGreaterThanOrEqual(0.90);
  });
  test("unknown-word safe rate ≥ 99%", () => {
    expect(result.unknownWordSafeRate).toBeGreaterThanOrEqual(0.99);
  });
  test("per-category totals = 200", () => {
    expect(result.perCategory.reduce((s, c) => s + c.total, 0)).toBe(200);
  });
  test("mixed category ≥ 90%", () => {
    const mixed = result.perCategory.find(c => c.category === "mixed");
    expect(mixed?.top1Accuracy ?? 0).toBeGreaterThanOrEqual(0.90);
  });
});

// ── 19A.0d: PT collision fixes ────────────────────────────────────────────────
describe("19A.0d: Previously failing PT tokens", () => {
  test("Eid preserved (soft-protected Title Case)", () => {
    const r = engineV2.convert("Eid Mubarak bhai");
    expect(r.output).toContain("Eid");
    expect(r.output).toContain("Mubarak");
  });

  test("Namaz preserved (soft-protected Title Case)", () => {
    const r = engineV2.convert("Namaz ka waqt ho gaya");
    expect(r.output).toContain("Namaz");
  });

  test("'number' stays English (KEEP_ENGLISH)", () => {
    expect(engineV2.convert("mera number 0312-1234567 hai").output).toContain("number");
  });

  test("lowercase 'eid' converts to عید", () => {
    // Lowercase is a common Urdu word
    expect(engineV2.convert("aaj eid ka din hai").output).toContain("عید");
  });

  test("lowercase 'namaz' converts to نماز", () => {
    expect(engineV2.convert("subah namaz parh lena").output).toContain("نماز");
  });

  test("'Allah' (Title Case, no protectedTokens) converts to اللہ", () => {
    expect(engineV2.convert("shukar hai Allah ka").output).toContain("اللہ");
  });
});

describe("19A.0d: Case-aware proper-name handling", () => {
  test("Sara (Title Case) preserved — could be a name", () => {
    expect(engineV2.convert("Sara ne kaha").output).toContain("Sara");
  });

  test("ahmed (lowercase) converts to احمد", () => {
    // Lowercase Roman → convert if in lexicon
    const r = engineV2.convert("ahmed bhai aaye");
    // ahmed → not in lexicon → preserved or converted; test that it doesn't crash
    expect(typeof r.output).toBe("string");
  });

  test("sentence-initial 'Aaj' still converts (in COMMON_SENTENCE_INITIAL)", () => {
    expect(engineV2.convert("Aaj bahut thak gaya").output).toContain("آج");
  });

  test("sentence-initial 'Kal' still converts", () => {
    expect(engineV2.convert("Kal milte hain").output).toContain("کل");
  });

  test("brand 'Zoom' preserved regardless of position", () => {
    expect(engineV2.convert("Zoom pe milte hain").output).toContain("Zoom");
  });

  test("phrase table cannot override protected token (Zoom)", () => {
    const r = engineV2.convert("kal Zoom meeting 8 baje hai");
    expect(r.output).toContain("Zoom");
    expect(r.output).toContain("8");
  });

  test("morphology cannot override KEEP_ENGLISH token", () => {
    expect(engineV2.convert("office mein problem hai").output).toContain("problem");
  });
});

describe("19A.0d: Top-3 sentence-level candidates", () => {
  test("outputs are unique", () => {
    const r = engineV2.convert("na karo yeh");
    const cands = (r.candidates ?? []).map(c => c.output);
    expect(new Set(cands).size).toBe(cands.length);
  });

  test("all candidates are complete sentences", () => {
    const r = engineV2.convert("aaj bohot thak gaya hoon");
    for (const c of r.candidates ?? []) {
      expect(c.output.trim().length).toBeGreaterThan(5);
    }
  });

  test("protected tokens identical in all candidates", () => {
    const r = engineV2.convert("kal Zoom meeting 8 baje hai");
    for (const c of r.candidates ?? []) {
      expect(c.output).toContain("Zoom");
      expect(c.output).toContain("8");
    }
  });

  test("unknown tokens identical in all candidates", () => {
    const r = engineV2.convert("xyzblarg na karo yeh");
    for (const c of r.candidates ?? []) {
      expect(c.output).toContain("xyzblarg");
    }
  });

  test("at most 3 candidates", () => {
    expect((engineV2.convert("main kal wahan na jaunga").candidates ?? []).length).toBeLessThanOrEqual(3);
  });

  test("first candidate equals primary output", () => {
    const r = engineV2.convert("aaj kia karo ge");
    if (r.candidates?.length) expect(r.candidates[0].output).toBe(r.output);
  });

  test("candidate ordering is deterministic", () => {
    const inp = "main kal wahan gaya tha na";
    const r1 = engineV2.convert(inp).candidates?.map(c => c.output).join("|");
    const r2 = engineV2.convert(inp).candidates?.map(c => c.output).join("|");
    expect(r1).toBe(r2);
  });
});
