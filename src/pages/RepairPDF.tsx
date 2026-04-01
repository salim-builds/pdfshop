import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download, AlertTriangle, CheckCircle } from "lucide-react";

export default function RepairPDF() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [repairMsg, setRepairMsg] = useState("");

  const handleRepair = useCallback(async () => {
    if (!files[0]) return;
    setStatus("processing");
    setProgress(10);
    setRepairMsg("");

    try {
      const bytes = await files[0].arrayBuffer();
      setProgress(30);

      // Try loading with ignoreEncryption to recover what we can
      let doc: PDFDocument;
      try {
        doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      } catch {
        try {
          doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
        } catch {
          setRepairMsg("This file is too corrupted to repair. The PDF structure is severely damaged.");
          setStatus("error");
          return;
        }
      }
      setProgress(60);

      // Re-save the document to repair internal structure
      const newDoc = await PDFDocument.create();
      const pageCount = doc.getPageCount();

      if (pageCount === 0) {
        setRepairMsg("The PDF has no recoverable pages.");
        setStatus("error");
        return;
      }

      const indices = Array.from({ length: pageCount }, (_, i) => i);
      const copied = await newDoc.copyPages(doc, indices);
      copied.forEach((page) => newDoc.addPage(page));
      setProgress(85);

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setRepairMsg(`Successfully repaired! Recovered ${pageCount} page${pageCount > 1 ? "s" : ""}.`);
      setProgress(100);
      setStatus("done");
    } catch {
      setRepairMsg("Failed to repair this PDF. The file may be too corrupted.");
      setStatus("error");
    }
  }, [files]);

  return (
    <ToolLayout title="Repair PDF" description="Attempt to fix corrupted or damaged PDF files" accentClass="text-optimize">
      <DropZone files={files} onFilesChange={(f) => { setFiles(f); setStatus("idle"); setResultUrl(null); setRepairMsg(""); }} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 text-center">
          <button onClick={handleRepair} className="rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            Repair PDF
          </button>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} />

      {repairMsg && (
        <div className={`mt-4 mx-auto max-w-2xl flex items-center gap-2 rounded-lg p-4 text-sm ${status === "done" ? "bg-optimize/10 text-optimize" : "bg-destructive/10 text-destructive"}`}>
          {status === "done" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {repairMsg}
        </div>
      )}

      {resultUrl && (
        <div className="mt-6 text-center">
          <a href={resultUrl} download="repaired.pdf" className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download Repaired PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
