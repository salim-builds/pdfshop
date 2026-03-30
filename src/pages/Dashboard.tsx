import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LogOut, FileText, Clock, CreditCard, Trash2, Loader2, CheckCircle, Brain, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface FileHistoryItem {
  id: string;
  file_name: string;
  tool_used: string;
  file_size: number | null;
  status: string;
  created_at: string;
}

interface Profile {
  display_name: string | null;
  plan: string;
}

interface AiUsage {
  summaries_used: number;
  chats_used: number;
}

const PLAN_LIMITS: Record<string, { summaries: number; chats: number }> = {
  free: { summaries: 0, chats: 0 },
  basic: { summaries: 15, chats: 5 },
  pro: { summaries: 80, chats: 30 },
  business: { summaries: 150, chats: 80 },
};

const plans = [
  { id: "free", name: "Free", price: "₹0", priceNum: 0, features: ["Unlimited PDF tools", "No AI features"] },
  { id: "basic", name: "AI Basic", price: "₹99/mo", priceNum: 99, features: ["15 AI summaries/day", "5 AI chats/day", "First 2 pages", "Faster processing"] },
  { id: "pro", name: "AI Pro", price: "₹299/mo", priceNum: 299, features: ["80 AI summaries/day", "30 AI chats/day", "Full document processing", "Fastest speed", "No watermark"] },
  { id: "business", name: "Business", price: "₹499/mo", priceNum: 499, features: ["150 AI summaries/day", "80 AI chats/day", "API access", "Team workspace", "Priority support"] },
];

export default function Dashboard() {
  const { user, session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<FileHistoryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsage>({ summaries_used: 0, chats_used: 0 });
  const [activeTab, setActiveTab] = useState<"history" | "plans">("history");
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0];
      const [historyRes, profileRes, usageRes] = await Promise.all([
        supabase.from("file_history").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("display_name, plan").eq("user_id", user.id).single(),
        supabase.from("ai_usage").select("summaries_used, chats_used").eq("user_id", user.id).eq("usage_date", today).maybeSingle(),
      ]);
      if (historyRes.data) setHistory(historyRes.data);
      if (profileRes.data) setProfile(profileRes.data);
      if (usageRes.data) setAiUsage({ summaries_used: usageRes.data.summaries_used, chats_used: usageRes.data.chats_used });
    };
    fetchData();
  }, [user]);

  const deleteHistoryItem = async (id: string) => {
    await supabase.from("file_history").delete().eq("id", id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const handleUpgrade = async (planId: string) => {
    if (!session?.access_token || planId === "free") return;
    setUpgrading(planId);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const createRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan_id: planId }),
        }
      );

      if (!createRes.ok) throw new Error("Failed to create order");
      const orderData = await createRes.json();

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "PDFShop.in",
        description: `Upgrade to ${plans.find(p => p.id === planId)?.name || planId} Plan`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(
              `https://${projectId}.supabase.co/functions/v1/verify-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  plan_id: planId,
                }),
              }
            );

            if (!verifyRes.ok) throw new Error("Verification failed");

            setProfile((prev) => prev ? { ...prev, plan: planId } : prev);
            toast.success("Plan upgraded successfully! 🎉");
          } catch {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        prefill: { email: user?.email || "" },
        theme: { color: "#6366f1" },
        modal: { ondismiss: () => setUpgrading(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate payment. Please try again.");
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return null;

  const currentPlan = profile?.plan || "free";
  const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome, {profile?.display_name || user.email}
                {profile?.plan && (
                  <Badge variant="secondary" className="ml-2 capitalize">{profile.plan === "basic" ? "AI Basic" : profile.plan === "pro" ? "AI Pro" : profile.plan}</Badge>
                )}
              </p>
            </div>
            <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
          </div>

          {/* AI Usage Card - only for paid plans */}
          {currentPlan !== "free" && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> AI Usage Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Brain className="h-4 w-4" /> Summaries
                      </span>
                      <span className="font-medium text-foreground">
                        {aiUsage.summaries_used} / {limits.summaries}
                      </span>
                    </div>
                    <Progress value={(aiUsage.summaries_used / limits.summaries) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.max(0, limits.summaries - aiUsage.summaries_used)} summaries left today
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MessageCircle className="h-4 w-4" /> Chats
                      </span>
                      <span className="font-medium text-foreground">
                        {aiUsage.chats_used} / {limits.chats}
                      </span>
                    </div>
                    <Progress value={(aiUsage.chats_used / limits.chats) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.max(0, limits.chats - aiUsage.chats_used)} chats left today
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Free plan upgrade prompt */}
          {currentPlan === "free" && (
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardContent className="py-6 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold text-foreground mb-1">Upgrade to use AI features</h3>
                <p className="text-sm text-muted-foreground mb-3">AI summaries, chat with PDFs, and more — starting at ₹99/month</p>
                <Button onClick={() => setActiveTab("plans")}>View Plans</Button>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 mb-6">
            <Button variant={activeTab === "history" ? "default" : "outline"} onClick={() => setActiveTab("history")}>
              <Clock className="mr-2 h-4 w-4" /> File History
            </Button>
            <Button variant={activeTab === "plans" ? "default" : "outline"} onClick={() => setActiveTab("plans")}>
              <CreditCard className="mr-2 h-4 w-4" /> Subscription Plans
            </Button>
          </div>

          {activeTab === "history" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Recent Files</CardTitle>
                <CardDescription>Your processed PDF files</CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No files processed yet.</p>
                    <Link to="/"><Button className="mt-4" variant="outline">Start using tools</Button></Link>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Tool</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.file_name}</TableCell>
                          <TableCell className="capitalize">{item.tool_used.replace(/-/g, " ")}</TableCell>
                          <TableCell>{formatSize(item.file_size)}</TableCell>
                          <TableCell>
                            <Badge variant={item.status === "completed" ? "default" : "destructive"}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteHistoryItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "plans" && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const isCurrent = plan.id === currentPlan;
                const isPopular = plan.id === "basic";
                const isBestValue = plan.id === "pro";
                return (
                  <Card key={plan.id} className={`relative ${isCurrent ? "border-primary ring-2 ring-primary/20" : ""} ${isPopular ? "shadow-lg" : ""}`}>
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                      </div>
                    )}
                    {isBestValue && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-accent text-accent-foreground">Best Value</Badge>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription className="text-2xl font-bold text-foreground">{plan.price}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full mt-6"
                        variant={isCurrent ? "secondary" : "default"}
                        disabled={isCurrent || upgrading === plan.id || plan.id === "free"}
                        onClick={() => handleUpgrade(plan.id)}
                      >
                        {upgrading === plan.id ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                        ) : isCurrent ? (
                          "Current Plan"
                        ) : plan.id === "free" ? (
                          "Free Plan"
                        ) : (
                          "Upgrade Now"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
