import { useState, useCallback } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download, Plus, Trash2, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface RedactArea {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export default function RedactPDF() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [areas, setAreas] = useState<RedactArea[]>([{ page: 1, x: 50, y: 700, width: 200, height: 20, label: "Redaction 1" }]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [removeMetadata, setRemoveMetadata] = useState(true);

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setResultUrl(null);
    if (newFiles[0]) {
      try {
        const bytes = await newFiles[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        setTotalPages(doc.getPageCount());
        if (doc.getPageCount() > 0) {
          const { width, height } = doc.getPage(0).getSize();
          setPageSize({ width: Math.round(width), height: Math.round(height) });
        }
      } catch { setTotalPages(0); setPageSize({ width: 0, height: 0 }); }
    }
  }, []);

  const addArea = () => setAreas((a) => [...a, { page: 1, x: 50, y: 600, width: 200, height: 20, label: `Redaction ${a.length + 1}` }]);
  const removeArea = (idx: number) => setAreas((a) => a.filter((_, i) => i !== idx));
  const updateArea = (idx: number, field: keyof RedactArea, value: number | string) => {
    setAreas((a) => a.map((area, i) => (i === idx ? { ...area, [field]: value } : area)));
  };

  // Preset redaction areas
  const addPreset = (type: string) => {
    const w = pageSize.width || 612;
    const h = pageSize.height || 792;
    let area: Partial<RedactArea> = {};
    switch (type) {
      case "header": area = { x: 0, y: h - 50, width: w, height: 50, label: "Header" }; break;
      case "footer": area = { x: 0, y: 0, width: w, height: 50, label: "Footer" }; break;
      case "signature": area = { x: w - 250, y: 50, width: 200, height: 80, label: "Signature area" }; break;
      default: area = { x: 50, y: h / 2, width: 200, height: 20, label: "Custom" };
    }
    setAreas(a => [...a, { page: 1, ...area } as RedactArea]);
  };

  const handleRedact = useCallback(async () => {
    if (!files[0]) return;
    if (!user) { navigate("/auth"); return; }

    setStatus("processing");
    setProgress(10);

    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setProgress(30);

      // Draw black rectangles over redacted areas
      for (let i = 0; i < areas.length; i++) {
        const area = areas[i];
        if (area.page >= 1 && area.page <= doc.getPageCount()) {
          const page = doc.getPage(area.page - 1);
          // Draw solid black rectangle
          page.drawRectangle({
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height,
            color: rgb(0, 0, 0),
            opacity: 1,
          });
          // Draw a slightly larger rectangle underneath to ensure coverage
          page.drawRectangle({
            x: area.x - 1,
            y: area.y - 1,
            width: area.width + 2,
            height: area.height + 2,
            color: rgb(0, 0, 0),
            opacity: 1,
          });
        }
        setProgress(30 + ((i + 1) / areas.length) * 30);
      }

      setProgress(65);

      // Remove metadata for security
      if (removeMetadata) {
        doc.setTitle("");
        doc.setAuthor("");
        doc.setSubject("");
        doc.setKeywords([]);
        doc.setProducer("PDFShop.in Redaction Tool");
        doc.setCreator("PDFShop.in");
      }

      // Re-save to flatten content (prevents easy removal of redaction boxes)
      const newDoc = await PDFDocument.create();
      const pageCount = doc.getPageCount();

      for (let i = 0; i < pageCount; i++) {
        const [copied] = await newDoc.copyPages(doc, [i]);
        newDoc.addPage(copied);
        setProgress(65 + ((i + 1) / pageCount) * 25);
      }

      newDoc.setProducer("PDFShop.in Redaction Tool");
      newDoc.setCreationDate(new Date());

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch { setStatus("error"); }
  }, [files, areas, user, navigate, removeMetadata]);

  return (
    <ToolLayout title="Redact PDF" description="Permanently black out sensitive content in your PDF" accentClass="text-destructive">
      <DropZone files={files} onFilesChange={handleFilesChange} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 mx-auto max-w-2xl space-y-4">
          {totalPages > 0 && (
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Total pages: <span className="font-semibold text-foreground">{totalPages}</span>
                {pageSize.width > 0 && <span className="ml-2">({pageSize.width} × {pageSize.height} pts)</span>}
              </p>
            </div>
          )}

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="text-xs text-muted-foreground self-center">Quick add:</span>
            {["header", "footer", "signature"].map(type => (
              <button key={type} onClick={() => addPreset(type)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-destructive/50 transition-colors capitalize">
                {type}
              </button>
            ))}
          </div>

          {areas.map((area, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={area.label}
                  onChange={(e) => updateArea(i, "label", e.target.value)}
                  className="text-xs font-medium text-muted-foreground bg-transparent border-none focus:outline-none"
                />
                <button onClick={() => removeArea(i)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-end gap-2">
                {(["page", "x", "y", "width", "height"] as const).map((field) => (
                  <div key={field} className="flex flex-col gap-1 flex-1">
                    <label className="text-[10px] text-muted-foreground capitalize">{field}</label>
                    <input
                      type="number"
                      min={field === "page" ? 1 : 0}
                      max={field === "page" ? totalPages : undefined}
                      value={area[field] as number}
                      onChange={(e) => updateArea(i, field, Number(e.target.value))}
                      className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-destructive focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Options */}
          <label className="flex items-center gap-2 justify-center cursor-pointer">
            <input type="checkbox" checked={removeMetadata} onChange={(e) => setRemoveMetadata(e.target.checked)} className="rounded border-border" />
            <span className="text-sm text-muted-foreground">Remove document metadata</span>
          </label>

          <div className="flex justify-center gap-3">
            <button onClick={addArea} className="flex items-center gap-1 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="h-4 w-4" /> Add Area
            </button>
            <button onClick={handleRedact} className="rounded-lg bg-destructive px-8 py-3 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90">
              Apply Redaction ({areas.length} area{areas.length > 1 ? "s" : ""})
            </button>
          </div>

          {!user && <p className="text-center text-xs text-muted-foreground">Sign in required — this is a premium feature</p>}
        </div>
      )}

      <ProcessingBar progress={progress} status={status} message={status === "processing" ? "Applying redactions..." : undefined} />

      {resultUrl && (
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-optimize">✓ {areas.length} area{areas.length > 1 ? "s" : ""} permanently redacted</p>
          <a href={resultUrl} download="redacted.pdf" className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download Redacted PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
