const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const text1 = await extractTextFromPDF(await file1.arrayBuffer());
    const text2 = await extractTextFromPDF(await file2.arrayBuffer());

    const maxPages = Math.max(text1.length, text2.length);
    const differences: Array<{
      page: number;
      text1: string;
      text2: string;
      type: string;
      changes: Array<{ type: "added" | "removed" | "unchanged"; text: string }>;
    }> = [];

    for (let i = 0; i < maxPages; i++) {
      const t1 = text1[i] || "";
      const t2 = text2[i] || "";

      if (t1 !== t2) {
        const changes = computeLineDiff(t1, t2);
        
        if (!text1[i]) {
          differences.push({
            page: i + 1,
            text1: "(page missing)",
            text2: t2.substring(0, 500),
            type: "added",
            changes,
          });
        } else if (!text2[i]) {
          differences.push({
            page: i + 1,
            text1: t1.substring(0, 500),
            text2: "(page missing)",
            type: "removed",
            changes,
          });
        } else {
          differences.push({
            page: i + 1,
            text1: t1.substring(0, 500),
            text2: t2.substring(0, 500),
            type: "modified",
            changes,
          });
        }
      }
    }

    return new Response(JSON.stringify({
      differences,
      summary: {
        totalPages1: text1.length,
        totalPages2: text2.length,
        pagesWithDifferences: differences.length,
        identicalPages: maxPages - differences.length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Improved text extraction - handles multiple PDF text encoding patterns
function extractTextFromPDF(buffer: ArrayBuffer): string[] {
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder("latin1").decode(bytes);
  const pages: string[] = [];

  // Split by page objects
  const pageMatches = raw.split(/\/Type\s*\/Page(?!\s*s)/);

  for (let i = 1; i < pageMatches.length; i++) {
    const pageContent = pageMatches[i];
    const textParts: string[] = [];

    // Extract from Tj operators
    const tjMatches = pageContent.matchAll(/\(([^)]*)\)\s*Tj/g);
    for (const match of tjMatches) {
      textParts.push(decodePDFString(match[1]));
    }

    // Extract from TJ arrays
    const tjArrayMatches = pageContent.matchAll(/\[([^\]]*)\]\s*TJ/g);
    for (const match of tjArrayMatches) {
      const inner = match[1];
      const stringMatches = inner.matchAll(/\(([^)]*)\)/g);
      for (const sm of stringMatches) {
        textParts.push(decodePDFString(sm[1]));
      }
    }

    // Extract from ' and " operators (text with line movement)
    const quoteMatches = pageContent.matchAll(/\(([^)]*)\)\s*'/g);
    for (const match of quoteMatches) {
      textParts.push(decodePDFString(match[1]));
    }

    // Look for stream content and try to extract text
    const streamMatches = pageContent.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g);
    for (const sm of streamMatches) {
      const streamContent = sm[1];
      // Extract text from BT...ET blocks
      const btBlocks = streamContent.matchAll(/BT\s*([\s\S]*?)\s*ET/g);
      for (const bt of btBlocks) {
        const blockTj = bt[1].matchAll(/\(([^)]*)\)\s*Tj/g);
        for (const m of blockTj) textParts.push(decodePDFString(m[1]));
        const blockTJ = bt[1].matchAll(/\[([^\]]*)\]\s*TJ/g);
        for (const m of blockTJ) {
          const strs = m[1].matchAll(/\(([^)]*)\)/g);
          for (const s of strs) textParts.push(decodePDFString(s[1]));
        }
      }
    }

    const joined = textParts.join(" ").replace(/\s+/g, " ").trim();
    pages.push(joined);
  }

  if (pages.length === 0) pages.push("");
  return pages;
}

function decodePDFString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

// Line-by-line diff algorithm
function computeLineDiff(text1: string, text2: string): Array<{ type: "added" | "removed" | "unchanged"; text: string }> {
  const words1 = text1.split(/\s+/).filter(Boolean);
  const words2 = text2.split(/\s+/).filter(Boolean);
  const changes: Array<{ type: "added" | "removed" | "unchanged"; text: string }> = [];

  // Simple LCS-based word diff
  const m = words1.length;
  const n = words2.length;
  
  // For very large texts, fall back to simple comparison
  if (m > 500 || n > 500) {
    if (text1 !== text2) {
      changes.push({ type: "removed", text: text1.substring(0, 300) });
      changes.push({ type: "added", text: text2.substring(0, 300) });
    }
    return changes;
  }

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (words1[i - 1] === words2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  let i = m, j = n;
  const result: Array<{ type: "added" | "removed" | "unchanged"; text: string }> = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && words1[i - 1] === words2[j - 1]) {
      result.unshift({ type: "unchanged", text: words1[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", text: words2[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", text: words1[i - 1] });
      i--;
    }
  }

  // Merge consecutive same-type entries
  for (const r of result) {
    if (changes.length > 0 && changes[changes.length - 1].type === r.type) {
      changes[changes.length - 1].text += " " + r.text;
    } else {
      changes.push({ ...r });
    }
  }

  return changes.slice(0, 50); // Limit output size
}
