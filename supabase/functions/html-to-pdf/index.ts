const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      const res = await fetch(input, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PDFShop.in/1.0)" },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
      htmlContent = await res.text();
    } else {
      htmlContent = input;
    }

    // Parse HTML structure for better PDF rendering
    const parsed = parseHTML(htmlContent);
    const pdfBytes = buildStyledPDF(parsed);

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=converted.pdf",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface ParsedBlock {
  type: "heading" | "paragraph" | "list-item" | "code" | "separator";
  level?: number;
  text: string;
}

function parseHTML(html: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];

  // Remove script and style tags
  let clean = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    blocks.push({ type: "heading", level: 1, text: decodeEntities(titleMatch[1].trim()) });
  }

  // Process headings
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  const processed = new Set<string>();

  while ((match = headingRegex.exec(clean)) !== null) {
    const text = stripTags(match[2]).trim();
    if (text && !processed.has(text)) {
      blocks.push({ type: "heading", level: parseInt(match[1]), text });
      processed.add(text);
    }
  }

  // Process list items
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  while ((match = liRegex.exec(clean)) !== null) {
    const text = stripTags(match[1]).trim();
    if (text) blocks.push({ type: "list-item", text });
  }

  // Process code blocks
  const codeRegex = /<(?:pre|code)[^>]*>([\s\S]*?)<\/(?:pre|code)>/gi;
  while ((match = codeRegex.exec(clean)) !== null) {
    const text = stripTags(match[1]).trim();
    if (text) blocks.push({ type: "code", text: text.substring(0, 500) });
  }

  // Process paragraphs and divs
  const pRegex = /<(?:p|div|td|th|span|article|section)[^>]*>([\s\S]*?)<\/(?:p|div|td|th|span|article|section)>/gi;
  while ((match = pRegex.exec(clean)) !== null) {
    const text = stripTags(match[1]).trim();
    if (text && text.length > 2 && !processed.has(text)) {
      blocks.push({ type: "paragraph", text });
      processed.add(text);
    }
  }

  // If no structured content found, fall back to plain text extraction
  if (blocks.length === 0) {
    const plainText = stripTags(clean)
      .replace(/\s+/g, " ")
      .trim();
    if (plainText) {
      const sentences = plainText.split(/(?<=[.!?])\s+/);
      for (let i = 0; i < sentences.length; i += 3) {
        const chunk = sentences.slice(i, i + 3).join(" ");
        if (chunk.trim()) blocks.push({ type: "paragraph", text: chunk });
      }
    }
  }

  // Add hr separators where appropriate
  return blocks.length > 0 ? blocks : [{ type: "paragraph", text: "No content could be extracted from this HTML." }];
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
  );
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&[a-z]+;/gi, " ");
}

function buildStyledPDF(blocks: ParsedBlock[]): Uint8Array {
  const pageWidth = 612;
  const pageHeight = 792;
  const marginLeft = 60;
  const marginRight = 60;
  const marginTop = 60;
  const marginBottom = 60;
  const usableWidth = pageWidth - marginLeft - marginRight;
  const maxCharsPerLine = Math.floor(usableWidth / 5.5);

  const objects: string[] = [];
  let objNum = 1;

  const catalogNum = objNum++;
  const pagesNum = objNum++;
  const fontRegularNum = objNum++;
  const fontBoldNum = objNum++;

  // Generate page content streams
  const pageStreams: string[] = [];
  let currentStream = "";
  let curY = pageHeight - marginTop;

  function newPage() {
    if (currentStream) pageStreams.push(currentStream);
    currentStream = "";
    curY = pageHeight - marginTop;
  }

  function ensureSpace(needed: number) {
    if (curY - needed < marginBottom) newPage();
  }

  function addText(text: string, fontSize: number, isBold: boolean, indent: number = 0, prefix: string = "") {
    const font = isBold ? "/F2" : "/F1";
    const charWidth = fontSize * 0.5;
    const effectiveWidth = usableWidth - indent;
    const charsPerLine = Math.floor(effectiveWidth / charWidth);
    
    const fullText = prefix + text;
    const lines = wrapText(fullText, charsPerLine);
    const lineHeight = fontSize * 1.4;

    for (const line of lines) {
      ensureSpace(lineHeight);
      const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      currentStream += `BT ${font} ${fontSize} Tf 1 0 0 1 ${marginLeft + indent} ${curY} Tm (${escaped}) Tj ET\n`;
      curY -= lineHeight;
    }
  }

  function addSeparator() {
    ensureSpace(20);
    curY -= 5;
    currentStream += `0.8 0.8 0.8 RG ${marginLeft} ${curY} ${usableWidth} 0.5 re f\n`;
    curY -= 15;
  }

  // Render blocks
  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const sizes: Record<number, number> = { 1: 20, 2: 16, 3: 14, 4: 12, 5: 11, 6: 10 };
        const size = sizes[block.level || 1] || 12;
        ensureSpace(size * 2);
        curY -= size * 0.5;
        addText(block.text, size, true);
        curY -= size * 0.3;
        break;
      }
      case "list-item":
        addText(block.text, 10, false, 15, "\u2022 ");
        curY -= 3;
        break;
      case "code":
        ensureSpace(30);
        // Draw light gray background
        const codeLines = wrapText(block.text, maxCharsPerLine - 4);
        const codeHeight = codeLines.length * 13 + 10;
        currentStream += `0.95 0.95 0.95 rg ${marginLeft} ${curY - codeHeight + 5} ${usableWidth} ${codeHeight} re f\n`;
        addText(block.text, 9, false, 10);
        curY -= 8;
        break;
      case "separator":
        addSeparator();
        break;
      case "paragraph":
      default:
        addText(block.text, 10, false);
        curY -= 8;
        break;
    }
  }

  // Flush last page
  if (currentStream) pageStreams.push(currentStream);
  if (pageStreams.length === 0) pageStreams.push("");

  // Build PDF objects
  const pageObjNums: number[] = [];
  const contentObjNums: number[] = [];

  for (let p = 0; p < pageStreams.length; p++) {
    pageObjNums.push(objNum++);
    contentObjNums.push(objNum++);
  }

  // Catalog
  objects.push(`${catalogNum} 0 obj\n<< /Type /Catalog /Pages ${pagesNum} 0 R >>\nendobj`);
  // Pages
  objects.push(`${pagesNum} 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map(n => `${n} 0 R`).join(" ")}] /Count ${pageStreams.length} >>\nendobj`);
  // Fonts
  objects.push(`${fontRegularNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj`);
  objects.push(`${fontBoldNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj`);

  // Page and content objects
  for (let p = 0; p < pageStreams.length; p++) {
    const stream = pageStreams[p];
    objects.push(`${pageObjNums[p]} 0 obj\n<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjNums[p]} 0 R /Resources << /Font << /F1 ${fontRegularNum} 0 R /F2 ${fontBoldNum} 0 R >> >> >>\nendobj`);
    objects.push(`${contentObjNums[p]} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`);
  }

  // Build final PDF
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
