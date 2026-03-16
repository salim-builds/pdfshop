import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ChevronDown, Menu, X, User, LogIn } from "lucide-react";
import { tools, categoryLabels, categoryColors, categoryBgColors, type ToolCategory } from "@/lib/tools";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const categories: ToolCategory[] = ["organize", "optimize", "convert-to", "convert-from", "edit", "security"];

const navLinks = [
  { label: "Merge PDF", path: "/merge" },
  { label: "Split PDF", path: "/split" },
  { label: "Compress PDF", path: "/compress" },
  { label: "Convert PDF", path: "/pdf-to-word" },
];

export default function Navbar() {
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">PDFForge</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <div
            className="relative"
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
          >
            <button className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              All PDF Tools <ChevronDown className="h-4 w-4" />
            </button>
            {megaOpen && (
              <div className="absolute right-0 top-full w-[720px] rounded-lg border border-border bg-background p-6 shadow-lg">
                <div className="grid grid-cols-3 gap-6">
                  {categories.map((cat) => (
                    <div key={cat}>
                      <h4 className={`mb-2 text-xs font-semibold uppercase tracking-wider ${categoryColors[cat]}`}>
                        {categoryLabels[cat]}
                      </h4>
                      <div className="space-y-1">
                        {tools
                          .filter((t) => t.category === cat)
                          .map((t) => (
                            <Link
                              key={t.id}
                              to={t.path}
                              className="block rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
                              onClick={() => setMegaOpen(false)}
                            >
                              {t.name}
                            </Link>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          {navLinks.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className="block rounded-md px-3 py-2 text-sm font-medium text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-4 space-y-4">
            {categories.map((cat) => (
              <div key={cat}>
                <h4 className={`mb-1 text-xs font-semibold uppercase tracking-wider ${categoryColors[cat]}`}>
                  {categoryLabels[cat]}
                </h4>
                {tools
                  .filter((t) => t.category === cat)
                  .map((t) => (
                    <Link
                      key={t.id}
                      to={t.path}
                      className="block px-2 py-1.5 text-sm text-foreground"
                      onClick={() => setMobileOpen(false)}
                    >
                      {t.name}
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
