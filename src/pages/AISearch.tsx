import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DropZone from "@/components/DropZone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Lock, Crown, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PLAN_PAGE_LIMITS: Record<string, number> = { basic: 2, pro: 50, business: 100 };

export default function AISearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [pdfText, setPdfText] = useState("");
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [userPlan, setUserPlan] = useState("free");

  const checkPlan = useCallback(async () => {
    if (!user) return "free";
    const { data } = await supabase.from("profiles").select("plan").eq("user_id", user.id).single();
    const plan = data?.plan || "free";
    setUserPlan(plan);
    return plan;
  }, [user]);

  const extractText = async (file: File, maxPages: number): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();
    const uint8 = new Uint8Array(arrayBuffer);
    const rawText = new TextDecoder("utf-8", { fatal: false }).decode(uint8);
    const textChunks: string[] = [];
    const regex = /\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(rawText)) !== null) {
      const chunk = match[1].replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
      if (chunk.trim().length > 2) textChunks.push(chunk.trim());
    }
    let extracted = textChunks.join(" ");
    if (extracted.length < 100) {
      extracted = rawText.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim();
    }
    const charsPerPage = Math.floor(extracted.length / Math.max(totalPages, 1));
    const pagesToProcess = Math.min(totalPages, maxPages);
    return extracted.slice(0, Math.max(charsPerPage * pagesToProcess, 3000));
  };

  const handleLoadPDF = async () => {
    if (!user) { navigate("/auth"); return; }
    if (files.length === 0) return;
    try {
      const plan = await checkPlan();
      if (plan === "free") { setShowUpgrade(true); return; }
      const maxPages = PLAN_PAGE_LIMITS[plan] || 2;
      const text = await extractText(files[0], maxPages);
      setPdfText(text);
      setPdfLoaded(true);
    } catch {
      toast({ title: "Error", description: "Failed to load PDF", variant: "destructive" });
    }
  };

  const handleSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-search", {
        body: { pdfText, query: query.trim() },
      });
      if (error) throw error;
      if (data?.error === "upgrade_required") { setShowUpgrade(true); setLoading(false); return; }
      if (data?.error) throw new Error(data.error);
      setResults(data.results);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Search failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isPaid = userPlan !== "free";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container max-w-3xl py-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Smart Search in PDF</h1>
            <p className="mt-2 text-muted-foreground">Search your PDF with AI-powered natural language queries</p>
            {!isPaid && (
              <Badge variant="secondary" className="mt-2">
                <Lock className="mr-1 h-3 w-3" /> Paid plan required
              </Badge>
            )}
          </div>

          {!pdfLoaded && (
            <>
              <DropZone files={files} onFilesChange={setFiles} accept=".pdf" multiple={false} />
              {files.length > 0 && (
                <div className="mt-4 text-center">
                  <Button size="lg" onClick={handleLoadPDF}>
                    <Search className="mr-2 h-4 w-4" /> Load PDF for Search
                  </Button>
                </div>
              )}
            </>
          )}

          {pdfLoaded && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Search: {files[0]?.name}</h3>
                </div>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="What are you looking for?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    disabled={loading}
                  />
                  <Button onClick={handleSearch} disabled={loading || !query.trim()}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {results && (
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                      {results}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => { setPdfLoaded(false); setFiles([]); setResults(null); setQuery(""); }}>
                    Load Different PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" /> Upgrade to use AI
            </DialogTitle>
            <DialogDescription>AI search requires a paid plan. Start at ₹99/month.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button className="flex-1" onClick={() => navigate("/pricing")}>View Plans</Button>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>Later</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
