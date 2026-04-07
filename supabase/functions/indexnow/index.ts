import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INDEXNOW_KEY = "151bf601e12445efaf10d755d09622e7";
const HOST = "pdfshop.lovable.app";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    let urls: string[] = [];

    if (body.url) {
      urls = [body.url];
    } else if (body.urls && Array.isArray(body.urls)) {
      urls = body.urls;
    } else if (body.slugs && Array.isArray(body.slugs)) {
      urls = body.slugs.map((s: string) => `https://${HOST}/blog/${s}`);
    } else {
      return new Response(JSON.stringify({ error: "Provide url, urls, or slugs" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (urls.length === 0) {
      return new Response(JSON.stringify({ error: "No URLs provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch up to 10000 URLs per IndexNow spec
    const urlList = urls.slice(0, 10000).map(u =>
      u.startsWith("http") ? u : `https://${HOST}${u.startsWith("/") ? u : `/${u}`}`
    );

    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    };

    console.log(`IndexNow: Submitting ${urlList.length} URL(s)`);

    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    let responseText = "";
    try { responseText = await response.text(); } catch {}

    // IndexNow returns 200 or 202 on success
    const success = status === 200 || status === 202;

    console.log(`IndexNow response: ${status} ${responseText}`);

    return new Response(JSON.stringify({
      success,
      status,
      submitted: urlList.length,
      urls: urlList,
      response: responseText || null,
    }), {
      status: success ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("IndexNow error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
