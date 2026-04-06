
-- Create blog_keywords table for keyword rotation
CREATE TABLE public.blog_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read keywords" ON public.blog_keywords FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert keywords" ON public.blog_keywords FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update keywords" ON public.blog_keywords FOR UPDATE TO authenticated USING (true);

-- Seed keywords
INSERT INTO public.blog_keywords (keyword) VALUES
  ('merge pdf online free'),
  ('split pdf online'),
  ('compress pdf online'),
  ('pdf to word converter free'),
  ('word to pdf converter'),
  ('jpg to pdf converter'),
  ('pdf to jpg converter online'),
  ('compress pdf without losing quality'),
  ('how to merge pdf without software'),
  ('best pdf tools online'),
  ('free pdf editor online'),
  ('edit pdf online free'),
  ('secure pdf tools online'),
  ('how to split pdf pages'),
  ('best free pdf tools for students'),
  ('ai pdf summarizer free'),
  ('chat with pdf ai'),
  ('translate pdf online free'),
  ('ai document analysis tool'),
  ('how to compress pdf for whatsapp'),
  ('pdf to word converter free without login'),
  ('combine pdf files online free'),
  ('reduce pdf size online'),
  ('how to convert pdf to word editable'),
  ('pdf converter free download'),
  ('how to edit pdf online free'),
  ('best pdf tools 2026'),
  ('merge pdf online free india'),
  ('compress pdf online under 100kb'),
  ('how to rotate pdf pages online');

-- Add meta_title to blog_posts if not exists
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS meta_title text;
