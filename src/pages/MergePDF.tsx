import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download } from "lucide-react";

export default function MergePDF() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return;
    setStatus("processing");
    setProgress(10);

    try {
      const merged = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const bytes = await files[i].arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
        setProgress(10 + ((i + 1) / files.length) * 80);
      }

      const pdfBytes = await merged.save();
      const blob = new Blob([pdfBytes.buffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [files]);

  return (
    <ToolLayout title="Merge PDF" description="Combine multiple PDF files into a single document" accentClass="text-organize">
      <DropZone files={files} onFilesChange={setFiles} multiple accept=".pdf" />

      {files.length >= 2 && status === "idle" && (
        <div className="mt-6 text-center">
          <button
            onClick={handleMerge}
            className="rounded-lg bg-organize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-organize/90"
          >
            Merge {files.length} PDFs
          </button>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a
            href={resultUrl}
            download="merged.pdf"
            className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90"
          >
            <Download className="h-4 w-4" /> Download Merged PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
