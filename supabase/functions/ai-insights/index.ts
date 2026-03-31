import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_LIMITS: Record<string, { maxChars: number; maxTokens: number }> = {
  free: { maxChars: 0, maxTokens: 0 },
  basic: { maxChars: 3000, maxTokens: 400 },
  pro: { maxChars: 15000, maxTokens: 800 },
  business: { maxChars: 30000, maxTokens: 1200 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: profile } = await supabase.from("profiles").select("plan").eq("user_id", user.id).single();
    const plan = profile?.plan || "free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    if (plan === "free") {
      return new Response(JSON.stringify({ error: "upgrade_required", message: "Upgrade to use AI features." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text } = await req.json();
    if (!text) throw new Error("Missing text field");

    const truncatedText = text.slice(0, limits.maxChars);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `You are a document analysis expert. Analyze the given document and provide structured insights in this exact format:

## 📌 Key Points
- [bullet point summaries of the most important information]

## 🔑 Important Keywords
[comma-separated list of important terms and concepts]

## 📑 Document Headings/Sections
- [list of identified sections or topics in the document]

## 💡 Key Takeaways
- [actionable insights or conclusions]

Be concise and precise. Use the exact formatting above.` },
          { role: "user", content: `Analyze this document:\n\n${truncatedText}` },
        ],
        max_tokens: limits.maxTokens,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`OpenAI API error: ${status}`);
    }

    const result = await aiResponse.json();
    const insights = result.choices?.[0]?.message?.content || "Could not generate insights.";

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
