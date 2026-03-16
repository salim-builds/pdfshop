import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download } from "lucide-react";

export default function SplitPDF() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [results, setResults] = useState<{ url: string; name: string }[]>([]);

  const handleSplit = useCallback(async () => {
    if (!files[0]) return;
    setStatus("processing");
    setProgress(10);

    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const total = doc.getPageCount();
      const urls: { url: string; name: string }[] = [];

      for (let i = 0; i < total; i++) {
        const newDoc = await PDFDocument.create();
        const [page] = await newDoc.copyPages(doc, [i]);
        newDoc.addPage(page);
        const pdfBytes = await newDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        urls.push({ url: URL.createObjectURL(blob), name: `page_${i + 1}.pdf` });
        setProgress(10 + ((i + 1) / total) * 85);
      }

      setResults(urls);
      setProgress(100);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [files]);

  return (
    <ToolLayout title="Split PDF" description="Extract pages from your PDF into separate files" accentClass="text-organize">
      <DropZone files={files} onFilesChange={setFiles} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 text-center">
          <button
            onClick={handleSplit}
            className="rounded-lg bg-organize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-organize/90"
          >
            Split PDF
          </button>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} />

      {results.length > 0 && (
        <div className="mt-6 mx-auto max-w-2xl space-y-2">
          {results.map((r) => (
            <a
              key={r.name}
              href={r.url}
              download={r.name}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Download className="h-4 w-4 text-optimize" />
              {r.name}
            </a>
          ))}
        </div>
      )}
    </ToolLayout>
  );
}
