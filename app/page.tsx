import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#121417] flex flex-col font-sans" dir="rtl">
      
      {/* 1. Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-12 pb-10 text-center">
        
        {/* Target Audience Tag */}
        <div className="inline-block bg-amber-100 text-amber-800 text-xs md:text-sm font-medium px-4 py-1.5 rounded-full mb-5 shadow-sm" dir="ltr">
          For Researchers, Translators, Academic Publishers & Scribes
        </div>

        {/* Main Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-3 font-nastaliq leading-relaxed">
          Qalam Works
        </h1>
        
        <p className="text-xl md:text-2xl font-semibold text-amber-800 mb-5" dir="ltr">
          Precision Typography & Multilingual Publishing Suite
        </p>

        {/* Premium Value Proposition */}
        <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
          <span dir="ltr" className="inline-block font-medium text-gray-800">
            Professional-grade tools for Unicode normalization, Arabic-script typography correction, and publication-ready text preparation in Urdu, Arabic, Persian and multilingual documents.
          </span>
          <span className="block text-sm text-gray-500 mt-2 font-nastaliq">
            (اردو، عربی اور فارسی کے لیے یونیکوڈ کی درستی، ٹائپوگرافی کی اصلاح اور اشاعتی تیاری کا پیشہ ورانہ مرکز)
          </span>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 w-full max-w-md mx-auto">
          <Link
            href="#tools"
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-all text-base text-center"
          >
            Paste Text / متن پیسٹ کریں
          </Link>

          <Link
            href="#upload"
            className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-semibold px-6 py-3 rounded-lg shadow-sm transition-all text-base text-center"
          >
            Upload File / فائل اپ لوڈ کریں
          </Link>
        </div>
        
        <div className="mt-4">
          <Link
            href="#services"
            className="text-sm text-gray-600 hover:text-amber-700 underline transition-all"
          >
            Services / تمام سروسز دیکھیں
          </Link>
        </div>
      </section>

      {/* 2. Utility Suite & Tools Cards */}
      <section id="tools" className="max-w-6xl mx-auto px-4 py-10">
        <div className="border-t border-gray-200 pt-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 font-nastaliq">متن کی اصلاح و اشاعت کے اوزار / Utility Suite</h2>
            <p className="text-gray-600 text-sm md:text-base" dir="ltr">Instant text correction and layout preparation for complex scripts</p>
          </div>

          {/* Tools Grid with Before/After Examples */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            
            {/* Tool 1: Unicode Standardizer */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1 text-amber-700">Unicode Standardizer</h3>
                <p className="text-xs text-gray-500 mb-3">یونیکوڈ اسٹینڈرڈائزر</p>
                <p className="text-sm text-gray-600 mb-4" dir="ltr">Normalizes Arabic/Persian letter variants into standard Urdu shapes.</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 border border-gray-100 font-mono text-left" dir="ltr">
                <div className="text-red-600">Before: يحيى كتاب</div>
                <div className="text-green-600">After: یحییٰ کتاب</div>
              </div>
            </div>

            {/* Tool 2: Diacritics & Tashkeel Manager */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1 text-amber-700">Diacritics & Tashkeel Manager</h3>
                <p className="text-xs text-gray-500 mb-3">تشکیل اور اعراب کا مینیجر</p>
                <p className="text-sm text-gray-600 mb-4" dir="ltr">Intelligently manages, cleans, or corrects short vowels (Zabar, Zair, Paish).</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 border border-gray-100 font-mono text-left" dir="ltr">
                <div className="text-red-600">Before: اَلسَّلَامُ عَلَيْكُمْ</div>
                <div className="text-green-600">After: السَّلامُ عَلَيْكُم</div>
              </div>
            </div>

            {/* Tool 3: Smart Text Metrics / Upcoming Publication Quality Checker */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1 text-amber-700">Publication Quality Checker</h3>
                <p className="text-xs text-gray-500 mb-3">پبلیکیشن کوالٹی چیکر (پری فلائٹ)</p>
                <p className="text-sm text-gray-600 mb-4" dir="ltr">Scans for inconsistent spaces, footnote issues, numeric anomalies & RTL errors.</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 border border-gray-100 text-left" dir="ltr">
                <div className="text-amber-700 font-semibold">Status: Preflight Audit Ready</div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
