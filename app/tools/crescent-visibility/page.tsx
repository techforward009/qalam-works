import type { Metadata } from "next";
import CrescentVisibilityContent from "./CrescentVisibilityContent";

export const metadata: Metadata = { title: "Moon Sighting | رؤیتِ ہلال | Qalam Works", description: "Moon Sighting: scientific crescent visibility predictions and official references for Pakistan. رؤیتِ ہلال: پاکستان کے لیے چاند کی سائنسی پیش گوئیاں اور سرکاری حوالے۔" };
export default function CrescentVisibilityPage() { return <CrescentVisibilityContent />; }
