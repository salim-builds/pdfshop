import { useState, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download, GripVertical } from "lucide-react";

export default function ReorderPages() {
  const [files, setFiles] = useState<File[]>([]);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

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

  const handleDragStart = (idx: number) => { dragItem.current = idx; };
  const handleDragEnter = (idx: number) => { dragOver.current = idx; };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const copy = [...pageOrder];
    const dragged = copy.splice(dragItem.current, 1)[0];
    copy.splice(dragOver.current, 0, dragged);
    setPageOrder(copy);
    dragItem.current = null;
    dragOver.current = null;
  };

  const handleReorder = useCallback(async () => {
    if (!files[0]) return;
    setStatus("processing");
    setProgress(20);

    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const newDoc = await PDFDocument.create();
      setProgress(40);

      const copied = await newDoc.copyPages(doc, pageOrder);
      copied.forEach((page) => newDoc.addPage(page));
      setProgress(80);

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
          <p className="text-sm text-muted-foreground mb-3 text-center">Drag pages to reorder them:</p>
          <div className="space-y-2">
            {pageOrder.map((pageIdx, i) => (
              <div
                key={`${pageIdx}-${i}`}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragEnter={() => handleDragEnter(i)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 cursor-grab active:cursor-grabbing hover:border-organize/50 transition-colors"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">Page {pageIdx + 1}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button onClick={handleReorder} className="rounded-lg bg-organize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-organize/90">
              Save New Order
            </button>
          </div>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} />

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
