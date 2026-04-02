-- ============================================================
-- Legacy workspace client compatibility
-- ============================================================
-- The current web client still reads/writes several workspace tables
-- directly without an authenticated membership/session bootstrap.
-- Until auth rollout is complete, keep legacy workspace tables operable
-- while SimLab and workspace_members hardening land on the new paths.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Allow all for workspaces') THEN
    CREATE POLICY "Allow all for workspaces" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'briefings' AND policyname = 'Allow all for briefings') THEN
    CREATE POLICY "Allow all for briefings" ON public.briefings FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_kits' AND policyname = 'Allow all for brand_kits') THEN
    CREATE POLICY "Allow all for brand_kits" ON public.brand_kits FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts_v2' AND policyname = 'Allow all for posts_v2') THEN
    CREATE POLICY "Allow all for posts_v2" ON public.posts_v2 FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_articles' AND policyname = 'Allow all for blog_articles') THEN
    CREATE POLICY "Allow all for blog_articles" ON public.blog_articles FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_characters' AND policyname = 'Allow all for brand_characters') THEN
    CREATE POLICY "Allow all for brand_characters" ON public.brand_characters FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'image_prompt_templates' AND policyname = 'Allow all for image_prompt_templates') THEN
    CREATE POLICY "Allow all for image_prompt_templates" ON public.image_prompt_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_assets' AND policyname = 'Allow all for media_assets') THEN
    CREATE POLICY "Allow all for media_assets" ON public.media_assets FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'viral_analyses' AND policyname = 'Allow all for viral_analyses') THEN
    CREATE POLICY "Allow all for viral_analyses" ON public.viral_analyses FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'carousel_storyboards' AND policyname = 'Allow all for carousel_storyboards') THEN
    CREATE POLICY "Allow all for carousel_storyboards" ON public.carousel_storyboards FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'news_items' AND policyname = 'Allow all for news_items') THEN
    CREATE POLICY "Allow all for news_items" ON public.news_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'landing_pages' AND policyname = 'Allow all for landing_pages') THEN
    CREATE POLICY "Allow all for landing_pages" ON public.landing_pages FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow all for projects') THEN
    CREATE POLICY "Allow all for projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_conversations' AND policyname = 'Allow all for platform_conversations') THEN
    CREATE POLICY "Allow all for platform_conversations" ON public.platform_conversations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lovable_integrations' AND policyname = 'Allow all for lovable_integrations') THEN
    CREATE POLICY "Allow all for lovable_integrations" ON public.lovable_integrations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deploy_integrations' AND policyname = 'Allow all for deploy_integrations') THEN
    CREATE POLICY "Allow all for deploy_integrations" ON public.deploy_integrations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_masks' AND policyname = 'Allow all for message_masks') THEN
    CREATE POLICY "Allow all for message_masks" ON public.message_masks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Allow all for api_keys') THEN
    CREATE POLICY "Allow all for api_keys" ON public.api_keys FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_templates' AND policyname = 'Allow all for brand_templates') THEN
    CREATE POLICY "Allow all for brand_templates" ON public.brand_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'competitor_analyses_v2' AND policyname = 'Allow all for competitor_analyses_v2') THEN
    CREATE POLICY "Allow all for competitor_analyses_v2" ON public.competitor_analyses_v2 FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Allow all for messages') THEN
    CREATE POLICY "Allow all for messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bio_links' AND policyname = 'BioLinks workspace insert') THEN
    CREATE POLICY "BioLinks workspace insert" ON public.bio_links FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bio_links' AND policyname = 'BioLinks workspace update') THEN
    CREATE POLICY "BioLinks workspace update" ON public.bio_links FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bio_links' AND policyname = 'BioLinks workspace delete') THEN
    CREATE POLICY "BioLinks workspace delete" ON public.bio_links FOR DELETE USING (true);
  END IF;
END $$;
