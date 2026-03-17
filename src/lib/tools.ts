import {
  FileText, Scissors, Minimize2, FileOutput, Table, Presentation,
  Image, FileInput, Droplets, RotateCw, Lock, Unlock, FileType,
  Stamp, PenTool, Hash, Layers, BookOpen, ScanLine, FileSearch,
  Brain, MessageCircle
} from "lucide-react";

export type ToolCategory = "organize" | "optimize" | "convert-to" | "convert-from" | "edit" | "security" | "ai";

export interface PDFTool {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
  category: ToolCategory;
  path: string;
}

export const categoryLabels: Record<ToolCategory, string> = {
  organize: "Organize PDF",
  optimize: "Optimize PDF",
  "convert-to": "Convert to PDF",
  "convert-from": "Convert from PDF",
  edit: "Edit PDF",
  security: "PDF Security",
};

export const categoryColors: Record<ToolCategory, string> = {
  organize: "text-organize",
  optimize: "text-optimize",
  "convert-to": "text-convert-to",
  "convert-from": "text-convert-from",
  edit: "text-edit",
  security: "text-security",
};

export const categoryBgColors: Record<ToolCategory, string> = {
  organize: "bg-organize/10",
  optimize: "bg-optimize/10",
  "convert-to": "bg-convert-to/10",
  "convert-from": "bg-convert-from/10",
  edit: "bg-edit/10",
  security: "bg-security/10",
};

export const tools: PDFTool[] = [
  { id: "merge", name: "Merge PDF", description: "Combine multiple PDFs into one", icon: Layers, category: "organize", path: "/merge" },
  { id: "split", name: "Split PDF", description: "Separate PDF pages", icon: Scissors, category: "organize", path: "/split" },
  { id: "rotate", name: "Rotate PDF", description: "Rotate PDF pages", icon: RotateCw, category: "organize", path: "/rotate" },
  { id: "page-numbers", name: "Add Page Numbers", description: "Insert page numbers", icon: Hash, category: "organize", path: "/page-numbers" },
  { id: "compress", name: "Compress PDF", description: "Reduce file size", icon: Minimize2, category: "optimize", path: "/compress" },
  { id: "ocr", name: "OCR PDF", description: "Make scanned PDFs searchable", icon: ScanLine, category: "optimize", path: "/ocr" },
  { id: "word-to-pdf", name: "Word to PDF", description: "Convert DOCX to PDF", icon: FileInput, category: "convert-to", path: "/word-to-pdf" },
  { id: "jpg-to-pdf", name: "JPG to PDF", description: "Convert images to PDF", icon: Image, category: "convert-to", path: "/jpg-to-pdf" },
  { id: "excel-to-pdf", name: "Excel to PDF", description: "Convert spreadsheets to PDF", icon: Table, category: "convert-to", path: "/excel-to-pdf" },
  { id: "ppt-to-pdf", name: "PPT to PDF", description: "Convert presentations to PDF", icon: Presentation, category: "convert-to", path: "/ppt-to-pdf" },
  { id: "pdf-to-word", name: "PDF to Word", description: "Convert PDF to DOCX", icon: FileOutput, category: "convert-from", path: "/pdf-to-word" },
  { id: "pdf-to-excel", name: "PDF to Excel", description: "Convert PDF to spreadsheet", icon: Table, category: "convert-from", path: "/pdf-to-excel" },
  { id: "pdf-to-ppt", name: "PDF to PPT", description: "Convert PDF to presentation", icon: Presentation, category: "convert-from", path: "/pdf-to-ppt" },
  { id: "pdf-to-jpg", name: "PDF to JPG", description: "Convert PDF to images", icon: Image, category: "convert-from", path: "/pdf-to-jpg" },
  { id: "watermark", name: "Add Watermark", description: "Stamp text or image on PDF", icon: Droplets, category: "edit", path: "/watermark" },
  { id: "edit-pdf", name: "Edit PDF", description: "Modify PDF content", icon: PenTool, category: "edit", path: "/edit-pdf" },
  { id: "sign-pdf", name: "Sign PDF", description: "Add signature to PDF", icon: Stamp, category: "edit", path: "/sign-pdf" },
  { id: "protect", name: "Protect PDF", description: "Add password protection", icon: Lock, category: "security", path: "/protect" },
  { id: "unlock", name: "Unlock PDF", description: "Remove PDF password", icon: Unlock, category: "security", path: "/unlock" },
  { id: "pdf-reader", name: "PDF Reader", description: "View PDF files online", icon: BookOpen, category: "edit", path: "/pdf-reader" },
];

export const getToolsByCategory = (category: ToolCategory) =>
  tools.filter((t) => t.category === category);

export const navTools = [
  { label: "Merge PDF", path: "/merge" },
  { label: "Split PDF", path: "/split" },
  { label: "Compress PDF", path: "/compress" },
  { label: "Convert PDF", path: "/pdf-to-word" },
];
