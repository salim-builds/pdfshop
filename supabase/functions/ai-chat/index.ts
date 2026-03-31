import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_LIMITS: Record<string, { chats: number; maxChars: number; maxTokens: number }> = {
  free: { chats: 0, maxChars: 0, maxTokens: 0 },
  basic: { chats: 5, maxChars: 3000, maxTokens: 250 },
  pro: { chats: 30, maxChars: 15000, maxTokens: 500 },
  business: { chats: 80, maxChars: 30000, maxTokens: 800 },
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

    // Get user plan
    const { data: profile } = await supabase.from("profiles").select("plan").eq("user_id", user.id).single();
    const plan = profile?.plan || "free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    // Block free users
    if (plan === "free") {
      return new Response(JSON.stringify({ error: "upgrade_required", message: "Upgrade to use AI features." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pdfText, question } = await req.json();
    if (!pdfText || !question) throw new Error("Missing pdfText or question");

    // Check daily usage limits
    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabase
      .from("ai_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    if (usage && usage.chats_used >= limits.chats) {
      return new Response(JSON.stringify({
        error: "limit_reached",
        message: `Daily AI limit reached (${limits.chats} chats). Upgrade your plan for more.`,
        chats_used: usage.chats_used,
        chats_limit: limits.chats,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert usage
    if (usage) {
      await supabase.from("ai_usage").update({ chats_used: usage.chats_used + 1 }).eq("id", usage.id);
    } else {
      await supabase.from("ai_usage").insert({ user_id: user.id, usage_date: today, chats_used: 1 });
    }

    const truncatedText = pdfText.slice(0, limits.maxChars);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a helpful PDF assistant. Answer questions about the document concisely using bullet points. Keep answers brief." },
          { role: "user", content: `Document content:\n${truncatedText}\n\nQuestion: ${question}` },
        ],
        max_tokens: limits.maxTokens,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const result = await aiResponse.json();
    const answer = result.choices?.[0]?.message?.content || "Could not generate answer.";

    const chatsUsed = (usage?.chats_used || 0) + 1;
    const threshold80 = Math.floor(limits.chats * 0.8);
    const nearingLimit = chatsUsed >= threshold80 && chatsUsed < limits.chats;

    return new Response(JSON.stringify({
      answer,
      usage: { chats_used: chatsUsed, chats_limit: limits.chats, warning: nearingLimit },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
