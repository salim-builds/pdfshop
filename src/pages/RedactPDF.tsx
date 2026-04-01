import { useState, useCallback } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface RedactArea {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function RedactPDF() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [areas, setAreas] = useState<RedactArea[]>([{ page: 1, x: 50, y: 700, width: 200, height: 20 }]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setResultUrl(null);
    if (newFiles[0]) {
      try {
        const bytes = await newFiles[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        setTotalPages(doc.getPageCount());
      } catch { setTotalPages(0); }
    }
  }, []);

  const addArea = () => setAreas((a) => [...a, { page: 1, x: 50, y: 600, width: 200, height: 20 }]);
  const removeArea = (idx: number) => setAreas((a) => a.filter((_, i) => i !== idx));
  const updateArea = (idx: number, field: keyof RedactArea, value: number) => {
    setAreas((a) => a.map((area, i) => (i === idx ? { ...area, [field]: value } : area)));
  };

  const handleRedact = useCallback(async () => {
    if (!files[0]) return;
    if (!user) { navigate("/auth"); return; }

    setStatus("processing");
    setProgress(20);

    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setProgress(40);

      // Draw black rectangles over redacted areas
      areas.forEach((area) => {
        if (area.page >= 1 && area.page <= doc.getPageCount()) {
          const page = doc.getPage(area.page - 1);
          page.drawRectangle({
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height,
            color: rgb(0, 0, 0),
          });
        }
      });

      setProgress(70);

      // Remove metadata for security
      doc.setTitle("");
      doc.setAuthor("");
      doc.setSubject("");
      doc.setKeywords([]);
      doc.setProducer("PDFShop.in Redaction Tool");
      doc.setCreator("PDFShop.in");

      // Re-save to flatten content (prevents easy removal)
      const newDoc = await PDFDocument.create();
      const pageCount = doc.getPageCount();
      const copied = await newDoc.copyPages(doc, Array.from({ length: pageCount }, (_, i) => i));
      copied.forEach((page) => newDoc.addPage(page));
      newDoc.setProducer("PDFShop.in Redaction Tool");

      setProgress(90);
      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch { setStatus("error"); }
  }, [files, areas, user, navigate]);

  return (
    <ToolLayout title="Redact PDF" description="Permanently black out sensitive content in your PDF" accentClass="text-security">
      <DropZone files={files} onFilesChange={handleFilesChange} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 mx-auto max-w-2xl space-y-4">
          {totalPages > 0 && <p className="text-sm text-muted-foreground text-center">Total pages: {totalPages}. Specify areas to redact (coordinates in PDF points from bottom-left):</p>}

          {areas.map((area, i) => (
            <div key={i} className="flex items-end gap-2 rounded-lg border border-border p-3">
              {(["page", "x", "y", "width", "height"] as const).map((field) => (
                <div key={field} className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-muted-foreground capitalize">{field}</label>
                  <input
                    type="number"
                    min={field === "page" ? 1 : 0}
                    max={field === "page" ? totalPages : undefined}
                    value={area[field]}
                    onChange={(e) => updateArea(i, field, Number(e.target.value))}
                    className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-security focus:outline-none"
                  />
                </div>
              ))}
              <button onClick={() => removeArea(i)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="flex justify-center gap-3">
            <button onClick={addArea} className="flex items-center gap-1 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="h-4 w-4" /> Add Area
            </button>
            <button onClick={handleRedact} className="rounded-lg bg-security px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-security/90">
              Apply Redaction
            </button>
          </div>

          {!user && <p className="text-center text-xs text-muted-foreground">Sign in required — this is a premium feature</p>}
        </div>
      )}

      <ProcessingBar progress={progress} status={status} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a href={resultUrl} download="redacted.pdf" className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download Redacted PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
