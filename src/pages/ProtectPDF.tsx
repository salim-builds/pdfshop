import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download } from "lucide-react";

export default function ProtectPDF() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleProtect = useCallback(async () => {
    if (!files[0] || !password) return;
    setStatus("processing");
    setProgress(30);

    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setProgress(60);
      // pdf-lib doesn't natively encrypt; we re-save as a demonstration
      // Real encryption would require a backend service
      const pdfBytes = await doc.save();
      setProgress(90);
      const blob = new Blob([pdfBytes.buffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [files, password]);

  return (
    <ToolLayout title="Protect PDF" description="Add password protection to your PDF" accentClass="text-security">
      <DropZone files={files} onFilesChange={setFiles} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-64 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-security focus:outline-none focus:ring-1 focus:ring-security"
          />
          <button
            onClick={handleProtect}
            disabled={!password}
            className="rounded-lg bg-security px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-security/90 disabled:opacity-50"
          >
            Protect PDF
          </button>
          <p className="text-xs text-muted-foreground">Note: Full encryption requires a backend service. This is a demo.</p>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a
            href={resultUrl}
            download="protected.pdf"
            className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90"
          >
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
