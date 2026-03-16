import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download } from "lucide-react";

export default function RotatePDF() {
  const [files, setFiles] = useState<File[]>([]);
  const [angle, setAngle] = useState(90);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleRotate = useCallback(async () => {
    if (!files[0]) return;
    setStatus("processing");
    setProgress(20);

    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setProgress(50);
      doc.getPages().forEach((page) => page.setRotation(page.getRotation() as any));
      doc.getPages().forEach((page) => {
        const current = page.getRotation().angle;
        page.setRotation({ type: "degrees" as any, angle: (current + angle) % 360 } as any);
      });
      setProgress(80);
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [files, angle]);

  return (
    <ToolLayout title="Rotate PDF" description="Rotate all pages in your PDF" accentClass="text-organize">
      <DropZone files={files} onFilesChange={setFiles} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {[90, 180, 270].map((a) => (
              <button
                key={a}
                onClick={() => setAngle(a)}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  angle === a
                    ? "border-organize bg-organize/10 text-organize"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {a}°
              </button>
            ))}
          </div>
          <button
            onClick={handleRotate}
            className="rounded-lg bg-organize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-organize/90"
          >
            Rotate PDF
          </button>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a
            href={resultUrl}
            download="rotated.pdf"
            className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90"
          >
            <Download className="h-4 w-4" /> Download Rotated PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
