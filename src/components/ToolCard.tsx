import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { type PDFTool, categoryColors, categoryBgColors } from "@/lib/tools";
import { getSEOSlugByToolId } from "@/lib/seo-tools";

export default function ToolCard({ tool }: { tool: PDFTool }) {
  const Icon = tool.icon;
  const seoSlug = getSEOSlugByToolId(tool.id);
  const href = seoSlug ? `/tools/${seoSlug}` : tool.path;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.15 }}
    >
      <Link
        to={href}
        className="group flex flex-col items-center gap-3 rounded-lg border border-border bg-background p-6 text-center transition-shadow hover:shadow-md"
      >
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${categoryBgColors[tool.category]}`}>
          <Icon className={`h-7 w-7 ${categoryColors[tool.category]}`} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{tool.name}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
      </Link>
    </motion.div>
  );
}
