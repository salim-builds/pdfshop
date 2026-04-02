import { useCallback, useState, useEffect, type ReactNode } from "react";
import { Upload, X, FileText, File } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DropZoneProps {
  accept?: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  accentColor?: string;
  children?: ReactNode;
  maxSizeMB?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function DropZone({
  accept = ".pdf",
  multiple = false,
  files,
  onFilesChange,
  accentColor = "text-primary",
  maxSizeMB = 20,
}: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [sizeError, setSizeError] = useState("");

  const validateAndAdd = useCallback((incoming: File[]) => {
    setSizeError("");
    const maxBytes = maxSizeMB * 1024 * 1024;
    const oversized = incoming.filter(f => f.size > maxBytes);
    if (oversized.length > 0) {
      setSizeError(`File${oversized.length > 1 ? "s" : ""} exceed ${maxSizeMB}MB limit: ${oversized.map(f => f.name).join(", ")}`);
      return;
    }
    onFilesChange(multiple ? [...files, ...incoming] : incoming.slice(0, 1));
  }, [files, multiple, onFilesChange, maxSizeMB]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      validateAndAdd(Array.from(e.dataTransfer.files));
    },
    [validateAndAdd]
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      validateAndAdd(Array.from(e.target.files || []));
      e.target.value = "";
    },
    [validateAndAdd]
  );

  const removeFile = (idx: number) => {
    onFilesChange(files.filter((_, i) => i !== idx));
    setSizeError("");
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 transition-all duration-200 ${
          dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/20"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <motion.div
          animate={{ scale: dragging ? 1.1 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <Upload className={`h-10 w-10 ${accentColor} opacity-50`} />
        </motion.div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground">
            {dragging ? "Drop your files here" : "Drag & drop your files here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse • Max {maxSizeMB}MB
          </p>
        </div>
        <label className="cursor-pointer rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          Select Files
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={handleSelect}
          />
        </label>
      </div>

      {sizeError && (
        <p className="mt-2 text-center text-sm text-destructive">{sizeError}</p>
      )}

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            {files.map((f, i) => (
              <motion.div
                key={`${f.name}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 hover:bg-muted/20 transition-colors"
              >
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(f.size)}
                    {f.type && <span className="ml-2 opacity-60">{f.type.split("/")[1]?.toUpperCase()}</span>}
                  </p>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
