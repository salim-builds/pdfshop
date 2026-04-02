import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Download, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ComparePDF() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [file1, setFile1] = useState<File[]>([]);
  const [file2, setFile2] = useState<File[]>([]);
  const [file1Pages, setFile1Pages] = useState(0);
  const [file2Pages, setFile2Pages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [differences, setDifferences] = useState<Array<{
    page: number;
    text1: string;
    text2: string;
    type: string;
    changes?: Array<{ type: "added" | "removed" | "unchanged"; text: string }>;
  }>>([]);
  const [summary, setSummary] = useState<{ totalPages1: number; totalPages2: number; pagesWithDifferences: number; identicalPages: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadPageCount = async (file: File): Promise<number> => {
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      return doc.getPageCount();
    } catch { return 0; }
  };

  const handleFile1Change = useCallback(async (f: File[]) => {
    setFile1(f);
    setStatus("idle");
    setDifferences([]);
    setSummary(null);
    if (f[0]) setFile1Pages(await loadPageCount(f[0]));
  }, []);

  const handleFile2Change = useCallback(async (f: File[]) => {
    setFile2(f);
    setStatus("idle");
    setDifferences([]);
    setSummary(null);
    if (f[0]) setFile2Pages(await loadPageCount(f[0]));
  }, []);

  const handleCompare = useCallback(async () => {
    if (!file1[0] || !file2[0]) return;
    if (!user || !session) { navigate("/auth"); return; }

    setStatus("processing");
    setProgress(20);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file1", file1[0]);
      formData.append("file2", file2[0]);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/compare-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      setProgress(80);
      if (!res.ok) throw new Error(await res.text());

      const result = await res.json();
      setDifferences(result.differences || []);
      setSummary(result.summary || null);
      setProgress(100);
      setStatus("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to compare PDFs";
      setErrorMsg(msg);
      setStatus("error");
    }
  }, [file1, file2, user, session, navigate]);

  return (
    <ToolLayout title="Compare PDF" description="Upload 2 PDFs and see the differences highlighted" accentClass="text-edit">
      <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-medium text-foreground mb-2 text-center">First PDF</p>
          <DropZone files={file1} onFilesChange={handleFile1Change} accept=".pdf" />
          {file1Pages > 0 && <p className="text-xs text-muted-foreground text-center mt-1">{file1Pages} pages</p>}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground mb-2 text-center">Second PDF</p>
          <DropZone files={file2} onFilesChange={handleFile2Change} accept=".pdf" />
          {file2Pages > 0 && <p className="text-xs text-muted-foreground text-center mt-1">{file2Pages} pages</p>}
        </div>
      </div>

      {file1.length === 1 && file2.length === 1 && status === "idle" && (
        <div className="mt-6 text-center">
          <button onClick={handleCompare} className="rounded-lg bg-edit px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-edit/90">
            Compare PDFs
          </button>
          {!user && <p className="mt-2 text-xs text-muted-foreground">Sign in required for this premium feature</p>}
        </div>
      )}

      <ProcessingBar progress={progress} status={status} message={status === "processing" ? "Comparing documents..." : undefined} />
      {errorMsg && <p className="mt-4 text-center text-sm text-destructive">{errorMsg}</p>}

      {/* Summary */}
      {summary && (
        <div className="mt-6 mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "PDF 1 Pages", value: summary.totalPages1 },
            { label: "PDF 2 Pages", value: summary.totalPages2 },
            { label: "Different Pages", value: summary.pagesWithDifferences, highlight: true },
            { label: "Identical Pages", value: summary.identicalPages },
          ].map(item => (
            <div key={item.label} className={`rounded-lg border p-3 text-center ${item.highlight && item.value > 0 ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
              <p className={`text-2xl font-bold ${item.highlight && item.value > 0 ? "text-destructive" : "text-foreground"}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {differences.length > 0 && (
        <div className="mt-6 mx-auto max-w-4xl space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {differences.length} Difference{differences.length > 1 ? "s" : ""} Found
          </h3>
          {differences.map((d, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">Page {d.page}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  d.type === "added" ? "bg-optimize/10 text-optimize" :
                  d.type === "removed" ? "bg-destructive/10 text-destructive" :
                  "bg-primary/10 text-primary"
                }`}>{d.type}</span>
              </div>

              {/* Word-level diff if available */}
              {d.changes && d.changes.length > 0 && (
                <div className="rounded-lg bg-muted/30 p-3 text-sm leading-relaxed">
                  {d.changes.map((c, j) => (
                    <span key={j} className={
                      c.type === "added" ? "bg-optimize/20 text-optimize px-0.5 rounded" :
                      c.type === "removed" ? "bg-destructive/20 text-destructive line-through px-0.5 rounded" :
                      "text-foreground"
                    }>
                      {c.text}{" "}
                    </span>
                  ))}
                </div>
              )}

              {/* Fallback side-by-side */}
              {(!d.changes || d.changes.length === 0) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded bg-destructive/10 p-2 text-sm text-foreground">
                    <span className="text-xs text-destructive font-medium block mb-1">PDF 1</span>
                    {d.text1}
                  </div>
                  <div className="rounded bg-optimize/10 p-2 text-sm text-foreground">
                    <span className="text-xs text-optimize font-medium block mb-1">PDF 2</span>
                    {d.text2}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {status === "done" && differences.length === 0 && (
        <div className="mt-6 mx-auto max-w-2xl rounded-lg bg-optimize/10 p-4 text-center text-sm text-optimize flex items-center justify-center gap-2">
          <CheckCircle className="h-5 w-5" />
          No differences found! The PDFs appear identical.
        </div>
      )}
    </ToolLayout>
  );
}
