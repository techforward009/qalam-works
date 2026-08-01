"use client";

import React, { useState } from "react";
import { 
  PenTool, 
  Sparkles, 
  Layers, 
  Sliders, 
  Layout, 
  Type, 
  Wrench, 
  Box, 
  Briefcase,
  Space,
  Code,
  Scissors,
  Calculator,
  BookOpen,
  Languages,
  Book,
  ArrowLeft
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Home() {
  const [fontSize, setFontSize] = useState(32);
  const [sampleText, setSampleText] = useState("قلم ورکس — اردو اور عربی ٹائپوگرافی کا جدید مرکز");

  return (
    <div dir="rtl" className="min-h-screen bg-amber-50/40 dark:bg-[#121417] text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col justify-between">
      <div>
        {/* Navigation Header */}
        <header className="border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md bg-white/70 dark:bg-[#121417]/70 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <PenTool className="w-6 h-6 hover:rotate-12 transition-transform duration-300 cursor-pointer" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white dir-ltr">
                Qalam Works
              </span>
            </div>

            {/* Navigation Buttons */}
            <nav className="hidden md:flex items-center gap-8 font-medium text-base text-slate-600 dark:text-slate-300 font-nastaliq">
              <a href="#tools" className="flex items-center gap-2 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                <Wrench className="w-4 h-4 text-amber-500" />
                <span>ٹولز</span>
              </a>
              <a href="#sandbox" className="flex items-center gap-2 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                <Box className="w-4 h-4 text-amber-500" />
                <span>سینڈباکس</span>
              </a>
              <a href="#services" className="flex items-center gap-2 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                <Briefcase className="w-4 h-4 text-amber-500" />
                <span>سروسز</span>
              </a>
            </nav>

            {/* Action Section */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              
              <button 
                onClick={() => alert("Suite features coming soon!")}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white font-medium text-sm transition-all shadow-sm"
              >
                Explore Suite
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          {/* Hero Banner */}
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs sm:text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Modern Digital Atelier for Typography</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[2.2] font-nastaliq">
              اردو اور عربی ٹائپوگرافی اور ٹیکسٹ پروسیسنگ کا <span className="text-amber-600 dark:text-amber-400">جدید مرکز</span>
            </h1>

            {/* Hero Subtitle with Forced LTR Dot Fix */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              <span dir="ltr" className="inline-block">
                The Modern Digital Atelier &amp; Workspace for Text, Language, and Urdu/Arabic Typography&#46;
              </span>
            </p>
          </div>

          {/* Live Typography Sandbox Section */}
          <section id="sandbox" className="mt-14 max-w-5xl mx-auto p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d21] shadow-xl transition-all">
            <div className="flex flex-col sm:flex-row items-center justify-between pb-6 mb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Sliders className="w-4 h-4 text-amber-500" />
                <span>Live Customizer</span>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-end font-nastaliq">
                <span className="text-sm text-slate-500 dark:text-slate-400">سائز: {fontSize}px</span>
                <input
                  type="range"
                  min="18"
                  max="60"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  aria-label="Font Size Selector"
                  className="w-32 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Textarea Preview */}
            <div className="min-h-[160px] flex items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-[#121417] border border-slate-200/60 dark:border-slate-800">
              <textarea
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                style={{ fontSize: `${fontSize}px` }}
                className="w-full bg-transparent border-none outline-none text-center text-slate-800 dark:text-slate-100 resize-none leading-[2.2] font-nastaliq"
                rows={2}
              />
            </div>
          </section>

          {/* Core Highlights Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-5xl mx-auto">
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1a1d21] shadow-sm hover:shadow-md transition-shadow">
              <Layout className="w-8 h-8 text-amber-500 mb-4" />
              <h3 className="font-bold text-xl mb-2 text-slate-800 dark:text-white font-nastaliq">متحرک لے آؤٹ</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-nastaliq leading-[2]">صفحات کی خطاطی اور جدید لے آؤٹ کے لیے مخصوص ٹولز۔</p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1a1d21] shadow-sm hover:shadow-md transition-shadow">
              <Type className="w-8 h-8 text-amber-500 mb-4" />
              <h3 className="font-bold text-xl mb-2 text-slate-800 dark:text-white font-nastaliq">ٹائپوگرافی سینڈ باکس</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-nastaliq leading-[2]">متن کا سائز، فاصلے اور نستعلیق فونٹس لائیو ٹیسٹ کریں۔</p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1a1d21] shadow-sm hover:shadow-md transition-shadow">
              <Layers className="w-8 h-8 text-amber-500 mb-4" />
              <h3 className="font-bold text-xl mb-2 text-slate-800 dark:text-white font-nastaliq">ملٹی لینگویج سوٹ</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-nastaliq leading-[2]">اردو، عربی اور فارسی متن کی پروسیسنگ کا باقاعدہ نظام۔</p>
            </div>
          </section>

          {/* Section 1: Utility Suite */}
          <section id="tools" className="mt-20 max-w-5xl mx-auto">
            <div className="text-center space-y-2 mb-10">
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white font-nastaliq leading-[2]">
                کارآمد ٹولز <span className="text-slate-500 dark:text-slate-400 font-normal text-xl font-sans">(Utility Suite)</span>
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400 font-nastaliq">اردو اور عربی متن کی تصحیح اور فارمیٹنگ کے خودکار حل</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1a1d21] hover:border-amber-500/50 transition-all text-center group cursor-pointer">
                <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Space className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base mb-1 text-slate-800 dark:text-white">Spacing & Kerning</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-nastaliq leading-[2]">الفاظ اور حروف کے درمیانی فاصلے کی خودکار درستگی۔</p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1a1d21] hover:border-amber-500/50 transition-all text-center group cursor-pointer">
                <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Code className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base mb-1 text-slate-800 dark:text-white">Unicode Standardizer</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-nastaliq leading-[2]">مختلف فونٹس کے نان سٹینڈرڈ کوڈز کو سٹینڈرڈ میں بدلنا۔</p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1a1d21] hover:border-amber-500/50 transition-all text-center group cursor-pointer">
                <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Scissors className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base mb-1 text-slate-800 dark:text-white">Tashkeel Stripper</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-nastaliq leading-[2]">عربی اور اردو متن سے اعراب اور اعراب کی صفائی۔</p>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1a1d21] hover:border-amber-500/50 transition-all text-center group cursor-pointer">
                <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Calculator className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base mb-1 text-slate-800 dark:text-white">Smart Word Counter</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-nastaliq leading-[2]">الفاظ، حروف اور حرکات کی سمارٹ گنتی۔</p>
              </div>
            </div>
          </section>

          {/* Section 2: Professional Services */}
          <section id="services" className="mt-20 max-w-5xl mx-auto">
            <div className="text-center space-y-2 mb-10">
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white font-nastaliq leading-[2]">
                پیشہ ورانہ خدمات <span className="text-slate-500 dark:text-slate-400 font-normal text-xl font-sans">(Services)</span>
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400 font-nastaliq">کتابوں کی کمپوزنگ، ترجمہ اور پبلشنگ کی اعلیٰ ترین کوالٹی</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1a1d21] hover:border-amber-500/50 transition-all group flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">Book Compositing</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-[2] font-nastaliq mb-6">کتاب ترتیب و تزئین، لے آؤٹ اور نفیس ٹائپوگرافی۔</p>
                </div>
                <a href="#" className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:gap-2 transition-all font-nastaliq">
                  <span>تفصیلات دیکھیں</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1a1d21] hover:border-amber-500/50 transition-all group flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
                    <Languages className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">Multilingual Translation</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-[2] font-nastaliq mb-6">اردو، عربی، فارسی اور انگریزی کے درست تراجم۔</p>
                </div>
                <a href="#" className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:gap-2 transition-all font-nastaliq">
                  <span>تفصیلات دیکھیں</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1a1d21] hover:border-amber-500/50 transition-all group flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
                    <Book className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">Desktop Publishing (DTP)</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-[2] font-nastaliq mb-6">پرنٹ ریڈی ڈیزائنز، کور پیجز اور رسائل کی سیٹنگ۔</p>
                </div>
                <a href="#" className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:gap-2 transition-all font-nastaliq">
                  <span>تفصیلات دیکھیں</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Footer Section */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#121417]/80 backdrop-blur-sm py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span dir="ltr" className="inline-block">
              &copy; 2026 Qalam Works. The Modern Atelier for Urdu &amp; Arabic Typography&#46;
            </span>
          </p>
          <div className="flex items-center gap-2">
            <span dir="ltr" className="font-bold text-sm text-slate-700 dark:text-slate-200">
              Qalam Works
            </span>
            <div className="p-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <PenTool className="w-4 h-4" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

