import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#121417] flex flex-col font-sans" dir="rtl">
      
      {/* 1. Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        
        {/* Target Audience Tag */}
        <div className="inline-block bg-amber-100 text-amber-800 text-xs md:text-sm font-medium px-4 py-1.5 rounded-full mb-6 shadow-sm" dir="ltr">
          For Researchers, Translators, Academic Publishers & Scribes
        </div>

        {/* Main Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 font-nastaliq leading-relaxed">
          Qalam Works
        </h1>
        
        <p className="text-xl md:text-2xl font-semibold text-amber-800 mb-6" dir="ltr">
          Precision Typography & Multilingual Publishing Suite
        </p>

        {/* Sub-headline / Value Proposition */}
        <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
          <span dir="ltr" className="inline-block">Unicode standardization, typography correction, and publishing preparation for Urdu, Arabic & Persian.</span>
          <span className="block text-sm text-gray-500 mt-1 font-nastaliq">
            (اردو، عربی اور فارسی کے لیے یونیکوڈ کی درستی، ٹائپوگرافی کی اصلاح اور اشاعتی تیاری)
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

          <Link
            href="#services"
            className="w-full sm:w-auto bg-transparent hover:bg-gray-100 text-gray-700 font-medium px-6 py-3 rounded-lg transition-all text-base text-center"
          >
            Services / تمام سروسز
          </Link>
        </div>
      </section>

      {/* 2. Utility Suite & Tools Cards */}
      <section id="tools" className="max-w-6xl mx-auto px-4 py-12">
        <div className="border-t border-gray-200 pt-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Utility Suite / فوری یوٹیلیٹی ٹولز</h2>
            <p className="text-gray-600 text-sm md:text-base" dir="ltr">Instant text correction and layout preparation for complex scripts</p>
          </div>

          {/* Tools Grid with Before/After Examples */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            
            {/* Tool 1 */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-lg font-bold mb-1 text-amber-700">Unicode Standardizer</h3>
              <p className="text-xs text-gray-500 mb-3">یونیکوڈ اسٹینڈرڈائزر</p>
              <p className="text-sm text-gray-600 mb-4" dir="ltr">Fixes Arabic/Persian letter variants into standard Urdu shapes.</p>
              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 border border-gray-100 font-mono text-left" dir="ltr">
                <div className="text-red-600">Before: كِتاب (Arabic Kaf)</div>
                <div className="text-green-600">After: کتاب (Urdu Kaf)</div>
              </div>
            </div>

            {/* Tool 2 */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-lg font-bold mb-1 text-amber-700">Diacritics & Tashkeel Manager</h3>
              <p className="text-xs text-gray-500 mb-3">تشکیل اور اعراب کا مینیجر</p>
              <p className="text-sm text-gray-600 mb-4" dir="ltr">Cleans or manages short vowels (Zabar, Zair, Paish) seamlessly.</p>
              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 border border-gray-100 font-mono text-left" dir="ltr">
                <div className="text-red-600">Before: اَلْعِلْمُ نُورٌ</div>
                <div className="text-green-600">After: العلم نور</div>
              </div>
            </div>

            {/* Tool 3 */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-lg font-bold mb-1 text-amber-700">Smart Text Metrics</h3>
              <p className="text-xs text-gray-500 mb-3">اسمارٹ ٹیکسٹ میٹرکس</p>
              <p className="text-sm text-gray-600 mb-4" dir="ltr">Accurate word counting, character spacing, and typography metrics.</p>
              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 border border-gray-100 text-left" dir="ltr">
                <div className="text-gray-700">Status: Live Metrics & Spacing Analysis</div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
