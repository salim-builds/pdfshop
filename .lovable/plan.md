## Auto Blog Generator System

### 1. Database Setup
- Create `blog_posts` table (title, slug, content, meta_description, keywords, status, reading_time, created_at)
- Public read access RLS, admin write access

### 2. Edge Function: `generate-blog`
- Takes keyword input, generates 800-1200 word SEO article using Lovable AI
- Auto-generates slug, meta title, description, internal links
- Saves to database

### 3. Frontend Pages
- `/blog` — Blog listing page with all published posts
- `/blog/:slug` — Individual blog post page with full SEO (Helmet, JSON-LD)
- Blog post page includes: title, reading time, content sections, CTAs linking to tools, related tools, AI tools

### 4. Blog Admin (Dashboard)
- Simple form: enter keyword → generate blog → auto-publish
- List of generated blogs with status

### 5. Pre-seed with keyword-based blogs
- Generate initial blog entries for top keywords

### 6. Update sitemap & navbar
- Add blog link to navbar
- Include blog URLs in sitemap
