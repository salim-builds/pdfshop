import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download, GripVertical, RotateCcw } from "lucide-react";

export default function ReorderPages() {
  const [files, setFiles] = useState<File[]>([]);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setResultUrl(null);
    if (newFiles[0]) {
      try {
        const bytes = await newFiles[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        setPageOrder(Array.from({ length: doc.getPageCount() }, (_, i) => i));
      } catch { setPageOrder([]); }
    }
  }, []);

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragEnter = (idx: number) => setOverIdx(idx);

  const handleDragEnd = () => {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const copy = [...pageOrder];
      const dragged = copy.splice(dragIdx, 1)[0];
      copy.splice(overIdx, 0, dragged);
      setPageOrder(copy);
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  const resetOrder = () => {
    setPageOrder(prev => Array.from({ length: prev.length }, (_, i) => i));
  };

  const reverseOrder = () => {
    setPageOrder(prev => [...prev].reverse());
  };

  const isModified = pageOrder.some((v, i) => v !== i);

  const handleReorder = useCallback(async () => {
    if (!files[0]) return;
    setStatus("processing");
    setProgress(20);

    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const newDoc = await PDFDocument.create();
      setProgress(40);

      for (let i = 0; i < pageOrder.length; i++) {
        const [copied] = await newDoc.copyPages(doc, [pageOrder[i]]);
        newDoc.addPage(copied);
        setProgress(40 + ((i + 1) / pageOrder.length) * 50);
      }

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch { setStatus("error"); }
  }, [files, pageOrder]);

  return (
    <ToolLayout title="Reorder Pages" description="Drag & drop to reorder PDF pages" accentClass="text-organize">
      <DropZone files={files} onFilesChange={handleFilesChange} accept=".pdf" />

      {pageOrder.length > 0 && status === "idle" && (
        <div className="mt-6 mx-auto max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{pageOrder.length} pages — drag to reorder</p>
            <div className="flex gap-2">
              <button onClick={reverseOrder} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Reverse
              </button>
              {isModified && (
                <button onClick={resetOrder} className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {pageOrder.map((pageIdx, i) => (
              <div
                key={`${pageIdx}-${i}`}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragEnter={() => handleDragEnter(i)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all ${
                  dragIdx === i ? "opacity-50 border-organize scale-95" :
                  overIdx === i ? "border-organize bg-organize/5" :
                  pageIdx !== i ? "border-primary/30 bg-primary/5" :
                  "border-border bg-background hover:border-organize/50"
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">Page {pageIdx + 1}</span>
                  {pageIdx !== i && (
                    <span className="block text-[10px] text-primary">moved from #{pageIdx + 1}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">#{i + 1}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 text-center">
            <button onClick={handleReorder} disabled={!isModified} className="rounded-lg bg-organize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-organize/90 disabled:opacity-50">
              {isModified ? "Save New Order" : "Reorder pages first"}
            </button>
          </div>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} message={status === "processing" ? "Reordering pages..." : undefined} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a href={resultUrl} download="reordered.pdf" className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
