import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";

interface ProcessingBarProps {
  progress: number;
  status: "idle" | "processing" | "done" | "error";
  message?: string;
}

export default function ProcessingBar({ progress, status, message }: ProcessingBarProps) {
  if (status === "idle") return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-foreground font-medium">
          {status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {status === "done" && <CheckCircle className="h-4 w-4 text-optimize" />}
          {message || (status === "processing" ? "Processing..." : "Done!")}
        </span>
        <span className="text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full rounded-full ${status === "done" ? "bg-optimize" : "bg-primary"}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}
