import { supabase } from '../supabase';
import type { Publication, PublicationSection } from '@/types/app.types';

export const SITE_SERVICE = {
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
  }
};
