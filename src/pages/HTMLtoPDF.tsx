import { useState, useCallback } from "react";
import ToolLayout from "@/components/ToolLayout";
import ProcessingBar from "@/components/ProcessingBar";
import { Download, Globe, Code } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function HTMLtoPDF() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"url" | "html">("url");
  const [urlInput, setUrlInput] = useState("");
  const [htmlInput, setHtmlInput] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConvert = useCallback(async () => {
    const input = mode === "url" ? urlInput.trim() : htmlInput.trim();
    if (!input) return;
    if (!user || !session) { navigate("/auth"); return; }

    setStatus("processing");
    setProgress(20);
    setErrorMsg("");

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/html-to-pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode, input }),
      });

      setProgress(70);
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("done");
    } catch (err: any) {
      setErrorMsg(err.message || "Conversion failed");
      setStatus("error");
    }
  }, [mode, urlInput, htmlInput, user, session, navigate]);

  return (
    <ToolLayout title="HTML to PDF" description="Convert HTML content or a webpage to PDF" accentClass="text-convert-to">
      <div className="mx-auto max-w-2xl">
        <div className="flex gap-2 justify-center mb-6">
          <button onClick={() => setMode("url")} className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${mode === "url" ? "border-convert-to bg-convert-to/10 text-convert-to" : "border-border text-muted-foreground hover:text-foreground"}`}>
            <Globe className="h-4 w-4" /> URL
          </button>
          <button onClick={() => setMode("html")} className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${mode === "html" ? "border-convert-to bg-convert-to/10 text-convert-to" : "border-border text-muted-foreground hover:text-foreground"}`}>
            <Code className="h-4 w-4" /> HTML Code
          </button>
        </div>

        {mode === "url" ? (
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-convert-to focus:outline-none focus:ring-1 focus:ring-convert-to"
          />
        ) : (
          <textarea
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
            placeholder="<html><body><h1>Hello World</h1></body></html>"
            rows={10}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:border-convert-to focus:outline-none focus:ring-1 focus:ring-convert-to resize-y"
          />
        )}

        {status === "idle" && (
          <div className="mt-6 text-center">
            <button
              onClick={handleConvert}
              disabled={mode === "url" ? !urlInput.trim() : !htmlInput.trim()}
              className="rounded-lg bg-convert-to px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-convert-to/90 disabled:opacity-50"
            >
              Convert to PDF
            </button>
          </div>
        )}
      </div>

      <ProcessingBar progress={progress} status={status} />
      {errorMsg && <p className="mt-4 text-center text-sm text-destructive">{errorMsg}</p>}

      {resultUrl && (
        <div className="mt-6 text-center">
          <a href={resultUrl} download="converted.pdf" className="inline-flex items-center gap-2 rounded-lg bg-optimize px-8 py-3 text-sm font-semibold text-background transition-colors hover:bg-optimize/90">
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      )}
    </ToolLayout>
  );
}
