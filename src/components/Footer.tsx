import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/50 py-12">
      <div className="container">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">PDFForge</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PDFForge. All PDF tools you need, right in your browser.
          </p>
        </div>
      </div>
    </footer>
  );
}
