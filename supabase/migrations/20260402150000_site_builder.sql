-- Migration para o Website Builder Múltiplas Páginas no PostGen
-- Cria a estrutura para hospedar sites completos conectados ao Workspace

CREATE TABLE IF NOT EXISTS public.websites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    domain TEXT UNIQUE, -- Domínio customizado ou subdomínio (ex: mybrand.postgen.ai)
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    brand_kit_id UUID REFERENCES public.brand_kits(id) ON DELETE SET NULL, -- Vincula cores/logos nativos
    global_config JSONB DEFAULT '{}'::jsonb, -- Estilo global (Minimalist, Glass, Dark, etc)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.website_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    website_id UUID REFERENCES public.websites(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL, -- '/', '/sobre', '/blog', etc
    is_home BOOLEAN DEFAULT false,
    seo_metadata JSONB DEFAULT '{"title": "", "description": "", "keywords": []}'::jsonb,
    content_blocks JSONB DEFAULT '[]'::jsonb, -- Array de blocos de componentes (Framer Motion, Liquid Glass, etc)
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(website_id, slug) -- Uma URL por site
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;

-- Políticas para websites
CREATE POLICY "Workspaces podem ver seus websites" 
    ON public.websites FOR SELECT 
    USING (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Workspaces podem gerenciar seus websites" 
    ON public.websites FOR ALL 
    USING (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    ));

-- Políticas para website_pages
CREATE POLICY "Workspaces podem ver páginas de seus websites" 
    ON public.website_pages FOR SELECT 
    USING (website_id IN (
        SELECT id FROM public.websites WHERE workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Workspaces podem gerenciar páginas de seus websites" 
    ON public.website_pages FOR ALL 
    USING (website_id IN (
        SELECT id FROM public.websites WHERE workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'editor')
        )
    ));

-- Triggers de timestamp
CREATE TRIGGER update_websites_updated_at
    BEFORE UPDATE ON public.websites
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_website_pages_updated_at
    BEFORE UPDATE ON public.website_pages
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
