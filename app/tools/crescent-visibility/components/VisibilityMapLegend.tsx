import type { VisibilityMapMethod } from "../utils/mapGridRunner";

const yallop = [
  ["A", "#166534", "Easily visible"], ["B", "#65a30d", "Visible under ideal atmospheric conditions"],
  ["C", "#ca8a04", "May need optical aid"], ["D", "#ea580c", "Visible with optical aid"],
  ["E", "#b45309", "Not visible with a telescope"], ["F", "#991b1b", "Not visible; below the criterion limit"],
] as const;

export const yallopColor = (visibilityClass: string | undefined) => yallop.find(([id]) => id === visibilityClass)?.[1] ?? "#64748b";
export const pakistanColor = (qualifies: boolean | undefined) => qualifies ? "#166534" : "#991b1b";

export function VisibilityMapLegend({ method, ur }: { method: VisibilityMapMethod; ur: boolean }) {
  if (method === "pakistan-5year") return <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2" aria-label={ur ? "پاکستان پانچ سالہ معیار کی کلید" : "Pakistan 5-Year Criterion legend"}>
    <Legend color="#166534" symbol="✓" label={ur ? "معیار پر پورا اترتا ہے" : "Criterion satisfied"} description={ur ? "موجودہ شائع شدہ پاکستان پانچ سالہ معیار کے مطابق" : "Meets the existing published Pakistan 5-Year Criterion"} />
    <Legend color="#991b1b" symbol="×" label={ur ? "معیار پر پورا نہیں اترتا" : "Criterion not satisfied"} description={ur ? "موجودہ شائع شدہ پاکستان پانچ سالہ معیار کے مطابق" : "Does not meet the existing published Pakistan 5-Year Criterion"} />
  </div>;
  return <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3" aria-label={ur ? "یالوپ کلید" : "Yallop visibility-class legend"}>
    {yallop.map(([id, color, explanation]) => <Legend key={id} color={color} symbol={id} label={`Class ${id}`} description={explanation} />)}
    <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">{ur ? "A اور B موجودہ قلم پالیسی کے تحت قبول ہیں؛ نقشہ اصل یالوپ کلاس کو برقرار رکھتا ہے۔" : "A and B are accepted by the current Qalam policy; this map preserves the underlying Yallop class."}</p>
  </div>;
}

function Legend({ color, symbol, label, description }: { color: string; symbol: string; label: string; description: string }) {
  return <div className="flex items-center gap-2" aria-label={`${label}: ${description}`}><span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white text-xs font-bold text-white" style={{ backgroundColor: color }}>{symbol}</span><span><strong>{label}</strong><span className="block text-xs text-muted-foreground">{description}</span></span></div>;
}
