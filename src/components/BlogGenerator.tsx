import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle, AlertTriangle, Trash2, Zap, BarChart3, Clock, RefreshCw, Send, Globe } from "lucide-react";
import { toast } from "sonner";

const SUGGESTED_KEYWORDS = [
  "how to merge pdf online",
  "compress pdf without losing quality",
  "convert pdf to word free",
  "how to split pdf pages",
  "jpg to pdf converter online",
  "best free pdf tools for students",
  "how to edit pdf online free",
  "ai pdf summarizer free",
  "how to compress pdf for whatsapp",
  "translate pdf online free",
  "how to convert pdf to word editable",
  "chat with pdf ai",
  "pdf to jpg converter online",
  "how to merge pdf without software",
  "secure pdf tools online",
];

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
  reading_time: number;
}

interface BlogStats {
  total: number;
  today: number;
  unusedKeywords: number;
}

export default function BlogGenerator() {
  const [keyword, setKeyword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [stats, setStats] = useState<BlogStats>({ total: 0, today: 0, unusedKeywords: 0 });
  const [submittingIndexNow, setSubmittingIndexNow] = useState<string | null>(null);
  const [submittingAll, setSubmittingAll] = useState(false);

  const loadData = async () => {
    const today = new Date().toISOString().split("T")[0];

    const [postsRes, totalRes, todayRes, kwRes] = await Promise.all([
      supabase
        .from("blog_posts")
        .select("id, title, slug, status, created_at, reading_time")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("blog_posts").select("id", { count: "exact", head: true }),
      supabase
        .from("blog_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`),
      supabase
        .from("blog_keywords")
        .select("id", { count: "exact", head: true })
        .eq("used", false),
    ]);

    setPosts((postsRes.data as BlogPost[]) || []);
    setStats({
      total: totalRes.count || 0,
      today: todayRes.count || 0,
      unusedKeywords: kwRes.count || 0,
    });
    setLoadingPosts(false);
  };

  useEffect(() => { loadData(); }, []);

  const generateBlog = async () => {
    if (!keyword.trim()) {
      toast.error("Enter a keyword first");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog", {
        body: { keyword: keyword.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Blog post generated successfully!");
      // Submit to IndexNow
      if (data?.slug) {
        submitToIndexNow([data.slug]).catch(() => {});
      }
      setKeyword("");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate blog post");
    } finally {
      setGenerating(false);
    }
  };

  const autoGenerate = async () => {
    setAutoGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-generate-blogs", {
        body: { count: 3 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const published = data?.generated || 0;
      toast.success(`Auto-generated ${published} blog posts!`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Auto-generation failed");
    } finally {
      setAutoGenerating(false);
    }
  };

  const submitToIndexNow = async (slugs: string[]) => {
    const { data, error } = await supabase.functions.invoke("indexnow", {
      body: { slugs },
    });
    if (error) throw error;
    return data;
  };

  const handleSubmitSingle = async (slug: string) => {
    setSubmittingIndexNow(slug);
    try {
      const result = await submitToIndexNow([slug]);
      if (result?.success) {
        toast.success(`Submitted /blog/${slug} to IndexNow`);
      } else {
        toast.error(`IndexNow returned status ${result?.status}`);
      }
    } catch {
      toast.error("Failed to submit to IndexNow");
    } finally {
      setSubmittingIndexNow(null);
    }
  };

  const handleSubmitAll = async () => {
    if (posts.length === 0) return;
    setSubmittingAll(true);
    try {
      const slugs = posts.filter(p => p.status === "published").map(p => p.slug);
      if (slugs.length === 0) {
        toast.error("No published posts to submit");
        return;
      }
      const result = await submitToIndexNow(slugs);
      if (result?.success) {
        toast.success(`Submitted ${result.submitted} URLs to IndexNow`);
      } else {
        toast.error(`IndexNow returned status ${result?.status}`);
      }
    } catch {
      toast.error("Failed to submit to IndexNow");
    } finally {
      setSubmittingAll(false);
    }
  };

  const deleteBlog = async (id: string) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted");
      setPosts((p) => p.filter((x) => x.id !== id));
      setStats((s) => ({ ...s, total: s.total - 1 }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Blogs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/10 p-2">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.today}</p>
                <p className="text-xs text-muted-foreground">Generated Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/10 p-2">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.unusedKeywords}</p>
                <p className="text-xs text-muted-foreground">Keywords Left</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto Generate */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" /> Auto Blog Generator
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically pick 3 unused keywords and generate SEO blogs
              </p>
            </div>
            <Button onClick={autoGenerate} disabled={autoGenerating || stats.unusedKeywords === 0} size="lg">
              {autoGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              {autoGenerating ? "Generating..." : "Generate Now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manual Generate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Manual Blog Generator
          </CardTitle>
          <CardDescription>
            Enter a custom keyword to generate an SEO-optimized blog post.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., how to merge pdf online"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !generating && generateBlog()}
              disabled={generating}
            />
            <Button onClick={generateBlog} disabled={generating}>
              {generating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              {generating ? "Generating..." : "Generate"}
            </Button>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Suggested keywords:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_KEYWORDS.map((kw) => (
                <Badge
                  key={kw}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => !generating && setKeyword(kw)}
                >
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blog List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Published Blog Posts ({posts.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSubmitAll}
              disabled={submittingAll || posts.length === 0}
            >
              {submittingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
              Submit All to IndexNow
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPosts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No blog posts yet. Generate your first one!</p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex-1 min-w-0">
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener"
                      className="font-medium text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {post.title}
                    </a>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>/blog/{post.slug}</span>
                      <span>{post.reading_time} min</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant={post.status === "published" ? "default" : "secondary"}>
                      {post.status === "published" ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                      {post.status}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Submit to IndexNow"
                      onClick={() => handleSubmitSingle(post.slug)}
                      disabled={submittingIndexNow === post.slug}
                    >
                      {submittingIndexNow === post.slug ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteBlog(post.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
