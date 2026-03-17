import { useState, useCallback, useRef, useEffect } from "react";
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
import { MessageCircle, Send, Crown, Zap, Sparkles, Lock, Bot, User as UserIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AIChatPDF() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [pdfText, setPdfText] = useState<string>("");
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkPlan = useCallback(async () => {
    if (!user) return false;
    const { data } = await supabase.from("profiles").select("plan").eq("user_id", user.id).single();
    const premium = data?.plan === "pro" || data?.plan === "business";
    setIsPremium(premium);
    return premium;
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
      const premium = await checkPlan();
      const maxPages = premium ? 50 : 2;
      const text = await extractText(files[0], maxPages);
      setPdfText(text);
      setPdfLoaded(true);
      setMessages([{ role: "assistant", content: `PDF loaded: **${files[0].name}**. Ask me anything about this document!` }]);
    } catch (e: any) {
      toast({ title: "Error", description: "Failed to load PDF", variant: "destructive" });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      if (!isPremium) {
        await new Promise((r) => setTimeout(r, 3000));
      }

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { pdfText, question, isPremium },
      });

      if (error) throw error;
      if (data?.error === "limit_reached") {
        setShowUpgrade(true);
        setLoading(false);
        return;
      }
      if (data?.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to get answer", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container max-w-3xl py-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">AI Chat with PDF</h1>
            <p className="mt-2 text-muted-foreground">Ask questions about your PDF and get instant answers</p>
            {!isPremium && (
              <Badge variant="secondary" className="mt-2">
                <Zap className="mr-1 h-3 w-3" /> Free: 1 chat/day · First 2 pages
              </Badge>
            )}
          </div>

          {!pdfLoaded && (
            <>
              <DropZone files={files} onFilesChange={setFiles} accept=".pdf" multiple={false} />
              {files.length > 0 && (
                <div className="mt-4 text-center">
                  <Button size="lg" onClick={handleLoadPDF}>
                    <MessageCircle className="mr-2 h-4 w-4" /> Start Chat
                  </Button>
                  {!isPremium && (
                    <p className="mt-2 text-xs text-muted-foreground">⚡ Processing first 2 pages for faster results</p>
                  )}
                </div>
              )}
            </>
          )}

          {pdfLoaded && (
            <Card>
              <CardContent className="p-4">
                <div className="h-[400px] overflow-y-auto space-y-4 mb-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                      {msg.role === "user" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary animate-pulse" />
                      </div>
                      <div className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">Thinking...</div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a question about your PDF..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    disabled={loading}
                  />
                  <Button onClick={handleSend} disabled={loading || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {!isPremium && (
                  <div className="mt-3 flex items-center justify-center">
                    <Button variant="ghost" size="sm" onClick={() => setShowUpgrade(true)}>
                      <Crown className="mr-1 h-3 w-3" /> Unlock full PDF analysis with Premium
                    </Button>
                  </div>
                )}
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
            <div className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" /> Unlimited AI chat</div>
            <div className="flex items-center gap-2 text-sm"><Zap className="h-4 w-4 text-primary" /> Faster processing</div>
            <div className="flex items-center gap-2 text-sm"><Lock className="h-4 w-4 text-primary" /> Full document analysis</div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => navigate("/dashboard")}>View Plans — ₹199/mo</Button>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>Later</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
