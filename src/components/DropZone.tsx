import { useCallback, useState, type ReactNode } from "react";
import { Upload, X, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DropZoneProps {
  accept?: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  accentColor?: string;
  children?: ReactNode;
}

export default function DropZone({
  accept = ".pdf",
  multiple = false,
  files,
  onFilesChange,
  accentColor = "text-primary",
}: DropZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      onFilesChange(multiple ? [...files, ...dropped] : dropped.slice(0, 1));
    },
    [files, multiple, onFilesChange]
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      onFilesChange(multiple ? [...files, ...selected] : selected.slice(0, 1));
      e.target.value = "";
    },
    [files, multiple, onFilesChange]
  );

  const removeFile = (idx: number) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className={`h-12 w-12 ${accentColor} opacity-60`} />
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            Drag & drop your files here
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse
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

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            {files.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
              >
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(f.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
