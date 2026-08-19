/**
 * Privacy-first analytics types for Qalam Works.
 * Event properties are an allow-list only — never document/invoice content.
 */

export type ToolId =
  | "document_studio"
  | "document_cleaner"
  | "quality_audit"
  | "urdu_unicode_standardizer"
  | "whatsapp_rtl_formatter"
  | "invoice_generator"
  | "translation_studio"
  | "urdu_writer"
  | "home"
  | "unknown";

export type ProcessingMode = "auto" | "ur" | "en" | "ar";
export type ResolvedMode = "ur" | "en" | "ar" | "rtl-neutral";
export type InputMethod = "paste" | "upload" | "editor" | "example" | "unknown";
export type ExportFormat = "txt" | "docx" | "pdf" | "copy";
export type NavSource =
  | "header"
  | "footer"
  | "homepage_card"
  | "more_tools"
  | "cross_link"
  | "unknown";

/** Controlled error codes — never raw exception messages with user text. */
export type AnalyticsErrorCode =
  | "extraction_failed"
  | "unsupported_file_type"
  | "file_too_large"
  | "processing_failed"
  | "export_failed"
  | "clipboard_failed"
  | "empty_input"
  | "unknown";

export type CountBucket =
  | "0"
  | "1-100"
  | "101-500"
  | "501-2000"
  | "2001-10000"
  | "10000+";

export type AnalyticsEventName =
  | "tool_open"
  | "tool_mode_change"
  | "tool_process"
  | "tool_copy"
  | "tool_download"
  | "tool_clear"
  | "tool_example"
  | "tool_error"
  | "tool_tab_change"
  | "nav_click"
  | "preview_confirm"
  | "preview_cancel";

/** Allow-listed properties only. */
export interface AnalyticsProps {
  tool?: ToolId;
  mode?: ProcessingMode;
  resolved_mode?: ResolvedMode;
  input_method?: InputMethod;
  export_format?: ExportFormat;
  success?: boolean;
  error_code?: AnalyticsErrorCode;
  nav_source?: NavSource;
  target_tool?: ToolId;
  count_bucket?: CountBucket;
  tab?: string;
}

export const TOOL_IDS: readonly ToolId[] = [
  "document_studio",
  "document_cleaner",
  "quality_audit",
  "urdu_unicode_standardizer",
  "whatsapp_rtl_formatter",
  "invoice_generator",
  "home",
  "unknown",
] as const;

export const FORBIDDEN_PROP_KEYS = [
  "text",
  "content",
  "filename",
  "fileName",
  "customerName",
  "email",
  "phone",
  "address",
  "invoiceNumber",
  "body",
  "message",
  "clipboard",
  "document",
  "html",
  "snippet",
  "hash",
] as const;
