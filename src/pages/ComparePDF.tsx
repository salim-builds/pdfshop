import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// Simple text extraction from PDF using pdf-lib (basic - gets embedded text)
async function extractTextFromPDF(file: File): Promise<string[]> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const pages: string[] = [];
  for (let i = 0; i < doc.getPageCount(); i++) {
    // pdf-lib doesn't extract text directly; we use a basic content stream approach
    // For real text extraction, this would use pdf-parse on the backend
    pages.push(`[Page ${i + 1} content]`);
  }
  return pages;
}

// Use edge function for actual text extraction and comparison
async function compareViaEdgeFunction(file1: File, file2: File, token: string): Promise<{ differences: Array<{ page: number; text1: string; text2: string; type: string }> }> {
  const formData = new FormData();
  formData.append("file1", file1);
  formData.append("file2", file2);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/compare-pdf`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function ComparePDF() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [file1, setFile1] = useState<File[]>([]);
  const [file2, setFile2] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [differences, setDifferences] = useState<Array<{ page: number; text1: string; text2: string; type: string }>>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCompare = useCallback(async () => {
    if (!file1[0] || !file2[0]) return;
    if (!user || !session) { navigate("/auth"); return; }

    setStatus("processing");
    setProgress(20);
    setErrorMsg("");

    try {
      const result = await compareViaEdgeFunction(file1[0], file2[0], session.access_token);
      setProgress(90);
      setDifferences(result.differences);
      setProgress(100);
      setStatus("done");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to compare PDFs");
      setStatus("error");
    }
  }, [file1, file2, user, session, navigate]);

  return (
    <ToolLayout title="Compare PDF" description="Upload 2 PDFs and see the differences" accentClass="text-edit">
      <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-medium text-foreground mb-2 text-center">First PDF</p>
          <DropZone files={file1} onFilesChange={(f) => { setFile1(f); setStatus("idle"); setDifferences([]); }} accept=".pdf" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground mb-2 text-center">Second PDF</p>
          <DropZone files={file2} onFilesChange={(f) => { setFile2(f); setStatus("idle"); setDifferences([]); }} accept=".pdf" />
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

      <ProcessingBar progress={progress} status={status} />
      {errorMsg && <p className="mt-4 text-center text-sm text-destructive">{errorMsg}</p>}

      {differences.length > 0 && (
        <div className="mt-6 mx-auto max-w-4xl space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Differences Found: {differences.length}</h3>
          {differences.map((d, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Page {d.page} — {d.type}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded bg-destructive/10 p-2 text-sm text-foreground"><span className="text-xs text-destructive font-medium block mb-1">PDF 1</span>{d.text1}</div>
                <div className="rounded bg-optimize/10 p-2 text-sm text-foreground"><span className="text-xs text-optimize font-medium block mb-1">PDF 2</span>{d.text2}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {status === "done" && differences.length === 0 && (
        <div className="mt-6 mx-auto max-w-2xl rounded-lg bg-optimize/10 p-4 text-center text-sm text-optimize">
          No differences found! The PDFs appear identical.
        </div>
      )}
    </ToolLayout>
  );
}
