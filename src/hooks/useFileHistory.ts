import { supabase } from "@/integrations/supabase/client";

export async function recordFileHistory(toolUsed: string, fileName: string, fileSize?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("file_history").insert({
    user_id: user.id,
    tool_used: toolUsed,
    file_name: fileName,
    file_size: fileSize ?? null,
    status: "completed",
  });
}
