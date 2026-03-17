
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  summaries_used integer NOT NULL DEFAULT 0,
  chats_used integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" ON public.ai_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own usage" ON public.ai_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own usage" ON public.ai_usage FOR UPDATE USING (auth.uid() = user_id);
