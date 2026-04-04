import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SITE_SERVICE } from '@/lib/sites/service';
import type { Publication, PublicationSection } from '@/types/app.types';

export function useWebsiteBuilder(workspaceId: string | undefined, siteId: string | undefined) {
  const [publication, setPublication] = useState<Publication | null>(null);
  const [sections, setSections] = useState<PublicationSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) || null,
    [sections, selectedSectionId],
  );

  const load = useCallback(async () => {
    if (!workspaceId || !siteId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await SITE_SERVICE.getSiteData(siteId, workspaceId);
      setPublication(data.publication);
      setSections(data.sections);
      setDeletedIds([]);
      if (data.sections.length > 0) {
        setSelectedSectionId(data.sections[0].id);
      }
      setIsDirty(false);
    } catch (error) {
      console.error('[SiteBuilder] Error loading data:', error);
      toast.error('Não foi possível carregar o Site Builder.');
    } finally {
      setLoading(false);
    }
  }, [siteId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const markDirty = () => setIsDirty(true);

  const addSection = (sectionType: string) => {
    if (!publication || !workspaceId) return;

    const nextSection: Partial<PublicationSection> = {
      id: crypto.randomUUID(),
      publication_id: publication.id,
      workspace_id: workspaceId,
      section_type: sectionType,
      position: sections.length,
      content: { headline: 'Nova Seção', subheadline: 'Edite o texto clicando aqui.' },
      styles: {},
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setSections((current) => [...current, nextSection as PublicationSection]);
    setSelectedSectionId(nextSection.id as string);
    markDirty();
  };

  const updateSection = (sectionId: string, patch: Partial<PublicationSection>) => {
    setSections((current) => 
      current.map((section) => (section.id === sectionId ? { ...section, ...patch } : section))
    );
    markDirty();
  };

  const updateSectionContent = (sectionId: string, contentPatch: Record<string, unknown>) => {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, content: { ...section.content, ...contentPatch } }
          : section
      )
    );
    markDirty();
  };

  const removeSection = (sectionId: string) => {
    setSections((current) => current.filter((section) => section.id !== sectionId));
    setDeletedIds((prev) => [...prev, sectionId]);
    setSelectedSectionId(sections.find(s => s.id !== sectionId)?.id || null);
    markDirty();
  };

  const save = useCallback(async () => {
    if (!workspaceId || !publication) return null;

    setSaving(true);
    try {
      await SITE_SERVICE.saveSiteDraft(publication, sections, deletedIds);
      setDeletedIds([]);
      setIsDirty(false);
      toast.success('Site salvo com sucesso.');
      return publication.id;
    } catch (error) {
      console.error('[SiteBuilder] Error saving data:', error);
      toast.error('Não foi possível salvar o site.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [sections, publication, workspaceId, deletedIds]);

  const publish = async () => {
    if (!siteId) return;
    setSaving(true);
    try {
      await save();
      await SITE_SERVICE.publishSite(siteId);
      toast.success('Site publicado com sucesso!');
    } catch (error) {
      toast.error('Erro ao publicar site.');
    } finally {
      setSaving(false);
    }
  };


  return {
    publication,
    sections,
    selectedSection,
    selectedSectionId,
    loading,
    saving,
    isDirty,
    setSelectedSectionId,
    addSection,
    updateSection,
    updateSectionContent,
    removeSection,
    save,
    publish,
    reload: load,
  };
}


