"use client";

export default function DocumentHelpDialog({
  isUr,
  mode,
  onClose,
}: {
  isUr: boolean;
  mode: "about" | "shortcuts";
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-xl border border-[#1A3A2A]/15 bg-white p-4 shadow-lg" dir={isUr ? "rtl" : "ltr"}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className={`text-sm font-semibold text-[#1A3A2A] ${isUr ? "font-naskh" : ""}`}>
            {mode === "about"
              ? isUr
                ? "ڈاکومنٹ اسٹوڈیو کے بارے میں"
                : "About Document Studio"
              : isUr
                ? "کی بورڈ شارٹ کٹس"
                : "Keyboard shortcuts"}
          </h2>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded hover:bg-[#F3F7F2]" aria-label={isUr ? "بند کریں" : "Close"}>
            ×
          </button>
        </div>
        {mode === "about" ? (
          <div className={`space-y-2 text-sm text-[#1A3A2A]/80 ${isUr ? "font-naskh" : ""}`}>
            <p>
              {isUr
                ? "مکمل workspace: مسودہ → معیاری بنائیں → کوالٹی چیک → ایکسپورٹ۔ تدوین آپ کے براؤزر میں رہتی ہے۔"
                : "Full workspace: Draft → Standardize → Quality Check → Export. Editing stays in your browser."}
            </p>
            <p>
              {isUr
                ? "PDF ایکسپورٹ صرف فائل بنانے کے لیے سرور استعمال کرتا ہے — دستاویز محفوظ نہیں کی جاتی۔ کلاؤڈ شیئرنگ ابھی نہیں ہے۔"
                : "PDF export uses the server only to generate your file — documents are not stored. Cloud sharing is not available yet."}
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5 text-sm text-[#1A3A2A]/80" dir="ltr">
            <li>Ctrl/Cmd + B — Bold</li>
            <li>Ctrl/Cmd + I — Italic</li>
            <li>Ctrl/Cmd + U — Underline</li>
            <li>Ctrl/Cmd + Z — Undo</li>
            <li>Ctrl/Cmd + Y — Redo</li>
            <li>Ctrl/Cmd + A — Select all</li>
            <li>Ctrl/Cmd + F — Find and replace</li>
          </ul>
        )}
      </div>
    </div>
  );
}
