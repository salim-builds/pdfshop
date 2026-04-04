import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import { tools, categoryLabels, categoryColors, type ToolCategory } from "@/lib/tools";
import { FileText } from "lucide-react";

const categories: ToolCategory[] = ["ai", "organize", "optimize", "convert-to", "convert-from", "edit", "security"];

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-muted/30 py-16 md:py-24">
        <div className="container text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-6">
            <FileText className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">
            Every PDF tool you need
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Merge, split, compress, convert, edit, and secure your PDFs — all in one place, entirely in your browser.
          </p>
          <div className="mt-6">
            <a href="/pricing">
              <button className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                View Pricing
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Tool grid by category */}
      <section className="flex-1 py-16">
        <div className="container space-y-16">
          {categories.map((cat) => {
            const catTools = tools.filter((t) => t.category === cat);
            return (
              <div key={cat}>
                <h2 className={`mb-6 text-lg font-bold uppercase tracking-wider ${categoryColors[cat]}`}>
                  {categoryLabels[cat]}
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {catTools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
