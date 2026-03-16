import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MergePDF from "./pages/MergePDF";
import SplitPDF from "./pages/SplitPDF";
import CompressPDF from "./pages/CompressPDF";
import RotatePDF from "./pages/RotatePDF";
import WatermarkPDF from "./pages/WatermarkPDF";
import ProtectPDF from "./pages/ProtectPDF";
import JPGtoPDF from "./pages/JPGtoPDF";
import PlaceholderTool from "./components/PlaceholderTool";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/merge" element={<MergePDF />} />
          <Route path="/split" element={<SplitPDF />} />
          <Route path="/compress" element={<CompressPDF />} />
          <Route path="/rotate" element={<RotatePDF />} />
          <Route path="/watermark" element={<WatermarkPDF />} />
          <Route path="/protect" element={<ProtectPDF />} />
          <Route path="/jpg-to-pdf" element={<JPGtoPDF />} />
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
