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

        {/* Main Title & Compact Spacing */}
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 font-nastaliq leading-relaxed">
          Qalam Works
        </h1>
        
        <p className="text-lg md:text-xl font-semibold text-amber-800 mb-4" dir="ltr">
          AI-Powered Urdu, Arabic & Persian Publishing Tools
        </p>

        {/* Value Proposition with Normalization */}
        <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto mb-6 leading-relaxed">
          <span dir="ltr" className="block font-medium text-gray-800 mb-1">
            Professional AI tools for Unicode normalization, Arabic-script typography, and publication-ready Urdu, Arabic & Persian documents.
          </span>
          <span className="text-xs md:text-sm text-gray-500 font-nastaliq block">
            (اردو، عربی، فارسی اور مخلوط متن کی اصلاح، یونی کوڈ معیار بندی، ٹائپوگرافی اور اشاعتی تیاری کے لیے جدید AI معاون اوزار)
          </span>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 w-full max-w-lg mx-auto">
          <Link
            href="#tools"
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all text-sm text-center"
          >
            متن پیسٹ کریں / Paste Text
          </Link>

          <Link
            href="#upload"
            className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all text-sm text-center"
          >
            فائل اپ لوڈ کریں / Upload File
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
            href="#services"
            className="text-xs md:text-sm text-gray-600 hover:text-amber-700 underline transition-all"
          >
            Services / تمام سروسز دیکھیں
          </Link>
        </div>
      </section>

      {/* 2. AI Utility Suite & Tools Cards */}
      <section id="tools" className="max-w-6xl mx-auto px-4 py-8">
        <div className="border-t border-gray-200 pt-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-1 font-nastaliq">متن کی اصلاح و اشاعت کے اوزار / AI Publishing Suite</h2>
            <p className="text-gray-600 text-xs md:text-sm" dir="ltr">Automating Arabic-script publishing workflows and complex layout preparation</p>
          </div>

          {/* Tools Grid with Clean Layout & No Broken Brackets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            
            {/* Tool 1: Unicode Standardizer */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold mb-1 text-amber-700">Unicode Standardizer</h3>
                <p className="text-xs text-gray-500 mb-2" dir="ltr">Arabic/Persian variants → Standard Urdu forms</p>
                <p className="text-xs text-gray-600 mb-3" dir="ltr">Normalizes Arabic/Persian letter variants into standard Urdu shapes using AI-powered script normalization.</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1 border border-gray-100 font-mono text-left" dir="ltr">
                <div className="text-red-600">Before: علي عليه السلام</div>
                <div className="text-green-600">After: علی علیہ السلام</div>
              </div>
            </div>

            {/* Tool 2: Diacritics & Tashkeel Manager */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold mb-1 text-amber-700">Diacritics & Tashkeel Manager</h3>
                <p className="text-xs text-gray-500 mb-1">تشکیل اور اعراب کا مینیجر</p>
                <p className="text-xs font-medium text-amber-800 mb-2" dir="ltr">AI-assisted grammar-aware Tashkeel</p>
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
                <p className="text-xs text-gray-600 mb-3" dir="ltr">AI-powered preflight scan for Arabic/Urdu punctuation errors, broken ligatures, citation formatting, and page layout issues.</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg text-xs text-amber-800 font-medium text-left" dir="ltr">
                ✓ Checks: RTL • Typography • Citations • Layout • Punctuation
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
