import Link from "next/link";
import InteractiveDemo from "./components/InteractiveDemo";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#121417] flex flex-col font-sans text-center" dir="rtl">
      
      {/* 1. Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-8 pb-8 text-center">
        
        {/* Target Audience Tag */}
        <div className="inline-block bg-amber-100 text-amber-800 text-xs md:text-sm font-medium px-4 py-1.5 rounded-full mb-4 shadow-sm mx-auto" dir="ltr">
          For Researchers • Translators • Publishers • Digital Scribes
        </div>

        {/* Main Title with Robust Mobile Line Break & Padding */}
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-2 font-nastaliq leading-relaxed text-center">
          Qalam Works
        </h1>
        
        <div className="text-lg md:text-2xl font-semibold text-amber-800 mb-4 leading-snug px-2 text-center" dir="ltr">
          <span className="block sm:inline">AI-Powered Publishing Tools</span>{" "}
          <span className="block sm:inline text-base md:text-xl font-medium text-gray-700">for Urdu, Arabic & Persian</span>
        </div>

        {/* Value Proposition */}
        <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto mb-6 leading-relaxed text-center">
          <span dir="ltr" className="block font-medium text-gray-800 mb-1">
            Professional AI tools for Unicode normalization, Arabic-script typography, and publication-ready Urdu, Arabic & Persian documents.
          </span>
          <span className="text-xs md:text-sm text-gray-500 font-nastaliq block">
            اردو، عربی اور فارسی متن کی اصلاح، یونی کوڈ معیاری کاری، خوبصورت ٹائپوگرافی اور اشاعتی تیاری کے لیے جدید AI اوزار
          </span>
        </p>

        {/* Action Buttons with Refined CTA Hierarchy */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 w-full max-w-lg mx-auto">
          <Link
            href="#tools"
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all text-sm text-center"
          >
            Paste & Process Text / متن پیسٹ کریں
          </Link>

          <Link
            href="#upload"
            className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all text-sm text-center"
          >
            Upload Document / فائل اپ لوڈ کریں
          </Link>

          <Link
            href="#demo"
            className="w-full sm:w-auto bg-transparent hover:bg-amber-50/60 text-gray-600 hover:text-amber-900 border border-transparent hover:border-amber-200 font-medium px-4 py-2.5 transition-all text-sm text-center"
          >
            لائیو مثال دیکھیں / Try Demo
          </Link>
        </div>
        
        <div className="mt-3 text-center">
          <Link
            href="#who-is-it-for"
            className="text-xs md:text-sm text-gray-600 hover:text-amber-700 underline transition-all inline-block"
          >
            Who is it for? / یہ کس کے لیے ہے؟
          </Link>
        </div>
      </section>

      {/* 2. Why Qalam Works? (Value Section) */}
      <section id="why-us" className="max-w-6xl mx-auto px-4 py-8 bg-amber-50/50 border-y border-amber-100/60 my-4 text-center">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-1 text-amber-900" dir="ltr">
            Why Qalam Works?
          </h2>
          <h3 className="text-xl md:text-2xl font-bold mb-3 font-nastaliq text-amber-800">
            کیوں انتخاب کریں؟
          </h3>
          <p className="text-gray-600 text-xs md:text-sm max-w-2xl mx-auto" dir="ltr">
            Traditional word processors and generic AI tools struggle with complex Arabic-script typography. Qalam Works is built specifically for these challenges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          
          {/* Pillar 1: Script-Native AI */}
          <div className="bg-white p-5 rounded-xl border border-amber-200/60 shadow-sm flex flex-col items-center">
            <div className="text-amber-600 font-bold text-lg mb-2" dir="ltr">01 / Script-Native AI</div>
            <h3 className="text-base font-bold text-gray-900 mb-1 font-nastaliq">اردو، عربی و فارسی کے لیے خصوصی AI</h3>
            <p className="text-xs text-gray-600 leading-relaxed text-center" dir="ltr">
              Generic AI tools often struggle with Urdu spellings and RTL formatting. Qalam Works is designed specifically for Arabic, Persian, and Urdu script rules, ligatures, and Unicode standards.
            </p>
          </div>

          {/* Pillar 2: Massive Time Saver */}
          <div className="bg-white p-5 rounded-xl border border-amber-200/60 shadow-sm flex flex-col items-center">
            <div className="text-amber-600 font-bold text-lg mb-2" dir="ltr">02 / Massive Time Saver</div>
            <h3 className="text-base font-bold text-gray-900 mb-1 font-nastaliq">گھنٹوں کا کام سیکنڈوں میں</h3>
            <p className="text-xs text-gray-600 leading-relaxed text-center" dir="ltr">
              Manually fixing mixed character variants, spacing anomalies, and missing diacritics can take hours of manual effort. Our preflight engine automates layout and typography auditing efficiently.
            </p>
          </div>

          {/* Pillar 3: Publication-Grade Output */}
          <div className="bg-white p-5 rounded-xl border border-amber-200/60 shadow-sm flex flex-col items-center">
            <div className="text-amber-600 font-bold text-lg mb-2" dir="ltr">03 / Publication-Grade Output</div>
            <h3 className="text-base font-bold text-gray-900 mb-1 font-nastaliq">اشاعت کے لیے تیار معیار</h3>
            <p className="text-xs text-gray-600 leading-relaxed text-center" dir="ltr">
              Output documents are optimized for academic journals, publishing houses, and professional presses, reducing typography errors before going to print.
            </p>
          </div>

        </div>
      </section>

      {/* 3. Who is Qalam Works for? (Target Audience Section) */}
      <section id="who-is-it-for" className="max-w-6xl mx-auto px-4 py-8 text-center">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-1 text-amber-900" dir="ltr">
            Who is Qalam Works for?
          </h2>
          <h3 className="text-xl md:text-2xl font-bold mb-3 font-nastaliq text-amber-800">
            یہ پلیٹ فارم کس کے لیے ہے؟
          </h3>
          <p className="text-gray-600 text-xs md:text-sm max-w-2xl mx-auto" dir="ltr">
            Built for professionals working with Arabic-script text and high-volume publishing workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          
          {/* Card 1: Researchers */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between">
            <div className="w-full">
              <div className="text-amber-600 text-sm font-bold mb-1" dir="ltr">01</div>
              <h3 className="text-base font-bold text-gray-900 mb-1 font-nastaliq">محققین (Researchers)</h3>
              <p className="text-xs text-gray-600 leading-relaxed mt-2 text-center" dir="ltr">
                Clean academic texts, precise references, and proper Arabic-script formatting for thesis and papers.
              </p>
            </div>
          </div>

          {/* Card 2: Translators */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between">
            <div className="w-full">
              <div className="text-amber-600 text-sm font-bold mb-1" dir="ltr">02</div>
              <h3 className="text-base font-bold text-gray-900 mb-1 font-nastaliq">مترجمین (Translators)</h3>
              <p className="text-xs text-gray-600 leading-relaxed mt-2 text-center" dir="ltr">
                Standardize multilingual texts across Urdu, Arabic, and Persian to prepare publication-ready outputs.
              </p>
            </div>
          </div>

          {/* Card 3: Publishers */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between">
            <div className="w-full">
              <div className="text-amber-600 text-sm font-bold mb-1" dir="ltr">03</div>
              <h3 className="text-base font-bold text-gray-900 mb-1 font-nastaliq">ناشرین (Publishers)</h3>
              <p className="text-xs text-gray-600 leading-relaxed mt-2 text-center" dir="ltr">
                Reduce proofreading turnaround time, eliminate layout flaws, and dramatically improve print quality.
              </p>
            </div>
          </div>

          {/* Card 4: Digital Scribes */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between">
            <div className="w-full">
              <div className="text-amber-600 text-sm font-bold mb-1" dir="ltr">04</div>
              <h3 className="text-base font-bold text-gray-900 mb-1 font-nastaliq">ڈیجیٹل کاتبین (Digital Scribes)</h3>
              <p className="text-xs text-gray-600 leading-relaxed mt-2 text-center" dir="ltr">
                Convert messy raw text dumps into clean, structurally uniform documents ready for typesetting.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. AI Utility Suite & Tools Cards (MVP Freeze) */}
      <section id="tools" className="max-w-6xl mx-auto px-4 py-8 bg-amber-50/30 border-t border-amber-100/60 text-center">
        <div className="pt-2">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-1 font-nastaliq text-center">متن کی اصلاح و اشاعت کے اوزار / AI Publishing Suite</h2>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            
            {/* Tool 1: Unicode Standardizer */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between">
              <div className="w-full">
                <h3 className="text-base font-bold mb-1 text-amber-700">Unicode Standardizer</h3>
                <p className="text-xs text-gray-500 mb-2" dir="ltr">Arabic/Persian variants → Standardized forms</p>
                <p className="text-xs text-gray-600 mb-3 text-center" dir="ltr">Converts Arabic/Persian letter variants into standardized forms for clean, consistent publishing.</p>
              </div>
              <div className="w-full bg-gray-50 p-2.5 rounded-lg text-xs space-y-1 border border-gray-100 font-mono text-center" dir="ltr">
                <div className="text-red-600">Before: علي عليه السلام، كربلاء، يحيى</div>
                <div className="text-green-600">After: علی علیہ السلام، کربلا، یحییٰ</div>
              </div>
            </div>

            {/* Tool 2: Diacritics & Tashkeel Manager */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between">
              <div className="w-full">
                <h3 className="text-base font-bold mb-1 text-amber-700">Diacritics & Tashkeel Manager</h3>
                <p className="text-xs text-gray-500 mb-1">تشکیل و اعراب کی اصلاح</p>
                <p className="text-xs font-medium text-amber-800 mb-2" dir="ltr">AI-Assisted Tashkeel & Diacritics Management</p>
                <p className="text-xs text-gray-600 mb-3 text-center" dir="ltr">Intelligently manages, adds, or cleans short vowels (Zabar, Zair, Paish).</p>
              </div>
              <div className="w-full bg-gray-50 p-2.5 rounded-lg text-xs space-y-1 border border-gray-100 font-mono text-center" dir="ltr">
                <div className="text-red-600">Before: السلام عليكم</div>
                <div className="text-green-600">After: اَلسَّلَامُ عَلَيْكُمْ</div>
              </div>
            </div>

            {/* Tool 3: Publication Quality Checker */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-between">
              <div className="w-full">
                <h3 className="text-base font-bold mb-1 text-amber-700">Publication Quality Checker</h3>
                <p className="text-xs text-gray-500 mb-2">پبلیکیشن کوالٹی چیکر (Preflight Audit)</p>
                <p className="text-xs text-gray-600 mb-3 text-center" dir="ltr">Detects RTL issues, typography errors, spacing problems, citation & reference formatting issues, and publication formatting errors.</p>
              </div>
              <div className="w-full bg-gray-50 p-2.5 rounded-lg text-xs text-amber-800 font-medium text-center" dir="ltr">
                ✓ Checks: RTL • Typography • Citations • Layout • Punctuation • Spacing
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Interactive Demo Section (Functional Component) */}
      <InteractiveDemo />

    </div>
  );
}
