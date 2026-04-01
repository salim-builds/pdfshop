const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file1 = formData.get("file1") as File;
    const file2 = formData.get("file2") as File;

    if (!file1 || !file2) {
      return new Response(JSON.stringify({ error: "Two PDF files required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text from both PDFs using basic parsing
    const text1 = await extractTextFromPDF(await file1.arrayBuffer());
    const text2 = await extractTextFromPDF(await file2.arrayBuffer());

    // Compare texts page by page
    const maxPages = Math.max(text1.length, text2.length);
    const differences: Array<{ page: number; text1: string; text2: string; type: string }> = [];

    for (let i = 0; i < maxPages; i++) {
      const t1 = text1[i] || "";
      const t2 = text2[i] || "";

      if (t1 !== t2) {
        if (!text1[i]) {
          differences.push({ page: i + 1, text1: "(page missing)", text2: t2.substring(0, 200), type: "added" });
        } else if (!text2[i]) {
          differences.push({ page: i + 1, text1: t1.substring(0, 200), text2: "(page missing)", type: "removed" });
        } else {
          // Find specific differences
          const words1 = t1.split(/\s+/);
          const words2 = t2.split(/\s+/);
          const diffWords: string[] = [];
          const maxWords = Math.max(words1.length, words2.length);

          for (let w = 0; w < maxWords; w++) {
            if (words1[w] !== words2[w]) {
              diffWords.push(`"${words1[w] || ""}" → "${words2[w] || ""}"`);
              if (diffWords.length >= 5) break;
            }
          }

          differences.push({
            page: i + 1,
            text1: t1.substring(0, 300),
            text2: t2.substring(0, 300),
            type: "modified",
          });
        }
      }
    }

    return new Response(JSON.stringify({ differences }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Basic PDF text extraction by parsing content streams
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string[]> {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder("latin1").decode(bytes);
  const pages: string[] = [];

  // Find all text between BT and ET operators (text blocks)
  const pageMatches = text.split(/\/Type\s*\/Page(?!\s*s)/);

  for (let i = 1; i < pageMatches.length; i++) {
    const pageContent = pageMatches[i];
    const textParts: string[] = [];

    // Extract text from Tj and TJ operators
    const tjMatches = pageContent.matchAll(/\(([^)]*)\)\s*Tj/g);
    for (const match of tjMatches) {
      textParts.push(match[1]);
    }

    // Extract text from TJ arrays
    const tjArrayMatches = pageContent.matchAll(/\[([^\]]*)\]\s*TJ/g);
    for (const match of tjArrayMatches) {
      const inner = match[1];
      const stringMatches = inner.matchAll(/\(([^)]*)\)/g);
      for (const sm of stringMatches) {
        textParts.push(sm[1]);
      }
    }

    pages.push(textParts.join(" ").trim());
  }

  // If no pages extracted, return single empty page
  if (pages.length === 0) pages.push("");
  return pages;
}
