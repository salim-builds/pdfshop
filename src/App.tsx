import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { HelmetProvider } from "react-helmet-async";
import SEOToolPage from "./pages/SEOToolPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import MergePDF from "./pages/MergePDF";
import SplitPDF from "./pages/SplitPDF";
import CompressPDF from "./pages/CompressPDF";
import RotatePDF from "./pages/RotatePDF";
import WatermarkPDF from "./pages/WatermarkPDF";
import ProtectPDF from "./pages/ProtectPDF";
import JPGtoPDF from "./pages/JPGtoPDF";
import PlaceholderTool from "./components/PlaceholderTool";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AISummary from "./pages/AISummary";
import AIChatPDF from "./pages/AIChatPDF";
import AITranslate from "./pages/AITranslate";
import AISearch from "./pages/AISearch";
import AIInsights from "./pages/AIInsights";
import Pricing from "./pages/Pricing";
import RemovePages from "./pages/RemovePages";
import ExtractPages from "./pages/ExtractPages";
import ReorderPages from "./pages/ReorderPages";
import RepairPDF from "./pages/RepairPDF";
import ComparePDF from "./pages/ComparePDF";
import ConvertPDFA from "./pages/ConvertPDFA";
import HTMLtoPDF from "./pages/HTMLtoPDF";
import ScanToPDF from "./pages/ScanToPDF";
import CropPDF from "./pages/CropPDF";
import RedactPDF from "./pages/RedactPDF";
import AdvancedPermissions from "./pages/AdvancedPermissions";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ai-summary" element={<AISummary />} />
            <Route path="/ai-chat" element={<AIChatPDF />} />
            <Route path="/ai-translate" element={<AITranslate />} />
            <Route path="/ai-search" element={<AISearch />} />
            <Route path="/ai-insights" element={<AIInsights />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/merge" element={<MergePDF />} />
            <Route path="/split" element={<SplitPDF />} />
            <Route path="/compress" element={<CompressPDF />} />
            <Route path="/rotate" element={<RotatePDF />} />
            <Route path="/watermark" element={<WatermarkPDF />} />
            <Route path="/protect" element={<ProtectPDF />} />
            <Route path="/jpg-to-pdf" element={<JPGtoPDF />} />
            <Route path="/remove-pages" element={<RemovePages />} />
            <Route path="/extract-pages" element={<ExtractPages />} />
            <Route path="/reorder-pages" element={<ReorderPages />} />
            <Route path="/repair" element={<RepairPDF />} />
            <Route path="/compare" element={<ComparePDF />} />
            <Route path="/convert-pdfa" element={<ConvertPDFA />} />
            <Route path="/html-to-pdf" element={<HTMLtoPDF />} />
            <Route path="/scan-to-pdf" element={<ScanToPDF />} />
            <Route path="/crop" element={<CropPDF />} />
            <Route path="/redact" element={<RedactPDF />} />
            <Route path="/permissions" element={<AdvancedPermissions />} />
            <Route path="/pdf-to-word" element={<PlaceholderTool title="PDF to Word" description="Convert PDF documents to editable Word files" accentClass="text-convert-from" />} />
            <Route path="/pdf-to-excel" element={<PlaceholderTool title="PDF to Excel" description="Convert PDF tables to Excel spreadsheets" accentClass="text-convert-from" />} />
            <Route path="/pdf-to-ppt" element={<PlaceholderTool title="PDF to PowerPoint" description="Convert PDF to presentation slides" accentClass="text-convert-from" />} />
            <Route path="/pdf-to-jpg" element={<PlaceholderTool title="PDF to JPG" description="Convert PDF pages to image files" accentClass="text-convert-from" />} />
            <Route path="/word-to-pdf" element={<PlaceholderTool title="Word to PDF" description="Convert Word documents to PDF" accentClass="text-convert-to" accept=".docx,.doc" />} />
            <Route path="/excel-to-pdf" element={<PlaceholderTool title="Excel to PDF" description="Convert Excel files to PDF" accentClass="text-convert-to" accept=".xlsx,.xls" />} />
            <Route path="/ppt-to-pdf" element={<PlaceholderTool title="PPT to PDF" description="Convert presentations to PDF" accentClass="text-convert-to" accept=".pptx,.ppt" />} />
            <Route path="/unlock" element={<PlaceholderTool title="Unlock PDF" description="Remove password from PDF files" accentClass="text-security" />} />
            <Route path="/page-numbers" element={<PlaceholderTool title="Add Page Numbers" description="Insert page numbers into your PDF" accentClass="text-organize" />} />
            <Route path="/ocr" element={<PlaceholderTool title="OCR PDF" description="Make scanned PDFs searchable with OCR" accentClass="text-optimize" />} />
            <Route path="/edit-pdf" element={<PlaceholderTool title="Edit PDF" description="Modify text and images in your PDF" accentClass="text-edit" />} />
            <Route path="/sign-pdf" element={<PlaceholderTool title="Sign PDF" description="Add your signature to PDF documents" accentClass="text-edit" />} />
            <Route path="/pdf-reader" element={<PlaceholderTool title="PDF Reader" description="View PDF files online" accentClass="text-edit" />} />
            <Route path="/tools/:slug" element={<SEOToolPage />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
