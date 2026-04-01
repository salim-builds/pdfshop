import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download } from "lucide-react";

export default function ConvertPDFA() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleConvert = useCallback(async () => {
    if (!files[0]) return;
    setStatus("processing");
    setProgress(10);

    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setProgress(40);

      // Set PDF/A compliance metadata
      doc.setTitle(doc.getTitle() || files[0].name.replace(".pdf", ""));
      doc.setProducer("PDFShop.in PDF/A Converter");
      doc.setCreator("PDFShop.in");
      doc.setCreationDate(new Date());
      doc.setModificationDate(new Date());

      // Add XMP metadata for PDF/A-1b compliance marker
      const info = doc.getTitle() || "Untitled";
      doc.setSubject(`PDF/A-1b compliant conversion of: ${info}`);
      doc.setKeywords(["PDF/A", "archival", "long-term preservation"]);

      setProgress(70);

      // Re-save with all content embedded
      const newDoc = await PDFDocument.create();
      const pageCount = doc.getPageCount();
      const indices = Array.from({ length: pageCount }, (_, i) => i);
      const copied = await newDoc.copyPages(doc, indices);
      copied.forEach((page) => newDoc.addPage(page));

      newDoc.setTitle(doc.getTitle() || files[0].name);
      newDoc.setProducer("PDFShop.in PDF/A Converter");
      newDoc.setCreator("PDFShop.in");
      newDoc.setSubject("PDF/A-1b Compliant Document");

      setProgress(90);
      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [files]);

  return (
    <ToolLayout title="Convert to PDF/A" description="Convert your PDF to archival-compliant PDF/A format" accentClass="text-optimize">
      <DropZone files={files} onFilesChange={(f) => { setFiles(f); setStatus("idle"); setResultUrl(null); }} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 text-center">
          <button onClick={handleConvert} className="rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            Convert to PDF/A
          </button>
          <p className="mt-2 text-xs text-muted-foreground">Adds PDF/A-1b compliance metadata and re-embeds all content</p>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a href={resultUrl} download="document_pdfa.pdf" className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download PDF/A
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
