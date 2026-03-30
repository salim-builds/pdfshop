import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { plan_id } = await req.json();
    if (!plan_id || !["basic", "pro", "business"].includes(plan_id)) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400, headers: corsHeaders });
    }

    const amounts: Record<string, number> = {
      basic: 9900,     // ₹99 in paise
      pro: 29900,      // ₹299 in paise
      business: 49900, // ₹499 in paise
    };

    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: amounts[plan_id],
        currency: "INR",
        receipt: `${user.id.slice(0, 8)}_${plan_id}_${Date.now().toString(36)}`,
        notes: { user_id: user.id, plan_id },
      }),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      console.error("Razorpay error:", errText);
      return new Response(JSON.stringify({ error: "Failed to create order" }), { status: 500, headers: corsHeaders });
    }

    const order = await orderRes.json();

    return new Response(JSON.stringify({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
