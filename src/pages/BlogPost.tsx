import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ArrowLeft, Loader2 } from "lucide-react";

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description: string | null;
  keywords: string[];
  reading_time: number;
  created_at: string;
}

function renderMarkdown(md: string): string {
  return md
    .replace(/### (.*)/g, '<h3 class="text-lg font-bold text-foreground mt-6 mb-2">$1</h3>')
    .replace(/## (.*)/g, '<h2 class="text-xl font-bold text-foreground mt-8 mb-3">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80">$1</a>')
    .replace(/^- (.*)/gm, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
    .replace(/^(\d+)\. (.*)/gm, '<li class="ml-4 list-decimal text-muted-foreground">$2</li>')
    .replace(/\n\n/g, '</p><p class="text-muted-foreground leading-relaxed mb-4">')
    .replace(/\n/g, "<br />");
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single()
      .then(({ data }) => {
        setPost(data as Post | null);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center flex-col gap-4">
          <h1 className="text-2xl font-bold text-foreground">Blog post not found</h1>
          <Link to="/blog"><Button variant="outline">Back to Blog</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description || "",
    datePublished: post.created_at,
    author: { "@type": "Organization", name: "PDFShop" },
    publisher: { "@type": "Organization", name: "PDFShop", url: "https://pdfshop.in" },
    keywords: post.keywords?.join(", "),
    wordCount: post.content.split(/\s+/).length,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Helmet>
        <title>{post.title} | PDFShop Blog</title>
        <meta name="description" content={post.meta_description || post.title} />
        <meta name="keywords" content={post.keywords?.join(", ")} />
        <link rel="canonical" href={`https://pdfshop.in/blog/${post.slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Navbar />

      <article className="flex-1 py-12">
        <div className="container max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>

          <h1 className="text-3xl font-extrabold text-foreground md:text-4xl leading-tight">{post.title}</h1>

          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {post.reading_time} min read
            </span>
            <span>{new Date(post.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>

          {post.keywords?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.keywords.map((kw) => (
                <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
              ))}
            </div>
          )}

          <div
            className="mt-8 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: `<p class="text-muted-foreground leading-relaxed mb-4">${renderMarkdown(post.content)}</p>`,
            }}
          />

          <div className="mt-12 rounded-lg border border-border bg-muted/30 p-8 text-center">
            <h2 className="text-xl font-bold text-foreground">Ready to try PDFShop?</h2>
            <p className="mt-2 text-muted-foreground">Use our free PDF tools — no signup required.</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link to="/"><Button>Explore All Tools</Button></Link>
              <Link to="/tools/merge-pdf"><Button variant="outline">Merge PDF</Button></Link>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
