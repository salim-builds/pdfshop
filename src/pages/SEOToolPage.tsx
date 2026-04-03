import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSEOToolBySlug, seoTools } from "@/lib/seo-tools";
import { tools } from "@/lib/tools";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Upload, Settings, Download, Shield, Zap, Star, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useState } from "react";

// Lazy load tool components
const toolComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  merge: lazy(() => import("@/pages/MergePDF")),
  split: lazy(() => import("@/pages/SplitPDF")),
  compress: lazy(() => import("@/pages/CompressPDF")),
  rotate: lazy(() => import("@/pages/RotatePDF")),
  watermark: lazy(() => import("@/pages/WatermarkPDF")),
  protect: lazy(() => import("@/pages/ProtectPDF")),
  "jpg-to-pdf": lazy(() => import("@/pages/JPGtoPDF")),
  "remove-pages": lazy(() => import("@/pages/RemovePages")),
  "extract-pages": lazy(() => import("@/pages/ExtractPages")),
  "reorder-pages": lazy(() => import("@/pages/ReorderPages")),
  repair: lazy(() => import("@/pages/RepairPDF")),
  compare: lazy(() => import("@/pages/ComparePDF")),
  "convert-pdfa": lazy(() => import("@/pages/ConvertPDFA")),
  "html-to-pdf": lazy(() => import("@/pages/HTMLtoPDF")),
  "scan-to-pdf": lazy(() => import("@/pages/ScanToPDF")),
  crop: lazy(() => import("@/pages/CropPDF")),
  redact: lazy(() => import("@/pages/RedactPDF")),
  permissions: lazy(() => import("@/pages/AdvancedPermissions")),
  "ai-summary": lazy(() => import("@/pages/AISummary")),
  "ai-chat": lazy(() => import("@/pages/AIChatPDF")),
  "ai-translate": lazy(() => import("@/pages/AITranslate")),
  "ai-search": lazy(() => import("@/pages/AISearch")),
  "ai-insights": lazy(() => import("@/pages/AIInsights")),
};

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-muted/50 transition-colors"
      >
        {question}
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 text-muted-foreground text-sm">{answer}</div>}
    </div>
  );
}

export default function SEOToolPage() {
  const { slug } = useParams<{ slug: string }>();
  const seoData = slug ? getSEOToolBySlug(slug) : undefined;

  if (!seoData) return <Navigate to="/404" replace />;

  const tool = tools.find((t) => t.id === seoData.toolId);
  const ToolComponent = tool ? toolComponents[tool.id] : undefined;

  const relatedTools = seoData.relatedSlugs
    .map((s) => {
      const seo = seoTools.find((t) => t.slug === s);
      const t = seo ? tools.find((tt) => tt.id === seo.toolId) : undefined;
      return seo && t ? { seo, tool: t } : null;
    })
    .filter(Boolean)
    .slice(0, 5);

  const aiTools = seoData.aiRelatedSlugs
    .map((s) => {
      const seo = seoTools.find((t) => t.slug === s);
      const t = seo ? tools.find((tt) => tt.id === seo.toolId) : undefined;
      return seo && t ? { seo, tool: t } : null;
    })
    .filter(Boolean)
    .slice(0, 2);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: seoData.h1,
    description: seoData.metaDescription,
    url: `https://pdfshop.lovable.app/tools/${seoData.slug}`,
    applicationCategory: "UtilityApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: seoData.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to ${seoData.h1}`,
    step: seoData.howTo.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.step,
      text: s.description,
    })),
  };

  return (
    <>
      <Helmet>
        <title>{seoData.title}</title>
        <meta name="description" content={seoData.metaDescription} />
        <meta name="keywords" content={seoData.keywords.join(", ")} />
        <link rel="canonical" href={`https://pdfshop.lovable.app/tools/${seoData.slug}`} />
        <meta property="og:title" content={seoData.title} />
        <meta property="og:description" content={seoData.metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://pdfshop.lovable.app/tools/${seoData.slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoData.title} />
        <meta name="twitter:description" content={seoData.metaDescription} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(howToJsonLd)}</script>
      </Helmet>

      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-b from-muted/50 to-background py-12 md:py-16">
            <div className="container mx-auto max-w-4xl text-center px-4">
              <h1 className="text-3xl font-bold md:text-5xl text-foreground">{seoData.h1}</h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">{seoData.metaDescription}</p>
              {tool?.premium && (
                <Badge variant="secondary" className="mt-3">
                  <Star className="h-3 w-3 mr-1" /> Premium Feature
                </Badge>
              )}
            </div>
          </section>

          {/* Tool UI Section */}
          {ToolComponent && (
            <section className="py-8" aria-label="Tool interface">
              <Suspense fallback={
                <div className="container mx-auto max-w-2xl text-center py-20">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="mt-4 text-muted-foreground">Loading tool...</p>
                </div>
              }>
                <ToolComponent />
              </Suspense>
            </section>
          )}

          {/* Why Use Section */}
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto max-w-3xl px-4">
              <h2 className="text-2xl font-bold text-center mb-4">Why Use {seoData.h1.replace(/Online|Free/gi, "").trim()}?</h2>
              <p className="text-muted-foreground text-center leading-relaxed">{seoData.whyUse}</p>
            </div>
          </section>

          {/* How to Use Section */}
          <section className="py-12">
            <div className="container mx-auto max-w-4xl px-4">
              <h2 className="text-2xl font-bold text-center mb-8">How to {seoData.h1}</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {seoData.howTo.map((step, i) => (
                  <Card key={i} className="text-center">
                    <CardContent className="pt-6">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        {i === 0 ? <Upload className="h-6 w-6 text-primary" /> :
                         i === 1 ? <Settings className="h-6 w-6 text-primary" /> :
                         <Download className="h-6 w-6 text-primary" />}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Step {i + 1}</div>
                      <h3 className="font-semibold text-lg mb-2">{step.step}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto max-w-4xl px-4">
              <h2 className="text-2xl font-bold text-center mb-8">Features</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: Zap, title: "Fast Processing", desc: "Process your files in seconds, not minutes." },
                  { icon: Shield, title: "100% Secure", desc: "Files are encrypted and auto-deleted after processing." },
                  { icon: Star, title: "Free to Use", desc: "Core features available free with no sign-up required." },
                  { icon: CheckCircle, title: "High Quality", desc: "Professional-grade output every time." },
                  { icon: Upload, title: "Drag & Drop", desc: "Simply drag files into the upload area." },
                  { icon: Download, title: "Instant Download", desc: "Download your processed file immediately." },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                    <f.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-sm">{f.title}</h3>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-12">
            <div className="container mx-auto max-w-3xl px-4">
              <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {seoData.faqs.map((faq, i) => (
                  <FAQItem key={i} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </div>
          </section>

          {/* Related Tools Section */}
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto max-w-4xl px-4">
              <h2 className="text-2xl font-bold text-center mb-8">Related Tools</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedTools.map((item) => {
                  if (!item) return null;
                  const Icon = item.tool.icon;
                  return (
                    <Link
                      key={item.seo.slug}
                      to={`/tools/${item.seo.slug}`}
                      className="flex items-center gap-3 p-4 rounded-lg bg-background border hover:border-primary/50 hover:shadow-sm transition-all group"
                    >
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{item.tool.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{item.tool.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>

              {/* AI Tools */}
              {aiTools.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-center mb-4">AI-Powered Tools</h3>
                  <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                    {aiTools.map((item) => {
                      if (!item) return null;
                      const Icon = item.tool.icon;
                      return (
                        <Link
                          key={item.seo.slug}
                          to={`/tools/${item.seo.slug}`}
                          className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20 hover:border-primary/50 hover:shadow-sm transition-all group"
                        >
                          <Icon className="h-5 w-5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{item.tool.name}</h3>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
