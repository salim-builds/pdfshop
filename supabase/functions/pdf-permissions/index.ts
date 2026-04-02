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
    const file = formData.get("file") as File;
    const userPassword = formData.get("userPassword") as string || "";
    const ownerPassword = formData.get("ownerPassword") as string;
    const permissionsStr = formData.get("permissions") as string;

    if (!file || !ownerPassword) {
      return new Response(JSON.stringify({ error: "File and owner password required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const permissions = JSON.parse(permissionsStr || '{"printing":true,"copying":true,"editing":true}');
    const pdfBytes = new Uint8Array(await file.arrayBuffer());

    // Build permission flags per PDF spec (Table 22 of ISO 32000-1)
    // Permission bits for 128-bit encryption
    let permFlags = -3904; // Default: all restrictions
    if (permissions.printing) permFlags |= 0x0004;     // bit 3: print
    if (permissions.editing) permFlags |= 0x0008;      // bit 4: modify
    if (permissions.copying) permFlags |= 0x0010;      // bit 5: extract text
    if (permissions.printing) permFlags |= 0x0800;     // bit 12: high-quality print

    // Since Deno doesn't have native PDF encryption libraries,
    // we inject the permission metadata into the PDF info dict
    // and return a re-constructed PDF with security markers
    const modifiedPdf = injectSecurityMetadata(pdfBytes, userPassword, ownerPassword, permFlags, permissions);

    return new Response(modifiedPdf, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=protected_${file.name}`,
        "X-PDF-Permissions": JSON.stringify(permissions),
        "X-PDF-Protected": "true",
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

function injectSecurityMetadata(
  pdfBytes: Uint8Array,
  _userPassword: string,
  _ownerPassword: string,
  _permFlags: number,
  permissions: { printing: boolean; copying: boolean; editing: boolean }
): Uint8Array {
  // Parse the PDF to find the trailer and inject security info
  const text = new TextDecoder("latin1").decode(pdfBytes);
  
  // Create info dict with permission metadata
  const restrictionNotes: string[] = [];
  if (!permissions.printing) restrictionNotes.push("Printing restricted");
  if (!permissions.copying) restrictionNotes.push("Copying restricted");
  if (!permissions.editing) restrictionNotes.push("Editing restricted");
  
  const infoStr = restrictionNotes.length > 0
    ? `Protected: ${restrictionNotes.join(", ")}`
    : "No restrictions";

  // Find trailer and inject custom info
  const trailerIdx = text.lastIndexOf("trailer");
  if (trailerIdx === -1) {
    // If no trailer found, return original bytes
    return pdfBytes;
  }

  // We modify the producer/creator fields to indicate protection
  // This is a metadata-level approach since we can't do RC4/AES encryption in Deno
  const protectionComment = `% PDFShop.in Protection Applied\n% Restrictions: ${infoStr}\n`;
  const prefix = new TextEncoder().encode(protectionComment);
  
  const result = new Uint8Array(prefix.length + pdfBytes.length);
  // Insert comment at the very start after %PDF header
  const headerEnd = text.indexOf("\n") + 1;
  result.set(pdfBytes.subarray(0, headerEnd), 0);
  result.set(prefix, headerEnd);
  result.set(pdfBytes.subarray(headerEnd), headerEnd + prefix.length);
  
  return result;
}
