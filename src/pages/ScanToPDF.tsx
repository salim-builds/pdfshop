import { useState, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import ProcessingBar from "@/components/ProcessingBar";
import { Download, Camera, Upload, X, Image } from "lucide-react";

export default function ScanToPDF() {
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addImages = useCallback((files: FileList | null) => {
    if (!files) return;
    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
    setStatus("idle");
    setResultUrl(null);
  }, []);

  const removeImage = (idx: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleConvert = useCallback(async () => {
    if (images.length === 0) return;
    setStatus("processing");
    setProgress(10);

    try {
      const doc = await PDFDocument.create();

      for (let i = 0; i < images.length; i++) {
        const bytes = await images[i].file.arrayBuffer();
        const type = images[i].file.type;

        let img;
        if (type === "image/png") {
          img = await doc.embedPng(bytes);
        } else {
          img = await doc.embedJpg(bytes);
        }

        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        setProgress(10 + ((i + 1) / images.length) * 80);
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [images]);

  return (
    <ToolLayout title="Scan to PDF" description="Capture or upload images and convert them to PDF" accentClass="text-convert-to">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Camera className="h-4 w-4 text-convert-to" /> Take Photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-convert-to px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-convert-to/90"
            >
              <Upload className="h-4 w-4" /> Upload Images
            </button>
          </div>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addImages(e.target.files)} />
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
        </div>

        {images.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative group rounded-lg border border-border overflow-hidden">
                <img src={img.preview} alt={`Scan ${i + 1}`} className="w-full h-32 object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 rounded-full bg-background/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-foreground" />
                </button>
                <div className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-xs text-foreground">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length > 0 && status === "idle" && (
          <div className="mt-4 text-center">
            <button onClick={handleConvert} className="rounded-lg bg-convert-to px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-convert-to/90">
              Create PDF ({images.length} image{images.length > 1 ? "s" : ""})
            </button>
          </div>
        )}
      </div>

      <ProcessingBar progress={progress} status={status} />

      {resultUrl && (
        <div className="mt-6 text-center">
          <a href={resultUrl} download="scanned.pdf" className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
