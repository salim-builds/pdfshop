import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download } from "lucide-react";

export default function ExtractPages() {
  const [files, setFiles] = useState<File[]>([]);
  const [pageInput, setPageInput] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setResultUrl(null);
    setErrorMsg("");
    if (newFiles[0]) {
      try {
        const bytes = await newFiles[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        setTotalPages(doc.getPageCount());
      } catch { setTotalPages(0); }
    }
  }, []);

  const parsePages = (input: string): number[] => {
    const pages = new Set<number>();
    input.split(",").forEach((part) => {
      const t = part.trim();
      if (t.includes("-")) {
        const [s, e] = t.split("-").map(Number);
        if (!isNaN(s) && !isNaN(e)) for (let i = s; i <= e; i++) pages.add(i);
      } else {
        const n = Number(t);
        if (!isNaN(n)) pages.add(n);
      }
    });
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleExtract = useCallback(async () => {
    if (!files[0]) return;
    const pagesToExtract = parsePages(pageInput);
    if (pagesToExtract.length === 0) { setErrorMsg("Enter valid page numbers"); return; }

    setStatus("processing");
    setProgress(10);
    setErrorMsg("");

    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const count = doc.getPageCount();
      setProgress(30);

      const invalid = pagesToExtract.filter((p) => p < 1 || p > count);
      if (invalid.length) { setErrorMsg(`Invalid pages: ${invalid.join(", ")}. PDF has ${count} pages.`); setStatus("error"); return; }

      const newDoc = await PDFDocument.create();
      const indices = pagesToExtract.map((p) => p - 1);
      const copied = await newDoc.copyPages(doc, indices);
      copied.forEach((page) => newDoc.addPage(page));
      setProgress(80);

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch { setErrorMsg("Failed to process PDF"); setStatus("error"); }
  }, [files, pageInput]);

  return (
    <ToolLayout title="Extract Pages" description="Extract specific pages into a new PDF" accentClass="text-organize">
      <DropZone files={files} onFilesChange={handleFilesChange} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 flex flex-col items-center gap-4">
          {totalPages > 0 && <p className="text-sm text-muted-foreground">Total pages: {totalPages}</p>}
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            placeholder="Pages to extract (e.g., 1-3, 5, 8-10)"
            className="w-80 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-organize focus:outline-none focus:ring-1 focus:ring-organize"
          />
          <button onClick={handleExtract} disabled={!pageInput.trim()} className="rounded-lg bg-organize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-organize/90 disabled:opacity-50">
            Extract Pages
          </button>
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
        </div>
      )}

      <ProcessingBar progress={progress} status={status} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a href={resultUrl} download="extracted_pages.pdf" className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
