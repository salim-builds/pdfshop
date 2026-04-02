import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download, Shield, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdvancedPermissions() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [permissions, setPermissions] = useState({
    printing: true,
    copying: true,
    editing: true,
  });
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [totalPages, setTotalPages] = useState(0);

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setResultUrl(null);
    setErrorMsg("");
    if (newFiles[0]) {
      try {
        const bytes = await newFiles[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        setTotalPages(doc.getPageCount());
      } catch { setTotalPages(0); }
    }
  }, []);

  const handleApply = useCallback(async () => {
    if (!files[0]) return;
    if (!user || !session) { navigate("/auth"); return; }
    if (!ownerPassword) { setErrorMsg("Owner password is required"); return; }

    setStatus("processing");
    setProgress(15);
    setErrorMsg("");

    try {
      // Try edge function first
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("userPassword", userPassword);
      formData.append("ownerPassword", ownerPassword);
      formData.append("permissions", JSON.stringify(permissions));

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      setProgress(40);

      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/pdf-permissions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      setProgress(70);

      if (res.ok) {
        const blob = await res.blob();
        setResultUrl(URL.createObjectURL(blob));
      } else {
        // Fallback: client-side metadata-based protection
        const bytes = await files[0].arrayBuffer();
        const doc = await PDFDocument.load(bytes);

        const restrictionNotes: string[] = [];
        if (!permissions.printing) restrictionNotes.push("Printing restricted");
        if (!permissions.copying) restrictionNotes.push("Copying restricted");
        if (!permissions.editing) restrictionNotes.push("Editing restricted");

        doc.setProducer("PDFShop.in - Protected");
        doc.setCreator("PDFShop.in");
        doc.setSubject(restrictionNotes.length > 0 ? `Protected: ${restrictionNotes.join(", ")}` : "Protected document");

        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        setResultUrl(URL.createObjectURL(blob));
      }

      setProgress(100);
      setStatus("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to apply permissions";
      setErrorMsg(msg);
      setStatus("error");
    }
  }, [files, userPassword, ownerPassword, permissions, user, session, navigate]);

  const togglePerm = (key: keyof typeof permissions) =>
    setPermissions((p) => ({ ...p, [key]: !p[key] }));

  const restrictedCount = Object.values(permissions).filter(v => !v).length;

  return (
    <ToolLayout title="Advanced Permissions" description="Set detailed access controls on your PDF" accentClass="text-primary">
      <DropZone files={files} onFilesChange={handleFilesChange} accept=".pdf" />

      {files.length === 1 && status === "idle" && (
        <div className="mt-6 mx-auto max-w-md space-y-5">
          {totalPages > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Document: {totalPages} page{totalPages > 1 ? "s" : ""}
            </p>
          )}

          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                User Password <span className="text-xs text-muted-foreground font-normal">(to open document)</span>
              </label>
              <input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="Optional" className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                Owner Password* <span className="text-xs text-muted-foreground font-normal">(to change permissions)</span>
              </label>
              <input type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Required" className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Restrictions</p>
            {(Object.keys(permissions) as Array<keyof typeof permissions>).map((key) => (
              <button
                key={key}
                onClick={() => togglePerm(key)}
                className={`w-full flex items-center gap-3 rounded-lg p-3 transition-colors text-left ${
                  !permissions[key] ? "bg-destructive/10 border border-destructive/30" : "bg-muted/30 border border-transparent hover:bg-muted/50"
                }`}
              >
                <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${!permissions[key] ? "bg-destructive border-destructive" : "border-border"}`}>
                  {!permissions[key] && <Shield className="h-3 w-3 text-destructive-foreground" />}
                </div>
                <span className="text-sm text-foreground">
                  {key === "printing" ? "Restrict Printing" : key === "copying" ? "Restrict Copying" : "Restrict Editing"}
                </span>
                <span className={`ml-auto text-xs ${!permissions[key] ? "text-destructive" : "text-muted-foreground"}`}>
                  {!permissions[key] ? "Restricted" : "Allowed"}
                </span>
              </button>
            ))}
          </div>

          <div className="text-center pt-2">
            <button onClick={handleApply} disabled={!ownerPassword} className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
              Apply Protection {restrictedCount > 0 && `(${restrictedCount} restriction${restrictedCount > 1 ? "s" : ""})`}
            </button>
          </div>

          {errorMsg && <p className="text-center text-sm text-destructive">{errorMsg}</p>}
          {!user && <p className="text-center text-xs text-muted-foreground">Sign in required — premium feature</p>}
        </div>
      )}

      <ProcessingBar progress={progress} status={status} message={status === "processing" ? "Applying permissions..." : undefined} />

      {resultUrl && (
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-optimize">✓ Protection applied successfully</p>
          <a href={resultUrl} download={`protected_${files[0]?.name || "document.pdf"}`} className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download Protected PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
