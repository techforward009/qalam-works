"use client";

import React, { useState } from "react";
import { Feather, Sparkles, Layers, Sliders, Layout, Type } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Home() {
  const [fontSize, setFontSize] = useState(32);
  const [sampleText, setSampleText] = useState("قلم ورکس — اردو اور عربی ٹائپوگرافی کا جدید مرکز");

  return (
    <div className="min-h-screen bg-amber-50/40 dark:bg-[#121417] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md bg-white/70 dark:bg-[#121417]/70 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Feather className="w-6 h-6 hover:rotate-12 transition-transform duration-300 cursor-pointer" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">
              Qalam Works
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Switcher Button */}
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

      {/* Main Hero Section */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs sm:text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Modern Digital Atelier for Typography</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            اردو اور عربی ٹائپوگرافی اور ٹیکسٹ پروسیسنگ کا <span className="text-amber-600 dark:text-amber-400">جدید مرکز</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto dir-ltr">
            The Modern Digital Atelier & Workspace for Text, Language, and Urdu/Arabic Typography.
          </p>
        </div>

        {/* Live Typography Sandbox */}
        <section className="mt-14 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d21] shadow-xl transition-all">
          <div className="flex flex-col sm:flex-row items-center justify-between pb-6 mb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Sliders className="w-4 h-4 text-amber-500" />
              <span>Live Customizer</span>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500 dark:text-slate-400">سائز: {fontSize}px</span>
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

          {/* Interactive Text Preview */}
          <div className="min-h-[140px] flex items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-[#121417] border border-slate-200/60 dark:border-slate-800">
            <textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              style={{ fontSize: `${fontSize}px` }}
              className="w-full bg-transparent border-none outline-none text-center text-slate-800 dark:text-slate-100 resize-none leading-relaxed font-sans"
              rows={2}
            />
          </div>
        </section>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-[#1a1d21]/50 backdrop-blur-sm">
            <Layout className="w-8 h-8 text-amber-500 mb-4" />
            <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">متحرک لے آؤٹ</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">صفحات کی خطاطی اور جدید لے آؤٹ کے لیے مخصوص ٹولز۔</p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-[#1a1d21]/50 backdrop-blur-sm">
            <Type className="w-8 h-8 text-amber-500 mb-4" />
            <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">ٹائپوگرافی سینڈ باکس</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">متن کا سائز، فاصلے اور نستعلیق فونٹس لائیو ٹیسٹ کریں۔</p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-[#1a1d21]/50 backdrop-blur-sm">
            <Layers className="w-8 h-8 text-amber-500 mb-4" />
            <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">ملٹی لینگویج سوٹ</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">اردو، عربی اور فارسی متن کی پروسیسنگ کا باقاعدہ نظام۔</p>
          </div>
        </section>
      </main>
    </div>
  );
}
