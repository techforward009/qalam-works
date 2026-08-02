import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#121417] flex flex-col font-sans" dir="rtl">
      
      {/* 1. Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-8 pb-8 text-center">
        
        {/* Target Audience Tag */}
        <div className="inline-block bg-amber-100 text-amber-800 text-xs md:text-sm font-medium px-4 py-1.5 rounded-full mb-4 shadow-sm" dir="ltr">
          For Researchers, Translators, Academic Publishers & Scribes
        </div>

        {/* Main Title & Compact Spacing */}
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 font-nastaliq leading-relaxed">
          Qalam Works
        </h1>
        
        <p className="text-lg md:text-xl font-semibold text-amber-800 mb-4" dir="ltr">
          AI-Powered Text Cleaning, Typography & Publishing Tools for Arabic Scripts
        </p>

        {/* Value Proposition */}
        <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto mb-6 leading-relaxed">
          <span dir="ltr" className="block font-medium text-gray-800 mb-1">
            Professional-grade tools for Unicode normalization, Arabic-script typography correction, and publication-ready text preparation in Urdu, Arabic, Persian and multilingual documents.
          </span>
          <span className="text-xs md:text-sm text-gray-500 font-nastaliq block">
            (اردو، عربی، فارسی اور مخلوط متن کی اصلاح، یونی کوڈ معیار بندی، ٹائپوگرافی اور اشاعتی تیاری کے لیے جدید پیشہ ورانہ اوزار)
          </span>
        </p>

        {/* Action Buttons (Primary, Secondary & Live Demo) */}
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
            <p className="text-gray-600 text-xs md:text-sm" dir="ltr">AI-assisted text correction and layout preparation for complex scripts</p>
          </div>

          {/* Tools Grid with Enhanced Before/After Examples */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            
            {/* Tool 1: Unicode Standardizer */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold mb-1 text-amber-700">Unicode Standardizer</h3>
                <p className="text-xs text-gray-500 mb-2">یونیکوڈ اسٹینڈرڈائزر (Arabic characters → Urdu standards)</p>
                <p className="text-xs text-gray-600 mb-3" dir="ltr">Normalizes Arabic/Persian letter variants into standard Urdu shapes using AI matching.</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1 border border-gray-100 font-mono text-left" dir="ltr">
                <div className="text-red-600">Before: يحيى كـتاب</div>
                <div className="text-green-600">After: یحییٰ کتاب</div>
              </div>
            </div>

            {/* Tool 2: Diacritics & Tashkeel Manager */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold mb-1 text-amber-700">Diacritics & Tashkeel Manager</h3>
                <p className="text-xs text-gray-500 mb-2">تشکیل اور اعراب کا مینیجر (Grammar-aware tashkeel)</p>
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
                <p className="text-xs text-gray-600 mb-3" dir="ltr">AI-powered scan for inconsistent spaces, footnote issues, numeric anomalies & RTL errors.</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1 border border-gray-100 text-left" dir="ltr">
                <div className="text-amber-700 font-semibold text-xs">Status: AI Preflight Audit Ready</div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
