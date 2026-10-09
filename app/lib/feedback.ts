export const FEEDBACK_TOOLS = ["translation-studio","research-studio","khateeb-studio","unicode-standardizer","publication-quality-checker","whatsapp-rtl-formatter","document-studio","document-cleaner","arabic-diacritics","roman-urdu-writer","urdu-roman-writer","invoice-generator","date-converter","crescent-visibility","quran-editions","services","other"] as const;
export type FeedbackTool = typeof FEEDBACK_TOOLS[number];
export type FeedbackRating = "helpful" | "partial" | "not-helpful";
export type FeedbackEntry = {tool:FeedbackTool;rating:FeedbackRating;comment:string;page:string;createdAt:string};
export function parseFeedback(value:unknown): Omit<FeedbackEntry,"createdAt"> | null {
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const body=value as Record<string,unknown>;
 if(Object.keys(body).some(key=>!["tool","rating","comment","page"].includes(key)))return null;
 if(typeof body.tool!=="string"||!FEEDBACK_TOOLS.includes(body.tool as FeedbackTool))return null;
 if(!["helpful","partial","not-helpful"].includes(String(body.rating)))return null;
 if(typeof body.comment!=="string"||body.comment.length>1200)return null;
 if(typeof body.page!=="string"||body.page.length>250||!body.page.startsWith("/")||body.page.startsWith("//")||/[?#\\\r\n]/.test(body.page))return null;
 return {tool:body.tool as FeedbackTool,rating:body.rating as FeedbackRating,comment:body.comment.trim(),page:body.page};
}
