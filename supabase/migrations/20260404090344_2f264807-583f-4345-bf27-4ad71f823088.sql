
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  meta_description TEXT,
  keywords TEXT[] DEFAULT '{}',
  reading_time INTEGER DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published blogs"
ON public.blog_posts FOR SELECT
USING (status = 'published');

CREATE POLICY "Authenticated users can create blogs"
ON public.blog_posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blogs"
ON public.blog_posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blogs"
ON public.blog_posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
