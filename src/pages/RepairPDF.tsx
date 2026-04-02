import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download, AlertTriangle, CheckCircle, FileText } from "lucide-react";

export default function RepairPDF() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [repairMsg, setRepairMsg] = useState("");
  const [repairDetails, setRepairDetails] = useState<string[]>([]);

  const handleRepair = useCallback(async () => {
    if (!files[0]) return;
    setStatus("processing");
    setProgress(5);
    setRepairMsg("");
    setRepairDetails([]);
    const details: string[] = [];

    try {
      const bytes = await files[0].arrayBuffer();
      setProgress(15);
      details.push("Reading PDF file...");

      // Step 1: Try standard load
      let doc: PDFDocument | null = null;
      let loadMethod = "";
      try {
        doc = await PDFDocument.load(bytes);
        loadMethod = "standard";
        details.push("✓ PDF loaded normally");
      } catch {
        details.push("⚠ Standard load failed, trying recovery mode...");
      }

      setProgress(30);

      // Step 2: Try with ignoreEncryption
      if (!doc) {
        try {
          doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          loadMethod = "ignoreEncryption";
          details.push("✓ Loaded with encryption bypass");
        } catch {
          details.push("⚠ Encryption bypass failed, trying permissive mode...");
        }
      }

      setProgress(45);

      // Step 3: Try with updateMetadata false
      if (!doc) {
        try {
          doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
          loadMethod = "permissive";
          details.push("✓ Loaded in permissive mode");
        } catch {
          setRepairMsg("This file is too corrupted to repair. The PDF structure is severely damaged.");
          setRepairDetails([...details, "✗ All recovery methods failed"]);
          setStatus("error");
          return;
        }
      }

      setProgress(55);
      const pageCount = doc.getPageCount();

      if (pageCount === 0) {
        setRepairMsg("The PDF has no recoverable pages.");
        setRepairDetails([...details, "✗ No pages found in document"]);
        setStatus("error");
        return;
      }

      details.push(`Found ${pageCount} page${pageCount > 1 ? "s" : ""}`);

      // Step 4: Rebuild the document
      const newDoc = await PDFDocument.create();
      let recoveredPages = 0;

      for (let i = 0; i < pageCount; i++) {
        try {
          const [copied] = await newDoc.copyPages(doc, [i]);
          newDoc.addPage(copied);
          recoveredPages++;
        } catch {
          details.push(`⚠ Page ${i + 1} could not be recovered`);
        }
        setProgress(55 + ((i + 1) / pageCount) * 30);
      }

      if (recoveredPages === 0) {
        setRepairMsg("No pages could be recovered from this PDF.");
        setRepairDetails(details);
        setStatus("error");
        return;
      }

      // Step 5: Set clean metadata
      newDoc.setTitle(files[0].name.replace(/\.pdf$/i, ""));
      newDoc.setProducer("PDFShop.in Repair Tool");
      newDoc.setCreator("PDFShop.in");
      newDoc.setCreationDate(new Date());
      newDoc.setModificationDate(new Date());

      setProgress(90);
      details.push(`✓ Rebuilt document with ${recoveredPages}/${pageCount} pages`);
      if (loadMethod !== "standard") details.push("✓ Fixed internal structure");
      details.push("✓ Cleaned metadata");

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setRepairMsg(`Successfully repaired! Recovered ${recoveredPages} of ${pageCount} page${pageCount > 1 ? "s" : ""}.`);
      setRepairDetails(details);
      setProgress(100);
      setStatus("done");
    } catch {
      setRepairMsg("Failed to repair this PDF. The file may be too corrupted.");
      setRepairDetails(details);
      setStatus("error");
    }
  }, [files]);

  return (
    <ToolLayout title="Repair PDF" description="Attempt to fix corrupted or damaged PDF files" accentClass="text-optimize">
      <DropZone files={files} onFilesChange={(f) => { setFiles(f); setStatus("idle"); setResultUrl(null); setRepairMsg(""); setRepairDetails([]); }} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 text-center space-y-3">
          <div className="mx-auto max-w-md rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{files[0].name}</span>
              <span className="ml-auto">{(files[0].size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
          <button onClick={handleRepair} className="rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            Repair PDF
          </button>
        </div>
      )}

      <ProcessingBar progress={progress} status={status} message={status === "processing" ? "Analyzing and repairing PDF..." : undefined} />

      {repairMsg && (
        <div className={`mt-4 mx-auto max-w-2xl rounded-lg p-4 text-sm ${status === "done" ? "bg-optimize/10 text-optimize" : "bg-destructive/10 text-destructive"}`}>
          <div className="flex items-center gap-2 font-medium mb-2">
            {status === "done" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {repairMsg}
          </div>
          {repairDetails.length > 0 && (
            <div className="mt-2 space-y-1 text-xs opacity-80">
              {repairDetails.map((d, i) => <p key={i}>{d}</p>)}
            </div>
          )}
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
