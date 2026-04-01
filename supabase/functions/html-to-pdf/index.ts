import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mode, input } = await req.json();

    if (!mode || !input) {
      return new Response(JSON.stringify({ error: "mode and input required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let htmlContent = "";

    if (mode === "url") {
      // Fetch the webpage
      const res = await fetch(input, {
        headers: { "User-Agent": "PDFShop.in HTML-to-PDF Converter" },
      });
      if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
      htmlContent = await res.text();
    } else {
      htmlContent = input;
    }

    // Generate a simple PDF from HTML text content
    // Extract text from HTML by stripping tags
    const plainText = htmlContent
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Build a minimal PDF manually
    const pdfBytes = buildSimplePDF(plainText);

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=converted.pdf",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildSimplePDF(text: string): Uint8Array {
  const lines = wrapText(text, 80);
  const linesPerPage = 50;
  const pageCount = Math.max(1, Math.ceil(lines.length / linesPerPage));

  const objects: string[] = [];
  let objNum = 1;

  // Catalog
  const catalogNum = objNum++;
  objects.push(`${catalogNum} 0 obj\n<< /Type /Catalog /Pages ${catalogNum + 1} 0 R >>\nendobj`);

  // Pages
  const pagesNum = objNum++;
  const pageNums: number[] = [];
  for (let p = 0; p < pageCount; p++) {
    pageNums.push(objNum + p * 2);
  }
  objects.push(`${pagesNum} 0 obj\n<< /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageCount} >>\nendobj`);

  // Font
  const fontNum = objNum + pageCount * 2;

  // Pages and content streams
  for (let p = 0; p < pageCount; p++) {
    const pageNum = objNum++;
    const contentNum = objNum++;
    const startLine = p * linesPerPage;
    const pageLines = lines.slice(startLine, startLine + linesPerPage);

    let stream = "BT\n/F1 11 Tf\n";
    let y = 760;
    for (const line of pageLines) {
      const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      stream += `1 0 0 1 50 ${y} Tm\n(${escaped}) Tj\n`;
      y -= 14;
    }
    stream += "ET";

    objects.push(`${pageNum} 0 obj\n<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 612 792] /Contents ${contentNum} 0 R /Resources << /Font << /F1 ${fontNum} 0 R >> >> >>\nendobj`);
    objects.push(`${contentNum} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`);
  }

  // Font object
  objects.push(`${fontNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  // Build PDF
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${offsets.length + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

function wrapText(text: string, maxWidth: number): string[] {
  const result: string[] = [];
  const paragraphs = text.split("\n");

  for (const para of paragraphs) {
    if (para.trim() === "") {
      result.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      if ((line + " " + word).length > maxWidth && line.length > 0) {
        result.push(line);
        line = word;
      } else {
        line = line ? line + " " + word : word;
      }
    }
    if (line) result.push(line);
  }
  return result;
}
