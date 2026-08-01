'use client';

import React, { useState } from 'react';
import { 
  Wand2, 
  Sparkles, 
  BookOpen, 
  Languages, 
  Layout, 
  CheckCircle2, 
  Sliders, 
  ArrowRight,
  PenTool,
  Hash,
  Scissors,
  Type
} from 'lucide-react';

export default function Home() {
  const [fontFamily, setFontFamily] = useState('font-serif');
  const [fontSize, setFontSize] = useState(32);
  const [textInput, setTextInput] = useState('قلم ورکس — اردو اور عربی ٹائپوگرافی کا جدید ترین ورک اسپیس');

  return (
    <div className="min-h-screen bg-[#08090C] text-slate-100 font-sans selection:bg-[#C5A059] selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#08090C]/80 border-b border-slate-800/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-xl text-[#C5A059]">
              <PenTool className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Qalam Works</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#tools" className="hover:text-[#C5A059] transition-colors">ٹولز (Tools)</a>
            <a href="#sandbox" className="hover:text-[#C5A059] transition-colors">سینڈ بکس (Sandbox)</a>
            <a href="#services" className="hover:text-[#C5A059] transition-colors">سروسز (Services)</a>
          </nav>

          <button className="px-5 py-2.5 rounded-xl bg-[#C5A059] text-slate-950 font-medium hover:bg-[#d6b26a] transition-all shadow-lg shadow-[#C5A059]/10">
            Explore Suite
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-24 max-w-7xl mx-auto text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C5A059]/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C5A059]/30 bg-[#C5A059]/5 text-[#C5A059] text-xs font-medium mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          Modern Digital Atelier for Typography
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto mb-6">
          اردو اور عربی ٹائپوگرافی اور ٹیکسٹ پروسیسنگ کا <span className="text-[#C5A059]">جدید مرکز</span>
        </h1>

        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
          The Modern Digital Atelier & Workspace for Text, Language, and Urdu/Arabic Typography.
        </p>

        {/* Interactive Text Preview Sandbox */}
        <div className="max-w-3xl mx-auto bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-right dir-rtl backdrop-blur-sm shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 dir-ltr">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sliders className="w-4 h-4 text-[#C5A059]" />
              Live Customizer
            </div>
            <div className="flex items-center gap-4 text-xs">
              <label className="text-slate-400">سائز: {fontSize}px</label>
              <input 
                type="range" 
                min="20" 
                max="60" 
                value={fontSize} 
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="accent-[#C5A059]"
              />
            </div>
          </div>

          <textarea 
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            style={{ fontSize: `${fontSize}px` }}
            className="w-full bg-transparent text-slate-100 border-none outline-none resize-none min-h-[120px] text-right leading-relaxed font-serif"
            placeholder="یہاں اپنا متن لکھیں..."
          />
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="px-6 py-20 max-w-7xl mx-auto border-t border-slate-800/40">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">کارآمد ٹولز (Utility Suite)</h2>
          <p className="text-slate-400">اردو اور عربی متن کی تصحیح اور فارمیٹنگ کے خودکار حل</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Spacing & Kerning", icon: Type, desc: "الفاظ اور حروف کے درمیانی فاصلے کی خودکار درستگی۔" },
            { title: "Unicode Standardizer", icon: Hash, desc: "مختلف فانٹس کے نان سٹینڈرڈ کوڈز کو سٹینڈرڈ میں بدلنا۔" },
            { title: "Tashkeel Stripper", icon: Scissors, desc: "عربی اور اردو متن سے اعراب اور اعراب کی صفائی۔" },
            { title: "Smart Word Counter", icon: Wand2, desc: "الفاظ، حروف اور مرکبات کی سمارٹ گنتی۔" },
          ].map((tool, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-[#C5A059]/40 transition-all group">
              <div className="p-3 bg-[#C5A059]/10 text-[#C5A059] rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                <tool.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{tool.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{tool.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="px-6 py-20 max-w-7xl mx-auto border-t border-slate-800/40">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">پیشہ ورانہ خدمات (Services)</h2>
          <p className="text-slate-400">کتابوں کی کمپوزنگ، ترجمہ اور پبلشنگ کی اعلیٰ ترین کوالٹی</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "Book Compositing", icon: BookOpen, desc: "کتابی ترتیب و تزئین، لے آؤٹ اور نفیس ٹائپوگرافی۔" },
            { title: "Multilingual Translation", icon: Languages, desc: "اردو، عربی، فارسی اور انگریزی کے درست تراجم۔" },
            { title: "Desktop Publishing (DTP)", icon: Layout, desc: "پرنٹ ریڈی ڈیزائنز، کور پیجز اور رسائل کی سیٹنگ۔" },
          ].map((service, idx) => (
            <div key={idx} className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all">
              <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl w-fit mb-6">
                <service.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">{service.desc}</p>
              <div className="flex items-center gap-2 text-xs text-[#C5A059] font-medium">
                تفصیلات دیکھیں <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 px-6 py-12 bg-[#050608]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C5A059]/10 text-[#C5A059] rounded-xl">
              <PenTool className="w-5 h-5" />
            </div>
            <span className="font-bold text-white">Qalam Works</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 Qalam Works. The Modern Atelier for Urdu & Arabic Typography.
          </p>
        </div>
      </footer>
    </div>
  );
}
