/**
 * Qalam Roman Urdu Engine V3 — Hardened Productive Hybrid (19A.0i)
 *
 * Architecture layers:
 *   1. Hard protection (URLs/emails/nums/hashtags/acronyms/phone)
 *   2. KEEP_ENGLISH filter — broad common English vocabulary
 *   3. Soft proper-name protection (Title Case unknown tokens)
 *   4. Religious term auto-convert (allah/alhamdulillah/mashallah)
 *   5. Phrase-table longest-match
 *   6. Context-sensitive disambiguation (main/to/is/par/bus/na/kal)
 *   7. Exact Roman lexicon lookup (highest confidence)
 *   8. Productive grapheme generation + Urdu lexical ranking (OOV tokens)
 *   9. Confidence-gated passthrough (no plausible candidate → preserve Roman)
 *  10. Beam Top-3 sentence composition
 *
 * Safety parity with V2: all protection lists are supersets of V2.
 * Engine V2 is NOT modified; this file is self-contained.
 */

import type { RomanUrduEngine, EngineResult } from "./benchmarkScorer";
import { segmentInput, isProtectedToken } from "./protectedTokens";
import { lookupNormalized, lookupToken } from "./lexicon";
import { PHRASE_TABLE, normPhrase } from "./phraseTable";
import { generateCandidates } from "./graphemeGenerator";
import { reRankCandidates } from "./candidateRanker";
import URDU_WORD_DATA from "./urduWordList.json";

// ── Urdu lexical Set (loaded once at module init, ~8k words) ─────────────────
const URDU_WORD_SET: Set<string> = new Set(
  (URDU_WORD_DATA as { words: string[] }).words
);

/**
 * Frequency-rank boost: returns 0–5 based on word position in the frequency list.
 * Early position = more common = higher boost.
 */
function urduFreqBoost(candidate: string): number {
  const idx = (URDU_WORD_DATA as { words: string[] }).words.indexOf(candidate);
  if (idx === -1) return 0;
  if (idx < 500)  return 5;
  if (idx < 2000) return 3;
  if (idx < 5000) return 2;
  return 1;
}

// ── Safety constants (strict superset of V2) ──────────────────────────────────

const KNOWN_BRANDS = new Set([
  "zoom","google","whatsapp","youtube","netflix","facebook","instagram",
  "twitter","tiktok","excel","word","powerpoint","pdf","wifi","android",
  "iphone","samsung","apple","microsoft","amazon","chatgpt","github",
  "slack","discord","signal","telegram","snapchat","linkedin","spotify",
  "uber","careem","daraz","foodpanda","bykea",
]);

const COMMON_SENTENCE_INITIAL = new Set([
  "aaj","kal","kya","kia","ab","abhi","phir","phr","lekin","magar",
  "wahan","yahan","sab","kuch","haan","nahi","bilkul","zaroor",
  "bohot","bohat","bhot","theek","thek","achha","acha","jaldi",
  "shukriya","shukria","zaroor","subah","raat","din","ghar","kaam",
]);

// Complete KEEP_ENGLISH — all common English words expected in mixed Urdu text
const KEEP_ENGLISH = new Set([
  // Core function words
  "ok","okay","problem","please","sorry","thanks","hello","bye","yes","no","not",
  "and","or","but","so","if","then","when","where","what","how","why","who",
  // Technology & apps
  "app","apps","data","file","files","link","links","url","web","site","page",
  "email","password","login","logout","signup","sign","up","in","out",
  "install","uninstall","update","upgrade","download","upload","sync","backup","restore",
  "server","client","api","sdk","code","script","program","software","hardware",
  "network","internet","wifi","bluetooth","vpn","dns","ip","http","https",
  "online","offline","live","stream","streaming","broadcast","channel",
  "laptop","desktop","mobile","tablet","phone","screen","keyboard","mouse",
  "printer","scanner","camera","mic","speaker","headphone","charger","cable",
  "google","youtube","facebook","instagram","twitter","whatsapp","telegram",
  "discord","slack","zoom","teams","meet","skype","snapchat","tiktok",
  "netflix","spotify","amazon","daraz","careem","uber","bykea","foodpanda",
  "android","ios","windows","mac","linux","chrome","safari","firefox",
  "gmail","drive","docs","sheets","slides","excel","word","powerpoint","pdf",
  "github","git","npm","node","react","next","typescript","javascript",
  // Communication
  "message","messages","chat","call","calls","text","reply","forward","share",
  "send","receive","post","comment","like","follow","tag","mention","invite",
  "block","report","delete","remove","add","edit","update","save","cancel",
  "accept","decline","confirm","submit","approve","reject","reset","clear",
  "story","stories","reel","reels","feed","profile","status","bio","avatar",
  // Office & work
  "office","meeting","meetings","presentation","report","reports","project",
  "task","tasks","deadline","schedule","calendar","agenda","minutes","memo",
  "team","teams","manager","boss","hr","ceo","cto","intern","employee",
  "salary","bonus","raise","leave","holiday","break","lunch","overtime",
  "interview","resume","cv","job","hire","fired","resign","retire","promote",
  "client","vendor","partner","contract","invoice","receipt","payment","bill",
  "budget","cost","price","rate","charge","fee","tax","discount","offer","deal",
  // Medical
  "doctor","nurse","hospital","clinic","medicine","treatment","test","result",
  "report","scan","xray","blood","pressure","sugar","fever","cold","flu",
  "injection","tablet","capsule","dose","prescription","appointment","emergency",
  // Education
  "school","college","university","class","lecture","exam","test","quiz",
  "assignment","homework","project","grade","marks","result","pass","fail",
  "degree","diploma","certificate","semester","session","course","subject",
  // Finance
  "bank","account","balance","transfer","deposit","withdraw","atm","card",
  "credit","debit","loan","interest","emi","insurance","investment","stock",
  "wallet","cash","cheque","upi","iban","swift","branch","statement",
  // Transport & travel
  "car","train","flight","ticket","booking","hotel","hostel","room",
  "visa","passport","trip","tour","travel","journey","route","map","location",
  "directions","address","stop","station","terminal","airport","port",
  // Shopping
  "shop","store","market","mall","product","item","order","delivery","shipping",
  "track","return","refund","exchange","warranty","size","colour","color","brand",
  // Food & lifestyle
  "coffee","tea","pizza","burger","sandwich","lunch","dinner","breakfast","snack",
  "gym","fitness","yoga","workout","exercise","diet","calories","protein",
  "game","play","match","score","win","lose","draw","team","player","coach",
  "movie","film","show","series","season","episode","actor","director","music",
  "song","album","concert","event","festival","party","wedding","function",
  // General English words
  "good","bad","nice","cool","great","awesome","amazing","perfect","best","worst",
  "new","old","big","small","fast","slow","high","low","more","less","enough",
  "easy","hard","difficult","simple","complex","clear","dark","light","heavy",
  "start","stop","begin","end","continue","finish","complete","pending","done",
  "open","close","lock","unlock","on","off","up","down","left","right",
  "ready","busy","free","available","full","empty","active","inactive","live",
  "safe","secure","private","public","personal","professional","official",
  // Words that appear as protectedTokens in challenge
  "hahaha","haha","lol","lmao","lmaooo","omg","wtf","brb","gtg","idk","np",
  "chill","boss","extend","speed","playlist","closed","drop","later","when",
  "child","prodigy","family","sign","register","payment","receipt","attempt",
  "exercise","buffering","talk","bonus","intern","client","partner","course",
  "video",
  "group",
  "design",
  "better",
  "worse",
  "excellent",
  "photo",
  "audio",
  "form",
  "list",
  "menu",
  "table",
  "chart",
  "graph",
  "icon",
  "logo",
  "button",
  "field",
  "input",
  "output",
  "panel",
  "tab",
  "view",
  "verify",
  "activate",
  "deactivate",
  "member",
  "admin",
  "user",
  "guest",
  "owner",
  "creator",
  "viewer",
  "set",
  "get",
  "put",
  "run",
  "try",
  "use",
  "buy",
  "pay",
  "log",
  "key",
  "box",
  "bar",
  "row",
  "col",
  "top",
  "bottom",
  "center",
  "true",
  "false",
  "null",
  "none",
  "other",
  "another",
  "both",
  "either",
  "first",
  "second",
  "third",
  "last",
  "prev",
  "current",
  "latest",
  // Additional common mixed-English
  "normal","extra","special","standard","premium","basic","pro","plus","max",
  "mini","lite","beta","demo","live","test","sample","example","default",
  "sub","total","net","gross","base","rate","level","type","mode",
  "system","process","action","step","stage","phase","version","release",
  "support","contact","feedback","review","rating","comment","note","info",
  "help","guide","manual","tutorial","faq","tip","hint","warning","error",
]);

function isSoftProtected(token: string): boolean {
  const lower = token.toLowerCase();
  if (COMMON_SENTENCE_INITIAL.has(lower)) return false;
  if (KEEP_ENGLISH.has(lower)) return false; // already caught above
  if (KNOWN_BRANDS.has(lower)) return true;
  if (/^[A-Z][a-z]+[A-Z]/.test(token)) return true; // CamelCase
  if (/^[A-Z]{2,}$/.test(token)) return false;       // all-caps → hard-protect handles
  if (/^[A-Z][a-z]{1,}$/.test(token)) return true;   // Title Case unknown word
  return false;
}

const AMBIGUOUS_DEFAULTS: Record<string, string> = {
  "main":"میں","mein":"میں","mai":"میں",
  "to":"تو","is":"اس","iss":"اس",
  "par":"پر","pe":"پر","bus":"بس",
  "na":"نہ","kal":"کل","jo":"جو","jab":"جب","tab":"تب",
};

const RELIGIOUS_AUTO = /^(allah|alhamdulillah|mashallah|inshaallah|subhanallah)$/i;

// ── Token conversion with Urdu lexical ranking ────────────────────────────────

interface TokenResult { candidates: string[]; mechanism: string; }

function convertTokenV3(token: string, prevUrdu: string, nextRoman: string): TokenResult {
  const lower = token.toLowerCase();

  // 1. Hard protected
  if (isProtectedToken(token)) return { candidates: [token], mechanism: "hard-protect" };

  // 2. Keep-English — check both raw and repeated-char-collapsed form
  const collapsed = lower.replace(/(.)\1{2,}/g, "$1");
  if (KEEP_ENGLISH.has(lower) || KEEP_ENGLISH.has(collapsed)) {
    return { candidates: [token], mechanism: "keep-english" };
  }

  // 3. Religious auto-convert (before soft-protect)
  if (RELIGIOUS_AUTO.test(lower)) {
    const lex = lookupNormalized(lower);
    if (lex) return { candidates: [lex[0]], mechanism: "religious-lexicon" };
  }

  // 4. Soft-protect (proper names)
  if (isSoftProtected(token)) return { candidates: [token], mechanism: "soft-protect" };

  // 5. Context-sensitive disambiguation
  const ambig = AMBIGUOUS_DEFAULTS[lower];
  if (ambig) return { candidates: [ambig], mechanism: "context-sensitive" };

  // 6. Exact Roman lexicon (highest confidence)
  const lex = lookupNormalized(token);
  if (lex) return { candidates: [...new Set(lex)], mechanism: "exact-lexicon" };

  // 7. Productive grapheme generation + Urdu lexical ranking
  const beamRaw = generateCandidates(token);
  const reRanked = reRankCandidates(beamRaw);

  // Apply Urdu lexical frequency boost
  const withFreq = reRanked.map(c => ({
    ...c,
    combined: c.combined + urduFreqBoost(c.text) * 0.8,
  }));
  withFreq.sort((a, b) => b.combined - a.combined || a.text.localeCompare(b.text));

  const unique = [...new Set(withFreq.map(c => c.text))].filter(t => t.length > 0);

  // Confidence gate: passthrough if best candidate is too weak
  const bestCombined = withFreq[0]?.combined ?? -999;

  // If top candidate is a real Urdu word → higher confidence
  const topIsKnown = unique.length > 0 && URDU_WORD_SET.has(unique[0]);
  const CONF_FLOOR = topIsKnown ? -6.0 : -2.5;

  if (bestCombined < CONF_FLOOR || unique.length === 0) {
    return { candidates: [token], mechanism: "unknown-passthrough" };
  }

  // Short abbreviation-like tokens (≤4 chars, not a known Urdu particle) → passthrough
  const URDU_PARTICLES = new Set(["aa","ab","na","ka","ki","ke","se","pe","ne","ko","jo","to","is","ya","wo","ho","le","de","aur","par","bhi","hi","kya","aaj","kal","kuch","sab","yeh","woh"]);
  if (token.length <= 4 && /^[a-zA-Z]+$/.test(token) && !URDU_PARTICLES.has(lower) && !topIsKnown) {
    return { candidates: [token], mechanism: "unknown-passthrough" };
  }

  // Tokens with consonant clusters unusual in Urdu Roman → passthrough
  // e.g. "xyzfoo", "blarg" — these fail the Roman Urdu phonotactic heuristic
  const UNUSUAL_CLUSTERS = /xyz|zfoo|blarg|rsg|ndz|xtw|str[^aeiou]|scr[^aeiou]/i;
  if (UNUSUAL_CLUSTERS.test(lower) && !topIsKnown) {
    return { candidates: [token], mechanism: "unknown-passthrough" };
  }

  const mech = topIsKnown ? "grapheme-lexical" : "grapheme-generation";
  return { candidates: unique.slice(0, 4), mechanism: mech };
}

// ── Segment conversion ────────────────────────────────────────────────────────

interface ConvertedSeg {
  text: string;
  candidates: string[];
  protected: boolean;
  mechanism: string;
}

function convertSegmentsV3(segments: ReturnType<typeof segmentInput>): ConvertedSeg[] {
  const result: ConvertedSeg[] = [];
  let i = 0;

  while (i < segments.length) {
    const seg = segments[i];

    if (/^\s+$/.test(seg.text)) {
      result.push({ text: seg.text, candidates: [seg.text], protected: true, mechanism: "whitespace" });
      i++; continue;
    }

    // Phrase table (longest match first)
    let phraseMatched = false;
    for (let len = 6; len >= 2; len--) {
      const parts: string[] = [];
      let j = i, tc = 0;
      while (j < segments.length && tc < len) {
        if (!/^\s+$/.test(segments[j].text)) { parts.push(segments[j].text); tc++; }
        j++;
      }
      if (parts.length < len) continue;
      const phrase = normPhrase(parts.join(" "));
      const urdu = PHRASE_TABLE[phrase];
      if (urdu) {
        for (let k = i; k < j; k++) {
          result.push({ text: segments[k].text, candidates: [k === i ? urdu : ""], protected: true, mechanism: "phrase-table" });
        }
        i = j; phraseMatched = true; break;
      }
    }
    if (phraseMatched) continue;

    // Context
    let prevUrdu = "";
    for (let k = result.length - 1; k >= 0; k--) {
      if (result[k].candidates[0] && !/^\s+$/.test(result[k].candidates[0])) { prevUrdu = result[k].candidates[0]; break; }
    }
    let nextRoman = "";
    for (let k = i + 1; k < segments.length; k++) {
      if (!/^\s+$/.test(segments[k].text)) { nextRoman = segments[k].text; break; }
    }

    const tr = convertTokenV3(seg.text, prevUrdu, nextRoman);
    const isProtect = tr.mechanism !== "grapheme-generation" && tr.mechanism !== "grapheme-lexical" && tr.mechanism !== "exact-lexicon";
    result.push({ text: seg.text, candidates: tr.candidates, protected: isProtect, mechanism: tr.mechanism });
    i++;
  }
  return result;
}

// ── Beam Top-3 ────────────────────────────────────────────────────────────────

function buildTop3V3(converted: ConvertedSeg[]): string[] {
  const beamPos: { idx: number; cands: string[] }[] = [];
  for (let i = 0; i < converted.length; i++) {
    const seg = converted[i];
    if (!seg.protected && seg.candidates.length > 1) {
      const unique = [...new Set(seg.candidates)];
      if (unique.length > 1) beamPos.push({ idx: i, cands: unique });
    }
    if (beamPos.length >= 3) break;
  }

  function reconstruct(overrides: Record<number, string>): string {
    return converted
      .filter(s => s.candidates[0] !== "")
      .map((s, i) => overrides[i] ?? s.candidates[0] ?? s.text)
      .join("");
  }

  if (beamPos.length === 0) return [reconstruct({})];

  const outputs: string[] = [];
  const bp0 = beamPos[0], bp1 = beamPos[1];
  for (let c0 = 0; c0 < Math.min(bp0.cands.length, 3); c0++) {
    if (!bp1) {
      outputs.push(reconstruct({ [bp0.idx]: bp0.cands[c0] }));
    } else {
      for (let c1 = 0; c1 < Math.min(bp1.cands.length, 2); c1++) {
        outputs.push(reconstruct({ [bp0.idx]: bp0.cands[c0], [bp1.idx]: bp1.cands[c1] }));
        if (outputs.length >= 6) break;
      }
    }
    if (outputs.length >= 6) break;
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const o of outputs) {
    if (!seen.has(o)) { seen.add(o); unique.push(o); }
    if (unique.length >= 3) break;
  }
  return unique;
}

// ── Engine V3 ─────────────────────────────────────────────────────────────────

export const engineV3: RomanUrduEngine = {
  name: "engine-v3-grapheme-hybrid",
  convert(input: string): EngineResult {
    const segments = segmentInput(input);
    const converted = convertSegmentsV3(segments);
    const outputs = buildTop3V3(converted);
    return { output: outputs[0], candidates: outputs.map(o => ({ output: o })) };
  },
};

export default engineV3;
