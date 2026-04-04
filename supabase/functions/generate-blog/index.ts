import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { keyword } = await req.json();
    if (!keyword || typeof keyword !== "string" || keyword.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Keyword must be at least 3 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert SEO blog writer for PDFShop.in, a free online PDF tools platform.
Write blog posts that rank on Google. Use simple English. Be helpful and informative.

IMPORTANT RULES:
- Write 800-1200 words
- Use natural keyword placement (not spam)
- Write in a friendly, human tone
- Include practical tips
- Format with markdown headings (##, ###)

You must return a JSON object with these exact fields:
- title: SEO optimized title (include year 2026 if relevant)
- slug: URL-friendly slug (lowercase, hyphens, no special chars)
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
7. ## Conclusion with CTA

Internal links to include in the content (use markdown links):
- Link to the relevant tool page (e.g., [Merge PDF Tool](/merge))
- Link to 2 related tools
- Link to 1 AI feature (e.g., [AI PDF Summary](/ai-summary))

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
          { role: "user", content: `Write a comprehensive SEO blog post targeting the keyword: "${keyword.trim()}". The blog should help users understand and use PDFShop.in tools.` },
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
                  title: { type: "string", description: "SEO optimized blog title" },
                  slug: { type: "string", description: "URL-friendly slug" },
                  metaDescription: { type: "string", description: "Meta description under 160 chars" },
                  keywords: { type: "array", items: { type: "string" }, description: "6-8 related keywords" },
                  readingTime: { type: "number", description: "Reading time in minutes" },
                  content: { type: "string", description: "Full blog post in markdown" },
                },
                required: ["title", "slug", "metaDescription", "keywords", "readingTime", "content"],
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
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let blogData: any;
    if (toolCall?.function?.arguments) {
      blogData = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing the message content
      const raw = aiData.choices?.[0]?.message?.content || "";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      blogData = JSON.parse(cleaned);
    }

    // Clean slug
    const cleanSlug = blogData.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Save to database
    const { data: post, error: dbError } = await supabase
      .from("blog_posts")
      .insert({
        user_id: user.id,
        title: blogData.title,
        slug: cleanSlug,
        content: blogData.content,
        meta_description: blogData.metaDescription,
        keywords: blogData.keywords,
        reading_time: blogData.readingTime || 5,
        status: "published",
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      if (dbError.code === "23505") {
        return new Response(JSON.stringify({ error: "A blog post with this slug already exists" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw dbError;
    }

    return new Response(JSON.stringify({ success: true, post }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-blog error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
