import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download } from "lucide-react";

export default function RemovePages() {
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
      } catch {
        setTotalPages(0);
      }
    }
  }, []);

  const parsePageNumbers = (input: string): number[] => {
    const pages = new Set<number>();
    input.split(",").forEach((part) => {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) pages.add(i);
        }
      } else {
        const n = Number(trimmed);
        if (!isNaN(n)) pages.add(n);
      }
    });
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleRemove = useCallback(async () => {
    if (!files[0]) return;
    const pagesToRemove = parsePageNumbers(pageInput);
    if (pagesToRemove.length === 0) {
      setErrorMsg("Please enter valid page numbers");
      return;
    }

    setStatus("processing");
    setProgress(10);
    setErrorMsg("");

    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const count = doc.getPageCount();
      setProgress(30);

      const invalidPages = pagesToRemove.filter((p) => p < 1 || p > count);
      if (invalidPages.length > 0) {
        setErrorMsg(`Invalid pages: ${invalidPages.join(", ")}. PDF has ${count} pages.`);
        setStatus("error");
        return;
      }

      if (pagesToRemove.length >= count) {
        setErrorMsg("Cannot remove all pages from the PDF.");
        setStatus("error");
        return;
      }

      const newDoc = await PDFDocument.create();
      const keepIndices = Array.from({ length: count }, (_, i) => i)
        .filter((i) => !pagesToRemove.includes(i + 1));

      const copiedPages = await newDoc.copyPages(doc, keepIndices);
      copiedPages.forEach((page) => newDoc.addPage(page));
      setProgress(80);

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch {
      setErrorMsg("Failed to process PDF");
      setStatus("error");
    }
  }, [files, pageInput]);

  return (
    <ToolLayout title="Remove Pages" description="Remove specific pages from your PDF" accentClass="text-organize">
      <DropZone files={files} onFilesChange={handleFilesChange} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 flex flex-col items-center gap-4">
          {totalPages > 0 && (
            <p className="text-sm text-muted-foreground">Total pages: {totalPages}</p>
          )}
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            placeholder="Pages to remove (e.g., 2, 5, 7 or 3-6)"
            className="w-80 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-organize focus:outline-none focus:ring-1 focus:ring-organize"
          />
          <button
            onClick={handleRemove}
            disabled={!pageInput.trim()}
            className="rounded-lg bg-organize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-organize/90 disabled:opacity-50"
          >
            Remove Pages
          </button>
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
        </div>
      )}

      <ProcessingBar progress={progress} status={status} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a href={resultUrl} download="pages_removed.pdf" className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
