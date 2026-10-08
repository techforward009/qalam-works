import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier) && context.parentURL) {
    const candidate = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(candidate)) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
} });

const releaseMarker = 'Validate sentence-level sermon review and primary sources';
if (!process.argv.includes('--live') && ![releaseMarker,'Validate complete sermon composition and source review'].includes(process.env.VERCEL_GIT_COMMIT_MESSAGE?.trim())) {
  console.log('SERMON_REVIEW_EVAL', JSON.stringify({ status: 'skipped', reason: 'explicit-live-evaluation-required' }));
} else {
  const { createSermonSentenceReviewer } = await import('../app/lib/knowledge/sermonReview.ts');
  const { reviewedResearchClaims } = await import('../app/lib/knowledge/researchAnswer.ts');
  // This diagnostic runs only for the fixed public fixtures below, never user material.
  const publicFixtureFetch = async (url, init) => {
    const response = await fetch(url, init);
    if (response.status === 400) {
      try {
        const payload = await response.clone().json();
        const error = payload?.error;
        let message = typeof error?.message === 'string' ? error.message : 'no-error-message';
        for (const secret of [process.env.GEMINI_API_KEY, process.env.GROQ_API_KEY, process.env.CLOUDFLARE_AUTH_TOKEN]) {
          if (secret) message = message.split(secret).join('[redacted]');
        }
        message = message.replace(/AIza[\w-]+/g, '[redacted]').slice(0, 1200);
        console.log('SERMON_PUBLIC_REQUEST_ERROR', JSON.stringify({status: response.status, message}));
      } catch { console.log('SERMON_PUBLIC_REQUEST_ERROR', JSON.stringify({status: response.status, message: 'non-json-error'})); }
    }
    return response;
  };
  const provider = createSermonSentenceReviewer({ fetchImpl: publicFixtureFetch, preferredProvider: process.env.QALAM_SERMON_PROVIDER || undefined, geminiKey:process.env.GEMINI_API_KEY, apiKey: process.env.GROQ_API_KEY, cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID, cloudflareToken: process.env.CLOUDFLARE_AUTH_TOKEN });
  if (!provider) throw new Error('Sermon review evaluation key unavailable');
  console.log('SERMON_REVIEW_EVAL',JSON.stringify({provider:provider.id}));
  // Fixed public Quran fixtures; no private book text or credentials are logged.
  const passages = [
    { id: 'public-eval:2:45', collection: 'quran', language: 'ar', referenceUr: 'قرآن، 2:45', referenceEn: 'Quran, 2:45', sourceSha256: 'a'.repeat(64), translator: null,
      text: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ',
      suppliedTranslation: { language: 'ur', translator: 'علامہ شیخ محسن علی نجفی', text: 'اور صبر اور نماز کا سہارا لو اور یہ (نماز) بارگراں ہے، مگر خشوع رکھنے والوں پر نہیں۔' } },
    { id: 'public-eval:2:153', collection: 'quran', language: 'ar', referenceUr: 'قرآن، 2:153', referenceEn: 'Quran, 2:153', sourceSha256: 'a'.repeat(64), translator: null,
      text: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
      suppliedTranslation: { language: 'ur', translator: 'فراہم کردہ مفہوم کی جانچ', text: 'اللہ یقینا صبر کرنے والوں کے ساتھ ہے۔' } },
  ];
  const fixtures = [
    { id: 'correct-exception', text: 'نماز خشوع رکھنے والوں پر بھاری نہیں ہوتی۔', ref: 1, expected: true },
    { id: 'reversed-exception', text: 'نماز خشوع رکھنے والوں کے سوا کسی پر بھاری نہیں ہوتی۔', ref: 1, expected: false },
    { id: 'only-the-humble', text: 'نماز صرف خشوع رکھنے والوں پر بھاری ہوتی ہے۔', ref: 1, expected: false },
    { id: 'correct-help', text: 'اس آیت میں صبر اور نماز کا سہارا لینے کی ہدایت ہے۔', ref: 1, expected: true },
    { id: 'dropped-prayer', text: 'اس آیت کے مطابق صبر کافی ہے اور نماز کی ضرورت نہیں۔', ref: 1, expected: false },
    { id: 'invented-promise', text: 'اس آیت میں ہر صبر کرنے والے کو ایک ماہ میں دولت ملنے کا وعدہ ہے۔', ref: 2, expected: false },
    { id: 'wrong-attached-verse', text: 'اس آیت میں نماز کے بھاری ہونے کا بیان ہے۔', ref: 2, expected: false },
    { id: 'greeting-with-false-claim', text: 'محترم سامعین! نماز صرف خشوع رکھنے والوں پر بھاری ہوتی ہے۔', ref: 1, expected: false },
  ];
  const input = { question: 'صبر اور نماز', locale: 'ur', evidence: passages.map((passage, i) => ({ ref: i + 1, passage })) };
  const claims = fixtures.map(f => ({ id: f.id, text: f.text, citations: [{ passageId: passages[f.ref - 1].id, quote: passages[f.ref - 1].text }] }));
  try {
    let audit;
    try { audit = await provider.review(input, claims); }
    catch (error) { if (!(error instanceof Error) || !['provider-unavailable','provider-rate-limited'].includes(error.message)) throw error; console.log('SERMON_REVIEW_EVAL',JSON.stringify({retry:error.message})); if(error.message==='provider-rate-limited') await new Promise(resolve=>setTimeout(resolve,60000)); audit = await provider.review(input, claims); }
    const accepted = reviewedResearchClaims(audit, claims);
    if (accepted === null) throw new Error('incomplete-audit');
    for (const fixture of fixtures) {
      const actual = accepted.some(c => c.id === fixture.id);
      console.log('SERMON_REVIEW_EVAL', JSON.stringify({ fixture: fixture.id, expected: fixture.expected, accepted: actual, passed: actual === fixture.expected }));
      if (actual !== fixture.expected) process.exitCode = 1;
    }
  } catch {
    console.log('SERMON_REVIEW_EVAL', JSON.stringify({ status: 'failed', reason: 'provider-or-audit-unavailable' }));
    process.exitCode = 1;
  }
}
