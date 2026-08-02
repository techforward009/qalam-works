import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#121417] flex flex-col font-sans" dir="rtl">
      
      {/* 1. Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-8 pb-8 text-center">
        
        {/* Target Audience Tag */}
        <div className="inline-block bg-amber-100 text-amber-800 text-xs md:text-sm font-medium px-4 py-1.5 rounded-full mb-4 shadow-sm" dir="ltr">
          For Researchers • Translators • Publishers • Digital Scribes
        </div>

        {/* Main Title with Robust Mobile Line Break & Padding */}
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-2 font-nastaliq leading-relaxed">
          Qalam Works
        </h1>
        
        <div className="text-lg md:text-2xl font-semibold text-amber-800 mb-4 leading-snug px-2" dir="ltr">
          <span className="block sm:inline">AI-Powered Publishing Tools</span>{" "}
          <span className="block sm:inline text-base md:text-xl font-medium text-gray-700">for Urdu, Arabic & Persian</span>
        </div>

        {/* Value Proposition */}
        <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto mb-6 leading-relaxed">
          <span dir="ltr" className="block font-medium text-gray-800 mb-1">
            Professional AI tools for Unicode normalization, Arabic-script typography, and publication-ready Urdu, Arabic & Persian documents.
          </span>
          <span className="text-xs md:text-sm text-gray-500 font-nastaliq block">
            اردو، عربی اور فارسی متن کی اصلاح، یونی کوڈ معیاری کاری، خوبصورت ٹائپوگرافی اور اشاعتی تیاری کے لیے جدید AI اوزار
          </span>
        </p>

        {/* Action Buttons */}
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
            className="w-full sm:w-auto bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold px-5 py-2.5 rounded-lg transition-all text-sm text-center"
          >
            لائیو مثال دیکھیں / Try Demo
          </Link>
        </div>
        
        <div className="mt-3">
          <Link
            href="#why-us"
            className="text-xs md:text-sm text-gray-600 hover:text-amber-700 underline transition-all"
          >
            Why Qalam Works? / کیوں انتخاب کریں؟
          </Link>
        </div>
      </section>

      {/* 2. Why Qalam Works? (Refined Value Section) */}
      <section id="why-us" className="max-w-6xl mx-auto px-4 py-8 bg-amber-50/50 border-y border-amber-100/60 my-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 font-nastaliq text-amber-900">
            Why Qalam Works? / کیوں انتخاب کریں؟
          </h2>
          <p className="text-gray-600 text-xs md:text-sm max-w-2xl mx-auto" dir="ltr">
            Traditional word processors and generic AI tools struggle with complex Arabic-script typography. Qalam Works is built specifically for these challenges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
          
          {/* Pillar 1: Script-Native AI */}
          <div className="bg-white p-5 rounded-xl border border-amber-200/60 shadow-sm">
            <div className="text-amber-600 font-bold text-lg mb-2" dir="ltr">01 / Script-Native AI</div>
            <h3 className="text-base font-bold text-gray-900 mb-1 font-nastaliq">عام AI سے ہٹ کر تخصیص شدہ</h3>
            <p className="text-xs text-gray-600 leading-relaxed" dir="ltr">
              Generic AI tools often mishandle Urdu spellings and RTL formatting. Qalam Works is designed specifically for Arabic, Persian, and Urdu script rules, ligatures, and Unicode standards.
            </p>
          </div>

          {/* Pillar 2: Massive Time Saver */}
          <div className="bg-white p-5 rounded-xl border border-amber-200/60 shadow-sm">
            <div className="text-amber-600 font-bold text-lg mb-2" dir="ltr">02 / Massive Time Saver</div>
            <h3 className="text-base font-bold text-gray-900 mb-1 font-nastaliq">گھنٹوں کا کام سیکنڈوں میں</h3>
            <p className="text-xs text-gray-600 leading-relaxed" dir="ltr">
              Manually fixing mixed character variants, spacing anomalies, and missing diacritics can take hours of manual effort. Our preflight engine automates layout and typography auditing instantly.
            </p>
          </div>

          {/* Pillar 3: Publication-Grade Output */}
          <div className="bg-white p-5 rounded-xl border border-amber-200/60 shadow-sm">
            <div className="text-amber-600 font-bold text-lg mb-2" dir="ltr">03 / Publication-Grade Output</div>
            <h3 className="text-base font-bold text-gray-900 mb-1 font-nastaliq">اشاعت کے لیے تیار معیار</h3>
            <p className="text-xs text-gray-600 leading-relaxed" dir="ltr">
              Output documents are optimized for academic journals, publishing houses, and professional presses, reducing typography errors before going to print.
            </p>
          </div>

        </div>
      </section>

      {/* 3. AI Utility Suite & Tools Cards */}
      <section id="tools" className="max-w-6xl mx-auto px-4 py-8">
        <div className="pt-2">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-1 font-nastaliq">متن کی اصلاح و اشاعت کے اوزار / AI Publishing Suite</h2>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            
            {/* Tool 1: Unicode Standardizer */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold mb-1 text-amber-700">Unicode Standardizer</h3>
                <p className="text-xs text-gray-500 mb-2" dir="ltr">Arabic/Persian variants → Standardized forms</p>
                <p className="text-xs text-gray-600 mb-3" dir="ltr">Converts Arabic/Persian letter variants into standardized forms for clean, consistent publishing.</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1 border border-gray-100 font-mono text-left" dir="ltr">
                <div className="text-red-600">Before: علي عليه السلام، كربلاء، يحيى</div>
                <div className="text-green-600">After: علی علیہ السلام، کربلا، یحییٰ</div>
              </div>
            </div>

            {/* Tool 2: Diacritics & Tashkeel Manager */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold mb-1 text-amber-700">Diacritics & Tashkeel Manager</h3>
                <p className="text-xs text-gray-500 mb-1">تشکیل و اعراب کی اصلاح</p>
                <p className="text-xs font-medium text-amber-800 mb-2" dir="ltr">AI-Assisted Tashkeel & Diacritics Management</p>
                <p className="text-xs text-gray-600 mb-3" dir="ltr">Intelligently manages, adds, or cleans short vowels (Zabar, Zair, Paish).</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1 border border-gray-100 font-mono text-left" dir="ltr">
                <div className="text-red-600">Before: السلام عليكم</div>
                <div className="text-green-600">After: اَلسَّلَامُ عَلَيْكُمْ</div>
              </div>
            </div>

            {/* Tool 3: Publication Quality Checker */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold mb-1 text-amber-700">Publication Quality Checker</h3>
                <p className="text-xs text-gray-500 mb-2">پبلیکیشن کوالٹی چیکر (Preflight Audit)</p>
                <p className="text-xs text-gray-600 mb-3" dir="ltr">Detects RTL issues, typography errors, spacing problems, citation & reference formatting issues, and publication formatting errors.</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg text-xs text-amber-800 font-medium text-left" dir="ltr">
                ✓ Checks: RTL • Typography • Citations • Layout • Punctuation • Spacing
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
