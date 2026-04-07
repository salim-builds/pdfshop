import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional count param (default 60)
    let count = 60;
    try {
      const body = await req.json();
      if (body?.count && typeof body.count === "number") count = Math.min(body.count, 60);
    } catch { /* no body is fine */ }

    // Fetch unused keywords
    const { data: keywords, error: kwErr } = await supabase
      .from("blog_keywords")
      .select("id, keyword")
      .eq("used", false)
      .limit(count);

    if (kwErr) throw kwErr;
    if (!keywords || keywords.length === 0) {
      return new Response(JSON.stringify({ message: "No unused keywords available", generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing blog posts for internal linking
    const { data: existingBlogs } = await supabase
      .from("blog_posts")
      .select("slug, title, keywords")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(100);

    const toolPages = [
      { slug: "/compress-pdf", label: "Compress PDF" },
      { slug: "/merge-pdf", label: "Merge PDF" },
      { slug: "/split-pdf", label: "Split PDF" },
      { slug: "/jpg-to-pdf", label: "JPG to PDF" },
      { slug: "/html-to-pdf", label: "HTML to PDF" },
      { slug: "/rotate-pdf", label: "Rotate PDF" },
      { slug: "/watermark-pdf", label: "Watermark PDF" },
      { slug: "/protect-pdf", label: "Protect PDF" },
      { slug: "/crop-pdf", label: "Crop PDF" },
      { slug: "/repair-pdf", label: "Repair PDF" },
      { slug: "/redact-pdf", label: "Redact PDF" },
      { slug: "/remove-pages", label: "Remove Pages" },
      { slug: "/reorder-pages", label: "Reorder Pages" },
      { slug: "/extract-pages", label: "Extract Pages" },
      { slug: "/convert-pdfa", label: "Convert to PDF/A" },
    ];

    const aiFeatures = [
      { slug: "/ai-summary", label: "AI PDF Summary" },
      { slug: "/ai-chat-pdf", label: "AI Chat with PDF" },
      { slug: "/ai-translate", label: "AI Translate PDF" },
      { slug: "/ai-search", label: "AI Search PDF" },
      { slug: "/ai-insights", label: "AI PDF Insights" },
    ];

    const results: any[] = [];

    for (const kw of keywords) {
      try {
        const potentialSlug = kw.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const { data: existing } = await supabase
          .from("blog_posts")
          .select("id")
          .eq("slug", potentialSlug)
          .maybeSingle();

        if (existing) {
          await supabase.from("blog_keywords").update({ used: true, used_at: new Date().toISOString() }).eq("id", kw.id);
          results.push({ keyword: kw.keyword, status: "skipped", reason: "slug exists" });
          continue;
        }

        // Find related blogs by matching keyword words
        const kwWords = kw.keyword.toLowerCase().split(/\s+/);
        const relatedBlogs = (existingBlogs || [])
          .filter(b => {
            const blogText = `${b.title} ${(b.keywords || []).join(" ")}`.toLowerCase();
            return kwWords.some(w => w.length > 3 && blogText.includes(w));
          })
          .slice(0, 3)
          .map(b => `- [${b.title}](/blog/${b.slug})`);

        // Pick 2 relevant tool pages
        const relevantTools = toolPages
          .filter(t => kwWords.some(w => t.label.toLowerCase().includes(w)))
          .slice(0, 2);
        if (relevantTools.length < 2) {
          const shuffled = toolPages.sort(() => Math.random() - 0.5);
          for (const t of shuffled) {
            if (!relevantTools.find(r => r.slug === t.slug)) relevantTools.push(t);
            if (relevantTools.length >= 2) break;
          }
        }
        const toolLinks = relevantTools.map(t => `- [${t.label}](${t.slug})`).join("\n");

        // Pick 1 AI feature
        const aiLink = aiFeatures[Math.floor(Math.random() * aiFeatures.length)];

        const blogLinks = relatedBlogs.length > 0
          ? relatedBlogs.join("\n")
          : "- [How to Compress PDF Online](/blog/compress-pdf-online)\n- [Best PDF Tools Guide](/blog/best-pdf-tools-2026)";

        const systemPrompt = `You are an expert SEO blog writer for PDFShop.in, a free online PDF tools platform.
Write blog posts that rank on Google. Use simple English. Be helpful and informative.

IMPORTANT RULES:
- Write 1200-1800 words
- Natural keyword placement (keyword density 1-2%, not spam)
- Write in a friendly, human tone
- Include practical tips
- Format with markdown headings (##, ###)
- Add bullet points for lists
- Max 4-5 internal links total, placed naturally within paragraphs (not bunched together)

You must return a JSON object with these exact fields:
- title: SEO optimized title (include year 2026 if relevant)
- slug: URL-friendly slug (lowercase, hyphens, no special chars)
- metaTitle: SEO meta title under 60 chars
- metaDescription: Under 160 chars meta description
- keywords: Array of 6-8 related keywords
- readingTime: Estimated reading time in minutes (number)
- content: Full blog post in markdown format

The content MUST include these sections in order:
1. Introduction (100-150 words)
2. ## What is [Topic]? (brief explanation)
3. ## How to [Action] - Step by Step (3-5 steps with ### for each)
4. ## Benefits of Using PDFShop (3-4 benefits)
5. ## Tips and Best Practices (3-4 tips)
6. ## Frequently Asked Questions (3-5 Q&As formatted as ### Question then answer)
7. ## Conclusion with CTA: "Try PDFShop tools for free"

INTERNAL LINKING INSTRUCTIONS (CRITICAL):
Naturally weave these links into your paragraphs. Do NOT list them separately. Use the anchor text contextually.

Tool pages to link (pick 2, place in relevant paragraphs):
${toolLinks}

Related blog posts to link (pick 1-2, place in relevant paragraphs):
${blogLinks}

AI feature to link (place once in content):
- [${aiLink.label}](${aiLink.slug})

Example of GOOD natural linking:
"If you need to reduce file size, our [Compress PDF](/compress-pdf) tool makes it easy. You can also check our guide on [how to merge PDFs](/blog/merge-pdf-online) for combining multiple documents."

Example of BAD linking (avoid this):
"Related links: [Link1](/page1), [Link2](/page2), [Link3](/page3)"

DO NOT wrap the JSON in markdown code blocks. Return raw JSON only.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Write a comprehensive SEO blog post targeting the keyword: "${kw.keyword}". The blog should help users understand and use PDFShop.in tools.` },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "create_blog_post",
                  description: "Create a structured SEO blog post",
                  parameters: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      slug: { type: "string" },
                      metaTitle: { type: "string" },
                      metaDescription: { type: "string" },
                      keywords: { type: "array", items: { type: "string" } },
                      readingTime: { type: "number" },
                      content: { type: "string" },
                    },
                    required: ["title", "slug", "metaTitle", "metaDescription", "keywords", "readingTime", "content"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "create_blog_post" } },
          }),
        });

        if (!aiResponse.ok) {
          const status = aiResponse.status;
          results.push({ keyword: kw.keyword, status: "failed", reason: `AI error ${status}` });
          if (status === 429) {
            // Rate limited - stop generating more
            break;
          }
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        
        let blogData: any;
        if (toolCall?.function?.arguments) {
          blogData = JSON.parse(toolCall.function.arguments);
        } else {
          const raw = aiData.choices?.[0]?.message?.content || "";
          const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          blogData = JSON.parse(cleaned);
        }

        const cleanSlug = blogData.slug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        // Check slug uniqueness again
        const { data: slugCheck } = await supabase
          .from("blog_posts")
          .select("id")
          .eq("slug", cleanSlug)
          .maybeSingle();

        if (slugCheck) {
          await supabase.from("blog_keywords").update({ used: true, used_at: new Date().toISOString() }).eq("id", kw.id);
          results.push({ keyword: kw.keyword, status: "skipped", reason: "slug exists after generation" });
          continue;
        }

        // Save blog post (use a system user_id placeholder since this is automated)
        const { error: dbError } = await supabase
          .from("blog_posts")
          .insert({
            user_id: "00000000-0000-0000-0000-000000000000",
            title: blogData.title,
            slug: cleanSlug,
            content: blogData.content,
            meta_title: blogData.metaTitle || blogData.title,
            meta_description: blogData.metaDescription,
            keywords: blogData.keywords,
            reading_time: blogData.readingTime || 5,
            status: "published",
          });

        if (dbError) {
          if (dbError.code === "23505") {
            results.push({ keyword: kw.keyword, status: "skipped", reason: "duplicate slug" });
          } else {
            results.push({ keyword: kw.keyword, status: "failed", reason: dbError.message });
          }
        } else {
          results.push({ keyword: kw.keyword, status: "published", slug: cleanSlug });
        }

        // Mark keyword as used
        await supabase.from("blog_keywords").update({ used: true, used_at: new Date().toISOString() }).eq("id", kw.id);

        // Notify IndexNow about the new blog post
        try {
          const indexNowUrl = `${supabaseUrl}/functions/v1/indexnow`;
          await fetch(indexNowUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
            body: JSON.stringify({ slugs: [cleanSlug] }),
          });
          console.log(`IndexNow pinged for /blog/${cleanSlug}`);
        } catch (e) {
          console.warn("IndexNow ping failed:", e);
        }

        // Small delay between generations to avoid rate limits
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Error for keyword "${kw.keyword}":`, e);
        results.push({ keyword: kw.keyword, status: "failed", reason: e instanceof Error ? e.message : "Unknown error" });
      }
    }

    return new Response(JSON.stringify({
      generated: results.filter(r => r.status === "published").length,
      total: results.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-generate-blogs error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
