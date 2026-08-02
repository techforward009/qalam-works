"use client";

import { useState } from "react";
import { standardizeUrduText } from "../utils/unicodeStandardizer";

export default function InteractiveDemo() {
  const [input, setInput] = useState("علي عليه السلام ، كربلاء ؛ يحيى ؟");
  const { output, badges } = standardizeUrduText(input);

  return (
    <section id="demo" className="max-w-4xl mx-auto px-4 py-10">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-1 font-nastaliq text-amber-900">
            لائیو ڈیمو / Interactive Demo
          </h2>
          <p className="text-xs md:text-sm text-gray-600" dir="ltr">
            Type or paste your raw Arabic-script text below to see instant normalization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" dir="ltr">
              Input Sample (Raw Text):
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="یہاں متن درج کریں..."
              className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm font-mono text-gray-800 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-amber-500"
              dir="rtl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-800 mb-1" dir="ltr">
              Processed Output (Qalam Works):
            </label>
            <div
              className="w-full bg-amber-50/60 border border-amber-200 p-3 rounded-lg text-sm font-mono text-amber-950 font-medium min-h-[100px] overflow-x-auto"
              dir="rtl"
            >
              {output || <span className="text-gray-400 font-sans text-xs">نتائج یہاں ظاہر ہوں گے...</span>}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-wrap items-center justify-center gap-2 md:gap-3 text-xs font-medium text-green-700" dir="ltr">
          {badges.map((badge, index) => (
            <span key={index} className="flex items-center">
              {badge}
              {index < badges.length - 1 && <span className="text-gray-300 ml-2 md:ml-3">•</span>}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
