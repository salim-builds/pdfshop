import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download } from "lucide-react";

export default function CropPDF() {
  const [files, setFiles] = useState<File[]>([]);
  const [margins, setMargins] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [applyTo, setApplyTo] = useState<"all" | "custom">("all");
  const [customPages, setCustomPages] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setResultUrl(null);
    if (newFiles[0]) {
      try {
        const bytes = await newFiles[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        setTotalPages(doc.getPageCount());
        if (doc.getPageCount() > 0) {
          const { width, height } = doc.getPage(0).getSize();
          setPageSize({ width: Math.round(width), height: Math.round(height) });
        }
      } catch { setTotalPages(0); setPageSize({ width: 0, height: 0 }); }
    }
  }, []);

  const parsePages = (input: string, total: number): number[] => {
    if (applyTo === "all") return Array.from({ length: total }, (_, i) => i);
    const pages = new Set<number>();
    input.split(",").forEach((part) => {
      const t = part.trim();
      if (t.includes("-")) {
        const [s, e] = t.split("-").map(Number);
        if (!isNaN(s) && !isNaN(e)) for (let i = s; i <= e; i++) if (i >= 1 && i <= total) pages.add(i - 1);
      } else {
        const n = Number(t);
        if (!isNaN(n) && n >= 1 && n <= total) pages.add(n - 1);
      }
    });
    return Array.from(pages);
  };

  const handleCrop = useCallback(async () => {
    if (!files[0]) return;
    setStatus("processing");
    setProgress(20);

    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const count = doc.getPageCount();
      const targetPages = parsePages(customPages, count);
      setProgress(40);

      targetPages.forEach((idx, i) => {
        const page = doc.getPage(idx);
        const { width, height } = page.getSize();
        const newX = margins.left;
        const newY = margins.bottom;
        const newW = Math.max(1, width - margins.left - margins.right);
        const newH = Math.max(1, height - margins.top - margins.bottom);
        page.setCropBox(newX, newY, newW, newH);
        setProgress(40 + ((i + 1) / targetPages.length) * 50);
      });

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch { setStatus("error"); }
  }, [files, margins, applyTo, customPages]);

  const presetMargins = [
    { label: "None", values: { top: 0, right: 0, bottom: 0, left: 0 } },
    { label: "Small (10pt)", values: { top: 10, right: 10, bottom: 10, left: 10 } },
    { label: "Medium (36pt)", values: { top: 36, right: 36, bottom: 36, left: 36 } },
    { label: "Large (72pt)", values: { top: 72, right: 72, bottom: 72, left: 72 } },
  ];

  return (
    <ToolLayout title="Crop PDF" description="Crop margins from your PDF pages" accentClass="text-edit">
      <DropZone files={files} onFilesChange={handleFilesChange} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 mx-auto max-w-md space-y-4">
          {totalPages > 0 && (
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">Total pages: <span className="font-semibold text-foreground">{totalPages}</span></p>
              {pageSize.width > 0 && (
                <p className="text-xs text-muted-foreground">Page size: {pageSize.width} × {pageSize.height} pts</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            {presetMargins.map(preset => (
              <button
                key={preset.label}
                onClick={() => setMargins(preset.values)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  JSON.stringify(margins) === JSON.stringify(preset.values)
                    ? "border-edit bg-edit/10 text-edit"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <div key={side} className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground capitalize">{side} (pts)</label>
                <input
                  type="number"
                  min={0}
                  value={margins[side]}
                  onChange={(e) => setMargins((m) => ({ ...m, [side]: Number(e.target.value) }))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-edit focus:outline-none focus:ring-1 focus:ring-edit"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-center">
            <button onClick={() => setApplyTo("all")} className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${applyTo === "all" ? "border-edit bg-edit/10 text-edit" : "border-border text-muted-foreground"}`}>All Pages</button>
            <button onClick={() => setApplyTo("custom")} className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${applyTo === "custom" ? "border-edit bg-edit/10 text-edit" : "border-border text-muted-foreground"}`}>Custom Pages</button>
          </div>

          {applyTo === "custom" && (
            <input type="text" value={customPages} onChange={(e) => setCustomPages(e.target.value)} placeholder="e.g., 1-3, 5" className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-edit focus:outline-none focus:ring-1 focus:ring-edit" />
          )}

          <div className="text-center">
            <button onClick={handleCrop} className="rounded-lg bg-edit px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-edit/90">Crop PDF</button>
          </div>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} message={status === "processing" ? "Cropping pages..." : undefined} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a href={resultUrl} download="cropped.pdf" className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download Cropped PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
