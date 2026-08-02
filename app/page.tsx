import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#121417] flex flex-col font-sans">
      
      {/* 1. Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        
        {/* Target Audience Tag */}
        <div className="inline-block bg-amber-100 text-amber-800 text-xs md:text-sm font-medium px-4 py-1.5 rounded-full mb-6 shadow-sm">
          مترجمین، محققین، ناشرین، مدارس اور اشاعتی اداروں کے لیے
        </div>

        {/* Main Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 font-nastaliq leading-relaxed">
          اردو اور عربی ٹائپوگرافی اور ٹیکسٹ پروسیسنگ کا جدید مرکز
        </h1>

        {/* Refined Value Proposition */}
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          کمپوزنگ، پروف ریڈنگ، یونیکوڈ اصلاح اور اشاعتی تیاری — ایک ہی جگہ۔
        </p>

        {/* Action Buttons (Stacked on mobile, row on desktop) */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 w-full max-w-md mx-auto">
          <Link
            href="#tools"
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-all text-base text-center"
          >
            متن پیسٹ کریں / ٹولز دیکھیں
          </Link>

          <Link
            href="#upload"
            className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-semibold px-6 py-3 rounded-lg shadow-sm transition-all text-base text-center"
          >
            فائل اپ لوڈ کریں
          </Link>

          <Link
            href="#services"
            className="w-full sm:w-auto bg-transparent hover:bg-gray-100 text-gray-700 font-medium px-6 py-3 rounded-lg transition-all text-base text-center"
          >
            تمام سروسز دیکھیں
          </Link>
        </div>
      </section>

      {/* 2. Utility Suite & Tools Cards (Before/After Examples) */}
      <section id="tools" className="max-w-6xl mx-auto px-4 py-12">
        <div className="border-t border-gray-200 pt-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3 font-nastaliq">فوری یوٹیلیٹی ٹولز</h2>
            <p className="text-gray-600">ایک کلک پر اردو اور عربی متن کی خامیوں کو دور کریں</p>
          </div>

          {/* Tools Grid with Before/After Examples */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tool 1 */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-xl font-bold mb-2 text-amber-700">یونیکوڈ اسٹینڈرڈائزر</h3>
              <p className="text-sm text-gray-600 mb-4">عربی ک اور ی کو درست اردو شکل میں تبدیل کرتا ہے۔</p>
              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 border border-gray-100">
                <div className="text-red-600"><span className="font-bold">قبل:</span> كِتاب (عربی ک)</div>
                <div className="text-green-600"><span className="font-bold">بعد:</span> کتاب (اردو ک)</div>
              </div>
            </div>

            {/* Tool 2 */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-xl font-bold mb-2 text-amber-700">تشکیل اسٹرپر (Tashkeel Stripper)</h3>
              <p className="text-sm text-gray-600 mb-4">متن سے زبر، زیر، پیش اور تشدید کو باآسانی ہٹاتا ہے۔</p>
              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 border border-gray-100">
                <div className="text-red-600"><span className="font-bold">قبل:</span> اَلْعِلْمُ نُورٌ</div>
                <div className="text-green-600"><span className="font-bold">بعد:</span> العلم نور</div>
              </div>
            </div>

            {/* Tool 3 */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-xl font-bold mb-2 text-amber-700">اسمارٹ ورڈ کاؤنٹر</h3>
              <p className="text-sm text-gray-600 mb-4">الفاظ، حروف اور پیراگراف کی درست گنتی کریں۔</p>
              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 border border-gray-100">
                <div className="text-gray-700"><span className="font-bold">حالت:</span> لائیو کاؤنٹ اور اسپیس مینجمنٹ</div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
