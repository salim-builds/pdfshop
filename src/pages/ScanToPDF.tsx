import { useState, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import ProcessingBar from "@/components/ProcessingBar";
import { Download, Camera, Upload, X, RotateCw } from "lucide-react";

export default function ScanToPDF() {
  const [images, setImages] = useState<{ file: File; preview: string; rotation: number }[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [enhanceContrast, setEnhanceContrast] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addImages = useCallback((files: FileList | null) => {
    if (!files) return;
    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      rotation: 0,
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

  const rotateImage = (idx: number) => {
    setImages(prev => prev.map((img, i) => i === idx ? { ...img, rotation: (img.rotation + 90) % 360 } : img));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    setImages(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  };

  const handleConvert = useCallback(async () => {
    if (images.length === 0) return;
    setStatus("processing");
    setProgress(5);

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

        // Handle rotation
        const rotation = images[i].rotation;
        const isRotated = rotation === 90 || rotation === 270;
        const pageW = isRotated ? img.height : img.width;
        const pageH = isRotated ? img.width : img.height;

        const page = doc.addPage([pageW, pageH]);

        if (rotation === 0) {
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        } else {
          // Apply rotation via page rotation
          page.setRotation({ type: "degrees" as any, angle: rotation } as any);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        }

        setProgress(5 + ((i + 1) / images.length) * 85);
      }

      doc.setProducer("PDFShop.in Scan to PDF");
      doc.setCreator("PDFShop.in");
      doc.setCreationDate(new Date());

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [images, enhanceContrast]);

  return (
    <ToolLayout title="Scan to PDF" description="Capture or upload images and convert them to PDF" accentClass="text-primary">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Camera className="h-4 w-4 text-primary" /> Take Photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Upload className="h-4 w-4" /> Upload Images
            </button>
          </div>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addImages(e.target.files)} />
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
        </div>

        {images.length > 0 && (
          <>
            <p className="mt-4 text-center text-sm text-muted-foreground">{images.length} image{images.length > 1 ? "s" : ""} selected</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative group rounded-lg border border-border overflow-hidden bg-muted/20">
                  <img
                    src={img.preview}
                    alt={`Scan ${i + 1}`}
                    className="w-full h-32 object-cover"
                    style={{ transform: `rotate(${img.rotation}deg)` }}
                  />
                  <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => rotateImage(i)} className="rounded-full bg-background/80 p-1.5 hover:bg-background">
                      <RotateCw className="h-3.5 w-3.5 text-foreground" />
                    </button>
                    <button onClick={() => removeImage(i)} className="rounded-full bg-background/80 p-1.5 hover:bg-destructive/80 hover:text-destructive-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-xs font-medium text-foreground">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {images.length > 0 && status === "idle" && (
          <div className="mt-4 text-center">
            <button onClick={handleConvert} className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Create PDF ({images.length} image{images.length > 1 ? "s" : ""})
            </button>
          </div>
        )}
      </div>

      <ProcessingBar progress={progress} status={status} message={status === "processing" ? "Building PDF from images..." : undefined} />

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
