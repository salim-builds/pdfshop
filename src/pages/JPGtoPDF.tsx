import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download } from "lucide-react";

export default function JPGtoPDF() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleConvert = useCallback(async () => {
    if (files.length === 0) return;
    setStatus("processing");
    setProgress(10);

    try {
      const doc = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const bytes = await files[i].arrayBuffer();
        const isPng = files[i].type === "image/png";
        const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        setProgress(10 + ((i + 1) / files.length) * 80);
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [files]);

  return (
    <ToolLayout title="JPG to PDF" description="Convert your images to a PDF document" accentClass="text-convert-to">
      <DropZone files={files} onFilesChange={setFiles} multiple accept="image/jpeg,image/png,image/jpg" />

      {files.length > 0 && status === "idle" && (
        <div className="mt-6 text-center">
          <button
            onClick={handleConvert}
            className="rounded-lg bg-convert-to px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-convert-to/90"
          >
            Convert to PDF
          </button>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a
            href={resultUrl}
            download="images.pdf"
            className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90"
          >
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
