import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
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

export default function BlogGenerator() {
  const [keyword, setKeyword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, title, slug, status, created_at, reading_time")
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts((data as BlogPost[]) || []);
    setLoadingPosts(false);
  };

  useState(() => { loadPosts(); });

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
      setKeyword("");
      loadPosts();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate blog post");
    } finally {
      setGenerating(false);
    }
  };

  const deleteBlog = async (id: string) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted");
      setPosts((p) => p.filter((x) => x.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Blog Generator
          </CardTitle>
          <CardDescription>
            Enter a keyword to generate an SEO-optimized blog post automatically.
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

      <Card>
        <CardHeader>
          <CardTitle>Published Blog Posts ({posts.length})</CardTitle>
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
