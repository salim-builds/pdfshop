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
import { LogOut, FileText, Clock, CreditCard, Trash2 } from "lucide-react";

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

const plans = [
  { id: "free", name: "Free", price: "$0", features: ["5 files/day", "Basic tools", "No watermark"] },
  { id: "pro", name: "Pro", price: "$9/mo", features: ["Unlimited files", "All tools", "Priority processing", "File history"] },
  { id: "business", name: "Business", price: "$29/mo", features: ["Everything in Pro", "API access", "Team workspace", "Priority support"] },
];

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<FileHistoryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "plans">("history");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [historyRes, profileRes] = await Promise.all([
        supabase.from("file_history").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("display_name, plan").eq("user_id", user.id).single(),
      ]);
      if (historyRes.data) setHistory(historyRes.data);
      if (profileRes.data) setProfile(profileRes.data);
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

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return null;

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
                  <Badge variant="secondary" className="ml-2 capitalize">{profile.plan}</Badge>
                )}
              </p>
            </div>
            <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
          </div>

          {/* Tabs */}
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
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.id} className={plan.id === profile?.plan ? "border-primary ring-2 ring-primary/20" : ""}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription className="text-2xl font-bold text-foreground">{plan.price}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="text-sm text-muted-foreground">✓ {f}</li>
                      ))}
                    </ul>
                    <Button className="w-full mt-6" variant={plan.id === profile?.plan ? "secondary" : "default"} disabled={plan.id === profile?.plan}>
                      {plan.id === profile?.plan ? "Current Plan" : "Upgrade"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
