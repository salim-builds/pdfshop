import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DropZone from "@/components/DropZone";
import ProcessingBar from "@/components/ProcessingBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Brain, Sparkles, Lock, Zap, Crown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { recordFileHistory } from "@/hooks/useFileHistory";

export default function AISummary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const checkPlan = useCallback(async () => {
    if (!user) return false;
    const { data } = await supabase.from("profiles").select("plan").eq("user_id", user.id).single();
    const premium = data?.plan === "pro" || data?.plan === "business";
    setIsPremium(premium);
    return premium;
  }, [user]);

  const extractTextFromPDF = async (file: File, maxPages: number): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();
    const pagesToProcess = Math.min(totalPages, maxPages);

    // pdf-lib doesn't extract text; we read raw content streams
    // Use a simpler approach: extract bytes and decode
    const uint8 = new Uint8Array(arrayBuffer);
    const rawText = new TextDecoder("utf-8", { fatal: false }).decode(uint8);

    // Extract readable text segments between BT/ET markers or plain text
    const textChunks: string[] = [];
    const regex = /\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(rawText)) !== null) {
      const chunk = match[1].replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
      if (chunk.trim().length > 2) textChunks.push(chunk.trim());
    }

    let extracted = textChunks.join(" ");

    // If text extraction is minimal, use raw readable characters
    if (extracted.length < 100) {
      extracted = rawText.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim();
    }

    // Limit to approximate first N pages worth of text
    const charsPerPage = Math.floor(extracted.length / Math.max(totalPages, 1));
    const maxChars = charsPerPage * pagesToProcess;
    return extracted.slice(0, Math.max(maxChars, 3000));
  };

  const handleProcess = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (files.length === 0) return;

    setProcessing(true);
    setProgress(10);
    setSummary(null);

    try {
      const premium = await checkPlan();
      setProgress(20);

      const maxPages = premium ? 50 : 2;
      const text = await extractTextFromPDF(files[0], maxPages);
      setProgress(40);

      if (!premium) {
        // Artificial delay for free users
        await new Promise((r) => setTimeout(r, 3000));
      }
      setProgress(60);

      const { data, error } = await supabase.functions.invoke("ai-summary", {
        body: { text, isPremium: premium },
      });

      setProgress(90);

      if (error) throw error;
      if (data?.error === "limit_reached") {
        setShowUpgrade(true);
        setProcessing(false);
        return;
      }
      if (data?.error) throw new Error(data.error);

      setSummary(data.summary);
      await recordFileHistory("ai-summary", files[0].name, files[0].size);
      setProgress(100);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate summary", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container max-w-3xl py-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">AI PDF Summary</h1>
            <p className="mt-2 text-muted-foreground">Get a concise, AI-powered summary of your PDF</p>
            {!isPremium && (
              <Badge variant="secondary" className="mt-2">
                <Zap className="mr-1 h-3 w-3" /> Free: 3 summaries/day · First 2 pages
              </Badge>
            )}
          </div>

          {!summary && (
            <>
              <DropZone files={files} onFilesChange={setFiles} accept=".pdf" multiple={false} />
              {files.length > 0 && !processing && (
                <div className="mt-4 text-center">
                  <Button size="lg" onClick={handleProcess}>
                    <Sparkles className="mr-2 h-4 w-4" /> Generate Summary
                  </Button>
                  {!isPremium && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      ⚡ Processing first 2 pages for faster results
                    </p>
                  )}
                </div>
              )}
              {processing && (
                <div className="mt-6">
                  <ProcessingBar progress={progress} label={!isPremium ? "Processing first 2 pages for faster results..." : "Analyzing your PDF..."} />
                </div>
              )}
            </>
          )}

          {summary && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">AI Summary</h3>
                </div>
                <div className={`prose prose-sm max-w-none text-foreground ${!isPremium ? "relative" : ""}`}>
                  <div className="whitespace-pre-wrap">{summary}</div>
                  {!isPremium && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-2">
                      <Button variant="outline" size="sm" onClick={() => setShowUpgrade(true)}>
                        <Crown className="mr-1 h-3 w-3" /> Unlock full PDF analysis with Premium
                      </Button>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" onClick={() => { setSummary(null); setFiles([]); }}>
                    Summarize Another
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
              <Crown className="h-5 w-5 text-primary" /> Upgrade to Premium
            </DialogTitle>
            <DialogDescription>Unlock the full power of AI PDF tools</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" /> Unlimited AI summaries</div>
            <div className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" /> Unlimited AI chat</div>
            <div className="flex items-center gap-2 text-sm"><Zap className="h-4 w-4 text-primary" /> Faster processing (no delay)</div>
            <div className="flex items-center gap-2 text-sm"><Lock className="h-4 w-4 text-primary" /> Full document analysis (all pages)</div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => navigate("/dashboard")}>
              View Plans — ₹199/mo
            </Button>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>Later</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
