import { useState, useCallback } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download } from "lucide-react";

export default function WatermarkPDF() {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("CONFIDENTIAL");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleWatermark = useCallback(async () => {
    if (!files[0]) return;
    setStatus("processing");
    setProgress(20);

    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      setProgress(50);

      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        const fontSize = Math.min(width, height) * 0.08;
        const tw = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: width / 2 - tw / 2,
          y: height / 2,
          size: fontSize,
          font,
          color: rgb(0.7, 0.7, 0.7),
          opacity: 0.3,
          rotate: { type: "degrees" as any, angle: -45 } as any,
        });
      });

      setProgress(80);
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [files, text]);

  return (
    <ToolLayout title="Add Watermark" description="Stamp text across all pages of your PDF" accentClass="text-edit">
      <DropZone files={files} onFilesChange={setFiles} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Watermark text"
            className="w-64 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-edit focus:outline-none focus:ring-1 focus:ring-edit"
          />
          <button
            onClick={handleWatermark}
            className="rounded-lg bg-edit px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-edit/90"
          >
            Add Watermark
          </button>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a
            href={resultUrl}
            download="watermarked.pdf"
            className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90"
          >
            <Download className="h-4 w-4" /> Download Watermarked PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
