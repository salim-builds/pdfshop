import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, Loader2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const POSTS_PER_PAGE = 20;

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  meta_description: string | null;
  keywords: string[];
  reading_time: number;
  created_at: string;
}

export default function BlogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Math.max(1, Number(searchParams.get("page") || "1"));
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE));

  useEffect(() => {
    setLoading(true);
    const from = (currentPage - 1) * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    Promise.all([
      supabase
        .from("blog_posts")
        .select("id, title, slug, meta_description, keywords, reading_time, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .range(from, to),
      supabase
        .from("blog_posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
    ]).then(([{ data }, { count }]) => {
      setPosts((data as BlogPost[]) || []);
      setTotalCount(count || 0);
      setLoading(false);
    });
  }, [currentPage]);

  const goToPage = (page: number) => {
    setSearchParams(page === 1 ? {} : { page: String(page) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Helmet>
        <title>PDF Tips & Guides Blog | PDFShop</title>
        <meta name="description" content="Learn how to merge, split, compress, convert and edit PDFs with free guides and tutorials from PDFShop." />
      </Helmet>
      <Navbar />

      <section className="border-b border-border bg-muted/30 py-16">
        <div className="container text-center">
          <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">PDF Tips & Guides</h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Learn how to work with PDFs like a pro. Free guides, tutorials, and tips.
          </p>
        </div>
      </section>

      <section className="flex-1 py-16">
        <div className="container max-w-4xl">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">No blog posts yet. Check back soon!</p>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => (
                <article key={post.id} className="group rounded-lg border border-border bg-background p-6 transition-shadow hover:shadow-md">
                  <Link to={`/blog/${post.slug}`}>
                    <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    {post.meta_description && (
                      <p className="mt-2 text-muted-foreground">{post.meta_description}</p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" /> {post.reading_time} min read
                      </span>
                      <span>{new Date(post.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </div>
                    {post.keywords?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {post.keywords.slice(0, 4).map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Read more <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
