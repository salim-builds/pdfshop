import {
  FileText, Scissors, Minimize2, FileOutput, Table, Presentation,
  Image, FileInput, Droplets, RotateCw, Lock, Unlock, FileType,
  Stamp, PenTool, Hash, Layers, BookOpen, ScanLine, FileSearch,
  Brain, MessageCircle, Languages, Search, Lightbulb,
  Trash2, FileUp, ArrowUpDown, Wrench, Columns, FileCheck,
  Globe, Camera, Crop, EyeOff, ShieldCheck
} from "lucide-react";

export type ToolCategory = "organize" | "optimize" | "convert-to" | "convert-from" | "edit" | "security" | "ai";

export interface PDFTool {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
  category: ToolCategory;
  path: string;
  premium?: boolean;
}

export const categoryLabels: Record<ToolCategory, string> = {
  organize: "Organize PDF",
  optimize: "Optimize PDF",
  "convert-to": "Convert to PDF",
  "convert-from": "Convert from PDF",
  edit: "Edit PDF",
  security: "PDF Security",
  ai: "AI Tools",
};

export const categoryColors: Record<ToolCategory, string> = {
  organize: "text-organize",
  optimize: "text-optimize",
  "convert-to": "text-convert-to",
  "convert-from": "text-convert-from",
  edit: "text-edit",
  security: "text-security",
  ai: "text-primary",
};

export const categoryBgColors: Record<ToolCategory, string> = {
  organize: "bg-organize/10",
  optimize: "bg-optimize/10",
  "convert-to": "bg-convert-to/10",
  "convert-from": "bg-convert-from/10",
  edit: "bg-edit/10",
  security: "bg-security/10",
  ai: "bg-primary/10",
};

export const tools: PDFTool[] = [
  { id: "merge", name: "Merge PDF", description: "Combine multiple PDFs into one", icon: Layers, category: "organize", path: "/merge" },
  { id: "split", name: "Split PDF", description: "Separate PDF pages", icon: Scissors, category: "organize", path: "/split" },
  { id: "rotate", name: "Rotate PDF", description: "Rotate PDF pages", icon: RotateCw, category: "organize", path: "/rotate" },
  { id: "remove-pages", name: "Remove Pages", description: "Remove specific pages from PDF", icon: Trash2, category: "organize", path: "/remove-pages" },
  { id: "extract-pages", name: "Extract Pages", description: "Extract pages into a new PDF", icon: FileUp, category: "organize", path: "/extract-pages" },
  { id: "reorder-pages", name: "Reorder Pages", description: "Drag & drop to reorder pages", icon: ArrowUpDown, category: "organize", path: "/reorder-pages" },
  { id: "page-numbers", name: "Add Page Numbers", description: "Insert page numbers", icon: Hash, category: "organize", path: "/page-numbers" },
  { id: "compress", name: "Compress PDF", description: "Reduce file size", icon: Minimize2, category: "optimize", path: "/compress" },
  { id: "repair", name: "Repair PDF", description: "Fix corrupted PDF files", icon: Wrench, category: "optimize", path: "/repair" },
  { id: "convert-pdfa", name: "Convert to PDF/A", description: "Archival-compliant PDF format", icon: FileCheck, category: "optimize", path: "/convert-pdfa" },
  { id: "ocr", name: "OCR PDF", description: "Make scanned PDFs searchable", icon: ScanLine, category: "optimize", path: "/ocr" },
  { id: "word-to-pdf", name: "Word to PDF", description: "Convert DOCX to PDF", icon: FileInput, category: "convert-to", path: "/word-to-pdf" },
  { id: "jpg-to-pdf", name: "JPG to PDF", description: "Convert images to PDF", icon: Image, category: "convert-to", path: "/jpg-to-pdf" },
  { id: "html-to-pdf", name: "HTML to PDF", description: "Convert webpage or HTML to PDF", icon: Globe, category: "convert-to", path: "/html-to-pdf" },
  { id: "scan-to-pdf", name: "Scan to PDF", description: "Capture images and create PDF", icon: Camera, category: "convert-to", path: "/scan-to-pdf" },
  { id: "excel-to-pdf", name: "Excel to PDF", description: "Convert spreadsheets to PDF", icon: Table, category: "convert-to", path: "/excel-to-pdf" },
  { id: "ppt-to-pdf", name: "PPT to PDF", description: "Convert presentations to PDF", icon: Presentation, category: "convert-to", path: "/ppt-to-pdf" },
  { id: "pdf-to-word", name: "PDF to Word", description: "Convert PDF to DOCX", icon: FileOutput, category: "convert-from", path: "/pdf-to-word" },
  { id: "pdf-to-excel", name: "PDF to Excel", description: "Convert PDF to spreadsheet", icon: Table, category: "convert-from", path: "/pdf-to-excel" },
  { id: "pdf-to-ppt", name: "PDF to PPT", description: "Convert PDF to presentation", icon: Presentation, category: "convert-from", path: "/pdf-to-ppt" },
  { id: "pdf-to-jpg", name: "PDF to JPG", description: "Convert PDF to images", icon: Image, category: "convert-from", path: "/pdf-to-jpg" },
  { id: "watermark", name: "Add Watermark", description: "Stamp text or image on PDF", icon: Droplets, category: "edit", path: "/watermark" },
  { id: "crop", name: "Crop PDF", description: "Crop margins from PDF pages", icon: Crop, category: "edit", path: "/crop" },
  { id: "edit-pdf", name: "Edit PDF", description: "Modify PDF content", icon: PenTool, category: "edit", path: "/edit-pdf" },
  { id: "sign-pdf", name: "Sign PDF", description: "Add signature to PDF", icon: Stamp, category: "edit", path: "/sign-pdf" },
  { id: "pdf-reader", name: "PDF Reader", description: "View PDF files online", icon: BookOpen, category: "edit", path: "/pdf-reader" },
  { id: "protect", name: "Protect PDF", description: "Add password protection", icon: Lock, category: "security", path: "/protect" },
  { id: "unlock", name: "Unlock PDF", description: "Remove PDF password", icon: Unlock, category: "security", path: "/unlock" },
  { id: "redact", name: "Redact PDF", description: "Permanently black out content", icon: EyeOff, category: "security", path: "/redact", premium: true },
  { id: "permissions", name: "Advanced Permissions", description: "Set printing, copying & editing restrictions", icon: ShieldCheck, category: "security", path: "/permissions", premium: true },
  { id: "compare", name: "Compare PDF", description: "Highlight differences between 2 PDFs", icon: Columns, category: "edit", path: "/compare", premium: true },
  { id: "ai-summary", name: "AI PDF Summary", description: "Get AI-powered PDF summary", icon: Brain, category: "ai", path: "/ai-summary" },
  { id: "ai-chat", name: "AI Chat with PDF", description: "Chat with your PDF using AI", icon: MessageCircle, category: "ai", path: "/ai-chat" },
  { id: "ai-translate", name: "Translate PDF", description: "Translate PDF content to any language", icon: Languages, category: "ai", path: "/ai-translate" },
  { id: "ai-search", name: "Smart Search", description: "AI-powered search in your PDF", icon: Search, category: "ai", path: "/ai-search" },
  { id: "ai-insights", name: "AI Insights", description: "Extract key points & highlights", icon: Lightbulb, category: "ai", path: "/ai-insights" },
];

export const getToolsByCategory = (category: ToolCategory) =>
  tools.filter((t) => t.category === category);

export const navTools = [
  { label: "Merge PDF", path: "/merge" },
  { label: "Split PDF", path: "/split" },
  { label: "Compress PDF", path: "/compress" },
  { label: "Convert PDF", path: "/pdf-to-word" },
];
