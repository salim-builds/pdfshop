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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Languages, Sparkles, Lock, Crown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { recordFileHistory } from "@/hooks/useFileHistory";

const LANGUAGES = [
  "Hindi", "Spanish", "French", "German", "Chinese", "Japanese", "Korean",
  "Portuguese", "Arabic", "Russian", "Italian", "Dutch", "Turkish", "Bengali",
  "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada", "Malayalam", "Punjabi",
];

const PLAN_PAGE_LIMITS: Record<string, number> = { basic: 2, pro: 50, business: 100 };

export default function AITranslate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [translation, setTranslation] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("");
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

  const handleProcess = async () => {
    if (!user) { navigate("/auth"); return; }
    if (files.length === 0 || !targetLanguage) return;

    setProcessing(true);
    setProgress(10);
    setTranslation(null);

    try {
      const plan = await checkPlan();
      setProgress(20);
      if (plan === "free") { setShowUpgrade(true); setProcessing(false); return; }

      const maxPages = PLAN_PAGE_LIMITS[plan] || 2;
      const text = await extractText(files[0], maxPages);
      setProgress(40);

      const { data, error } = await supabase.functions.invoke("ai-translate", {
        body: { text, targetLanguage },
      });
      setProgress(90);

      if (error) throw error;
      if (data?.error === "upgrade_required") { setShowUpgrade(true); setProcessing(false); return; }
      if (data?.error) throw new Error(data.error);

      setTranslation(data.translation);
      await recordFileHistory("ai-translate", files[0].name, files[0].size);
      setProgress(100);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to translate", variant: "destructive" });
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
              <Languages className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">AI Translate PDF</h1>
            <p className="mt-2 text-muted-foreground">Translate your PDF content into any language using AI</p>
            {!isPaid && (
              <Badge variant="secondary" className="mt-2">
                <Lock className="mr-1 h-3 w-3" /> Paid plan required
              </Badge>
            )}
          </div>

          {!translation && (
            <>
              <DropZone files={files} onFilesChange={setFiles} accept=".pdf" multiple={false} />
              {files.length > 0 && !processing && (
                <div className="mt-6 space-y-4 text-center">
                  <div className="mx-auto max-w-xs">
                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="lg" onClick={handleProcess} disabled={!targetLanguage}>
                    <Languages className="mr-2 h-4 w-4" /> Translate to {targetLanguage || "..."}
                  </Button>
                  {userPlan === "basic" && (
                    <p className="text-xs text-muted-foreground">⚡ First 2 pages on Basic plan</p>
                  )}
                </div>
              )}
              {processing && (
                <div className="mt-6">
                  <ProcessingBar progress={progress} status="processing" message="Translating your PDF..." />
                </div>
              )}
            </>
          )}

          {translation && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Languages className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Translation ({targetLanguage})</h3>
                </div>
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                  {translation}
                </div>
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" onClick={() => { setTranslation(null); setFiles([]); }}>
                    Translate Another
                  </Button>
                  <Button variant="outline" onClick={() => {
                    navigator.clipboard.writeText(translation);
                    toast({ title: "Copied!", description: "Translation copied to clipboard" });
                  }}>
                    Copy Text
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
            <DialogDescription>AI translation requires a paid plan. Start at ₹99/month.</DialogDescription>
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
