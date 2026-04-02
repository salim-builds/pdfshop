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
  const [extractedCount, setExtractedCount] = useState(0);

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

      for (let i = 0; i < indices.length; i++) {
        const [copied] = await newDoc.copyPages(doc, [indices[i]]);
        newDoc.addPage(copied);
        setProgress(30 + ((i + 1) / indices.length) * 60);
      }

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setExtractedCount(pagesToExtract.length);
      setProgress(100);
      setStatus("done");
    } catch { setErrorMsg("Failed to process PDF"); setStatus("error"); }
  }, [files, pageInput]);

  const selectedPages = parsePages(pageInput);
  const pageButtons = totalPages > 0 && totalPages <= 20
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : [];

  const togglePage = (p: number) => {
    const current = parsePages(pageInput);
    if (current.includes(p)) {
      setPageInput(current.filter(x => x !== p).join(", "));
    } else {
      setPageInput([...current, p].sort((a, b) => a - b).join(", "));
    }
  };

  return (
    <ToolLayout title="Extract Pages" description="Extract specific pages into a new PDF" accentClass="text-organize">
      <DropZone files={files} onFilesChange={handleFilesChange} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 flex flex-col items-center gap-4">
          {totalPages > 0 && <p className="text-sm text-muted-foreground">Total pages: <span className="font-semibold text-foreground">{totalPages}</span></p>}

          {pageButtons.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {pageButtons.map(p => (
                <button
                  key={p}
                  onClick={() => togglePage(p)}
                  className={`h-10 w-10 rounded-lg text-sm font-medium transition-colors border ${
                    selectedPages.includes(p)
                      ? "bg-organize text-background border-organize"
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
            placeholder="Pages to extract (e.g., 1-3, 5, 8-10)"
            className="w-80 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-organize focus:outline-none focus:ring-1 focus:ring-organize"
          />
          <button onClick={handleExtract} disabled={!pageInput.trim()} className="rounded-lg bg-organize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-organize/90 disabled:opacity-50">
            Extract {selectedPages.length > 0 ? `${selectedPages.length} Page${selectedPages.length > 1 ? "s" : ""}` : "Pages"}
          </button>
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
        </div>
      )}

      <ProcessingBar progress={progress} status={status} message={status === "processing" ? "Extracting pages..." : undefined} />

      {status === "done" && extractedCount > 0 && (
        <p className="mt-2 text-center text-sm text-optimize">
          Extracted {extractedCount} page{extractedCount > 1 ? "s" : ""} into a new PDF.
        </p>
      )}

      {resultUrl && (
        <div className="mt-4 text-center">
          <a href={resultUrl} download="extracted_pages.pdf" className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
