import { supabase } from '../supabase';
import type { Publication, PublicationSection } from '@/types/app.types';

export const SITE_SERVICE = {
  /**
   * Lista todas as publicações do tipo 'site' no workspace
   */
  async listSites(workspaceId: string) {
    const { data: publications, error } = await supabase
      .from('publications')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('type', 'site')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Converte para um formato compatível ou retorna direto
    return publications as Publication[];
  },

  /**
   * Cria uma nova publicação do tipo 'site'
   */
  async createSitePublication(workspaceId: string, name: string) {
    const { data, error } = await supabase
      .from('publications')
      .insert({
        workspace_id: workspaceId,
        type: 'site',
        name,
        slug: name.toLowerCase().replace(/ /g, '-'),
        status: 'draft',
        config: { theme_id: 'dark' },
        seo: { title: name, description: '' }
      })
      .select()
      .single();

    if (error) throw error;
    return data as Publication;
  },
  /**
   * Carrega os dados de um site (publication + seções)
   */
  async getSiteData(id: string, workspaceId: string) {
    const { data: publication, error: pubError } = await supabase
      .from('publications')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .eq('type', 'site')
      .single();

    if (pubError) throw pubError;

    const { data: sections, error: secError } = await supabase
      .from('publication_sections')
      .select('*')
      .eq('publication_id', id)
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    if (secError) throw secError;

    return { publication: publication as Publication, sections: (sections || []) as PublicationSection[] };
  },

  /**
   * Salva alterações em rascunho de um site
   */
  async saveSiteDraft(publication: Partial<Publication>, sections: Partial<PublicationSection>[], deletedIds: string[] = []) {
    if (!publication.id || !publication.workspace_id) throw new Error('ID e WorkspaceID são obrigatórios.');

    const { error: pubError } = await supabase
      .from('publications')
      .update({
        name: publication.name,
        slug: publication.slug,
        status: 'draft',
        config: publication.config,
        seo: publication.seo,
        updated_at: new Date().toISOString()
      })
      .eq('id', publication.id);

    if (pubError) throw pubError;

    // Remover seções excluídas
    if (deletedIds.length > 0) {
      const { error: delError } = await supabase
        .from('publication_sections')
        .delete()
        .in('id', deletedIds)
        .eq('publication_id', publication.id);
      
      if (delError) throw delError;
    }

    // Upsert de seções remanescentes/novas
    if (sections.length > 0) {
      const { error: secError } = await supabase
        .from('publication_sections')
        .upsert(
          sections.map((s, idx) => ({
            ...s,
            publication_id: publication.id,
            workspace_id: publication.workspace_id,
            position: idx,
            updated_at: new Date().toISOString()
          })),
          { onConflict: 'id' }
        );

      if (secError) throw secError;
    }

    return true;
  },


  /**
   * Publica o site mudando o status e registrando timestamp
   */
  async publishSite(id: string) {
    const { error } = await supabase
      .from('publications')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Carrega os dados de um site pelo slug (público)
   */
  async getSiteBySlug(slug: string) {
    const { data: publication, error: pubError } = await supabase
      .from('publications')
      .select('*')
      .eq('slug', slug)
      .eq('type', 'site')
      .maybeSingle();

    if (pubError) throw pubError;
    if (!publication) return null;

    const { data: sections, error: secError } = await supabase
      .from('publication_sections')
      .select('*')
      .eq('publication_id', publication.id)
      .order('position', { ascending: true });

    if (secError) throw secError;

    return { publication: publication as Publication, sections: (sections || []) as PublicationSection[] };
  }
};
