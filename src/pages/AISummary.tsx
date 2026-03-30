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

const PLAN_PAGE_LIMITS: Record<string, number> = {
  basic: 2,
  pro: 50,
  business: 100,
};

export default function AISummary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [userPlan, setUserPlan] = useState("free");
  const [usageInfo, setUsageInfo] = useState<{ summaries_used: number; summaries_limit: number } | null>(null);

  const checkPlan = useCallback(async () => {
    if (!user) return "free";
    const { data } = await supabase.from("profiles").select("plan").eq("user_id", user.id).single();
    const plan = data?.plan || "free";
    setUserPlan(plan);
    return plan;
  }, [user]);

  const extractTextFromPDF = async (file: File, maxPages: number): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();
    const pagesToProcess = Math.min(totalPages, maxPages);

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
      const plan = await checkPlan();
      setProgress(20);

      if (plan === "free") {
        setShowUpgrade(true);
        setProcessing(false);
        return;
      }

      const maxPages = PLAN_PAGE_LIMITS[plan] || 2;
      const text = await extractTextFromPDF(files[0], maxPages);
      setProgress(40);

      if (plan === "basic") {
        await new Promise((r) => setTimeout(r, 2000));
      }
      setProgress(60);

      const { data, error } = await supabase.functions.invoke("ai-summary", {
        body: { text },
      });

      setProgress(90);

      if (error) throw error;
      if (data?.error === "upgrade_required") {
        setShowUpgrade(true);
        setProcessing(false);
        return;
      }
      if (data?.error === "limit_reached") {
        setShowUpgrade(true);
        setProcessing(false);
        return;
      }
      if (data?.error) throw new Error(data.error);

      setSummary(data.summary);
      if (data.usage) setUsageInfo(data.usage);
      await recordFileHistory("ai-summary", files[0].name, files[0].size);
      setProgress(100);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate summary", variant: "destructive" });
    } finally {
      setProcessing(false);
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
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">AI PDF Summary</h1>
            <p className="mt-2 text-muted-foreground">Get a concise, AI-powered summary of your PDF</p>
            {!isPaid && (
              <Badge variant="secondary" className="mt-2">
                <Lock className="mr-1 h-3 w-3" /> Paid plan required
              </Badge>
            )}
            {isPaid && usageInfo && (
              <Badge variant="secondary" className="mt-2">
                <Zap className="mr-1 h-3 w-3" /> {usageInfo.summaries_limit - usageInfo.summaries_used} summaries left today
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
                  {userPlan === "basic" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      ⚡ Processing first 2 pages on Basic plan
                    </p>
                  )}
                </div>
              )}
              {processing && (
                <div className="mt-6">
                  <ProcessingBar progress={progress} status="processing" message={userPlan === "basic" ? "Processing first 2 pages..." : "Analyzing your PDF..."} />
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
                  {usageInfo && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {usageInfo.summaries_limit - usageInfo.summaries_used} left today
                    </Badge>
                  )}
                </div>
                <div className="prose prose-sm max-w-none text-foreground">
                  <div className="whitespace-pre-wrap">{summary}</div>
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
              <Crown className="h-5 w-5 text-primary" /> {userPlan === "free" ? "Upgrade to use AI" : "Upgrade for more"}
            </DialogTitle>
            <DialogDescription>
              {userPlan === "free"
                ? "AI features require a paid plan. Start with AI Basic at ₹99/month."
                : "You've reached your daily limit. Upgrade for more AI usage."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" /> AI-powered PDF summaries</div>
            <div className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" /> AI chat with PDFs</div>
            <div className="flex items-center gap-2 text-sm"><Zap className="h-4 w-4 text-primary" /> Fast processing</div>
            <div className="flex items-center gap-2 text-sm"><Lock className="h-4 w-4 text-primary" /> Full document analysis</div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => navigate("/pricing")}>
              View Plans
            </Button>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>Later</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
