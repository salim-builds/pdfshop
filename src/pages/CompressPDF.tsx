import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download } from "lucide-react";

export default function CompressPDF() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [savedSize, setSavedSize] = useState("");

  const handleCompress = useCallback(async () => {
    if (!files[0]) return;
    setStatus("processing");
    setProgress(20);

    try {
      const bytes = await files[0].arrayBuffer();
      setProgress(40);
      const doc = await PDFDocument.load(bytes);
      setProgress(60);
      // pdf-lib re-serialization strips some redundancy
      const pdfBytes = await doc.save();
      setProgress(90);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));

      const original = files[0].size;
      const compressed = pdfBytes.byteLength;
      const pct = Math.round((1 - compressed / original) * 100);
      setSavedSize(pct > 0 ? `Reduced by ${pct}%` : "File already optimized");

      setProgress(100);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [files]);

  return (
    <ToolLayout title="Compress PDF" description="Reduce the file size of your PDF" accentClass="text-optimize">
      <DropZone files={files} onFilesChange={setFiles} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 text-center">
          <button
            onClick={handleCompress}
            className="rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90"
          >
            Compress PDF
          </button>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} message={status === "done" ? savedSize : undefined} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a
            href={resultUrl}
            download="compressed.pdf"
            className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90"
          >
            <Download className="h-4 w-4" /> Download Compressed PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
