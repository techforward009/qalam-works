import type { Metadata } from "next";
import DocumentCleanerContent from "./DocumentCleanerContent";

export const metadata: Metadata = {
  title: "Fix Copied Urdu Text | کاپی شدہ اردو درست کریں | Qalam Works",
  description: "Fix Copied Urdu Text: clean pasted text or uploaded .txt/.docx safely in your browser. کاپی شدہ اردو درست کریں: متن پیسٹ کریں یا فائل اپلوڈ کریں اور اضافی فاصلوں اور رموز کی اصلاح کریں۔",
  alternates: { canonical: "/tools/document-cleaner" },
};

export default function DocumentCleanerPage() {
  return <DocumentCleanerContent />;
}
