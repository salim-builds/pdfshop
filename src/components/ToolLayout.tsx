import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface ToolLayoutProps {
  title: string;
  description: string;
  accentClass?: string;
  children: ReactNode;
}

export default function ToolLayout({ title, description, accentClass = "text-primary", children }: ToolLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container py-12">
          <div className="mx-auto max-w-2xl text-center mb-10">
            <h1 className={`text-3xl font-bold ${accentClass} md:text-4xl`}>{title}</h1>
            <p className="mt-3 text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
