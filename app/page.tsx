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

        {/* Action Buttons (Primary, Secondary, Tertiary) */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="#tools"
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-all text-base"
          >
            متن پیسٹ کریں / ٹولز دیکھیں
          </Link>

          <Link
            href="#upload"
            className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-semibold px-6 py-3 rounded-lg shadow-sm transition-all text-base"
          >
            فائل اپ لوڈ کریں
          </Link>

          <Link
            href="#services"
            className="bg-transparent hover:bg-gray-100 text-gray-700 font-medium px-6 py-3 rounded-lg transition-all text-base"
          >
            تمام سروسز دیکھیں
          </Link>
        </div>
      </section>

      {/* 2. Utility Suite & Live Demo Section (Placeholder for upcoming components) */}
      <section id="tools" className="max-w-6xl mx-auto px-4 py-12">
        <div className="border-t border-gray-200 pt-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">فوری یوٹیلیٹی ٹولز</h2>
          <p className="text-center text-gray-500 mb-6">ٹولز اور بفور/آفٹر مثالوں کا سیکشن یہاں منسلک کیا جا رہا ہے...</p>
        </div>
      </section>

    </div>
  );
}
