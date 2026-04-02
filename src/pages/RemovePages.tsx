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
  const [removedCount, setRemovedCount] = useState(0);

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setResultUrl(null);
    setErrorMsg("");
    setRemovedCount(0);
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

      for (let i = 0; i < keepIndices.length; i++) {
        const [copied] = await newDoc.copyPages(doc, [keepIndices[i]]);
        newDoc.addPage(copied);
        setProgress(30 + ((i + 1) / keepIndices.length) * 60);
      }

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setRemovedCount(pagesToRemove.length);
      setProgress(100);
      setStatus("done");
    } catch {
      setErrorMsg("Failed to process PDF");
      setStatus("error");
    }
  }, [files, pageInput]);

  // Generate quick page buttons
  const pageButtons = totalPages > 0 && totalPages <= 20
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : [];

  const togglePage = (p: number) => {
    const current = parsePageNumbers(pageInput);
    if (current.includes(p)) {
      setPageInput(current.filter(x => x !== p).join(", "));
    } else {
      setPageInput([...current, p].sort((a, b) => a - b).join(", "));
    }
  };

  const selectedPages = parsePageNumbers(pageInput);

  return (
    <ToolLayout title="Remove Pages" description="Remove specific pages from your PDF" accentClass="text-organize">
      <DropZone files={files} onFilesChange={handleFilesChange} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 flex flex-col items-center gap-4">
          {totalPages > 0 && (
            <p className="text-sm text-muted-foreground">Total pages: <span className="font-semibold text-foreground">{totalPages}</span></p>
          )}

          {pageButtons.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {pageButtons.map(p => (
                <button
                  key={p}
                  onClick={() => togglePage(p)}
                  className={`h-10 w-10 rounded-lg text-sm font-medium transition-colors border ${
                    selectedPages.includes(p)
                      ? "bg-destructive text-destructive-foreground border-destructive"
                      : "bg-background text-foreground border-border hover:border-organize/50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
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
            Remove {selectedPages.length > 0 ? `${selectedPages.length} Page${selectedPages.length > 1 ? "s" : ""}` : "Pages"}
          </button>
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
        </div>
      )}

      <ProcessingBar progress={progress} status={status} message={status === "processing" ? "Removing pages..." : undefined} />

      {status === "done" && removedCount > 0 && (
        <p className="mt-2 text-center text-sm text-optimize">
          Removed {removedCount} page{removedCount > 1 ? "s" : ""}. New PDF has {totalPages - removedCount} pages.
        </p>
      )}

      {resultUrl && (
        <div className="mt-4 text-center">
          <a href={resultUrl} download="pages_removed.pdf" className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
