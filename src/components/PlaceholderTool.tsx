import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import { useState } from "react";

interface PlaceholderToolProps {
  title: string;
  description: string;
  accentClass?: string;
  accept?: string;
}

export default function PlaceholderTool({ title, description, accentClass = "text-primary", accept = ".pdf" }: PlaceholderToolProps) {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <ToolLayout title={title} description={description} accentClass={accentClass}>
      <DropZone files={files} onFilesChange={setFiles} accept={accept} />
      {files.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            This tool requires a backend service for full functionality.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Enable Lovable Cloud to unlock PDF processing capabilities.
          </p>
        </div>
      )}
    </ToolLayout>
  );
}
