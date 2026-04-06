
DROP POLICY "Authenticated users can insert keywords" ON public.blog_keywords;
DROP POLICY "Authenticated users can update keywords" ON public.blog_keywords;

-- Only service role (edge functions) can modify keywords
CREATE POLICY "Service role can insert keywords" ON public.blog_keywords FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update keywords" ON public.blog_keywords FOR UPDATE TO service_role USING (true);
