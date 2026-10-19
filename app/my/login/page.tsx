import type { Metadata } from "next";
export const metadata: Metadata = {title:"Owner Login — Qalam Works",robots:{index:false,follow:false}};
export default function OwnerLoginPage() {
  return <main dir="rtl" lang="ur" className="mx-auto max-w-lg px-6 py-16 text-right">
    <h1 className="mb-5 text-2xl">ذاتی قرآن — داخلہ</h1>
    <p className="mb-5">صرف قلم ورکس کے مالک کے تصدیق شدہ گٹ ہب اکاؤنٹ سے داخلہ ممکن ہے۔</p>
    <a href="/api/my/oauth/start" rel="nofollow" className="inline-block rounded-md bg-emerald-900 px-5 py-3 text-white">گٹ ہب سے داخل ہوں</a>
  </main>;
}
