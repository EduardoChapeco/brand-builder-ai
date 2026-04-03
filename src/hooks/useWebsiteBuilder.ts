import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createDefaultPageDraft, createDefaultSection } from '@/lib/websites/defaults';
import {
  createWebsiteDraft,
  createWebsitePage,
  loadWebsiteBuilderData,
  persistWebsiteSections,
  updateWebsiteMeta,
  updateWebsitePage,
} from '@/lib/websites/service';
import type { WebsiteBuilderData, WebsitePageRecord, WebsiteRecord, WebsiteSectionRecord, WebsiteSectionType } from '@/lib/websites/types';

const pushHistory = (section: WebsiteSectionRecord): WebsiteSectionRecord => ({
  ...section,
  version: section.version + 1,
  updated_at: new Date().toISOString(),
  snapshot_history: [
    ...section.snapshot_history.slice(-4),
    {
      version: section.version,
      content: section.content,
      bg_type: section.bg_type,
      bg_value: section.bg_value,
      is_visible: section.is_visible,
      updated_at: section.updated_at,
    },
  ],
});

export function useWebsiteBuilder(workspaceId: string | undefined, siteId: string | undefined) {
  const [website, setWebsite] = useState<WebsiteRecord | null>(null);
  const [pages, setPages] = useState<WebsitePageRecord[]>([]);
  const [sectionsByPage, setSectionsByPage] = useState<Record<string, WebsiteSectionRecord[]>>({});
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sourceMode, setSourceMode] = useState<WebsiteBuilderData['sourceMode']>('sections');
  const [isDirty, setIsDirty] = useState(false);

  const activePage = useMemo(
    () => pages.find((page) => page.id === activePageId) || null,
    [pages, activePageId],
  );

  const activeSections = useMemo(
    () => (activePageId ? sectionsByPage[activePageId] || [] : []),
    [activePageId, sectionsByPage],
  );

  const selectedSection = useMemo(
    () => activeSections.find((section) => section.id === selectedSectionId) || null,
    [activeSections, selectedSectionId],
  );

  const load = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (!siteId || siteId === 'new') {
        const draftWebsite: WebsiteRecord = {
          id: 'draft-site',
          workspace_id: workspaceId,
          name: 'Novo site',
          domain: null,
          status: 'draft',
          global_config: {},
          brand_kit_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const draftPage = createDefaultPageDraft(draftWebsite.id);
        const draftSection = createDefaultSection('hero', workspaceId, draftPage.id, 0);
        setWebsite(draftWebsite);
        setPages([draftPage]);
        setSectionsByPage({ [draftPage.id]: [draftSection] });
        setActivePageId(draftPage.id);
        setSelectedSectionId(draftSection.id);
        setSourceMode('sections');
        setIsDirty(false);
      } else {
        const data = await loadWebsiteBuilderData(siteId, workspaceId);
        setWebsite(data.website);
        setPages(data.pages);
        setSectionsByPage(data.sectionsByPage);
        setSourceMode(data.sourceMode);
        const initialPage = data.pages.find((page) => page.is_home) || data.pages[0] || null;
        const initialSections = initialPage ? data.sectionsByPage[initialPage.id] || [] : [];
        setActivePageId(initialPage?.id || null);
        setSelectedSectionId(initialSections[0]?.id || null);
        setIsDirty(false);
      }
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel carregar o Website Builder.');
    } finally {
      setLoading(false);
    }
  }, [siteId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const markDirty = () => setIsDirty(true);

  const updateWebsite = (patch: Partial<WebsiteRecord>) => {
    setWebsite((current) => (current ? { ...current, ...patch } : current));
    markDirty();
  };

  const updatePage = (pageId: string, patch: Partial<WebsitePageRecord>) => {
    setPages((current) => current.map((page) => (page.id === pageId ? { ...page, ...patch } : page)));
    markDirty();
  };

  const addPage = async (title: string, slug: string) => {
    if (!website) return;

    if (website.id === 'draft-site') {
      const pageDraft: WebsitePageRecord = {
        id: crypto.randomUUID(),
        website_id: website.id,
        title,
        slug,
        is_home: false,
        status: 'draft',
        seo_metadata: { title, description: '' },
        content_blocks: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_temporary: true,
      };
      const draftSection = createDefaultSection('hero', website.workspace_id, pageDraft.id, 0);
      setPages((current) => [...current, pageDraft]);
      setSectionsByPage((current) => ({ ...current, [pageDraft.id]: [draftSection] }));
      setActivePageId(pageDraft.id);
      setSelectedSectionId(draftSection.id);
      markDirty();
      return;
    }

    try {
      const page = await createWebsitePage({ websiteId: website.id, title, slug });
      const draftSection = createDefaultSection('hero', website.workspace_id, page.id, 0);
      setPages((current) => [...current, page]);
      setSectionsByPage((current) => ({ ...current, [page.id]: [draftSection] }));
      setActivePageId(page.id);
      setSelectedSectionId(draftSection.id);
      setIsDirty(true);
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel criar a pagina.');
    }
  };

  const addSection = (sectionType: WebsiteSectionType) => {
    if (!website || !activePageId) return;

    const nextSection = createDefaultSection(sectionType, website.workspace_id, activePageId, activeSections.length);
    setSectionsByPage((current) => ({
      ...current,
      [activePageId]: [...(current[activePageId] || []), nextSection],
    }));
    setSelectedSectionId(nextSection.id);
    markDirty();
  };

  const updateSection = (sectionId: string, patch: Partial<WebsiteSectionRecord>) => {
    if (!activePageId) return;

    setSectionsByPage((current) => ({
      ...current,
      [activePageId]: (current[activePageId] || []).map((section) =>
        section.id === sectionId
          ? {
              ...pushHistory(section),
              ...patch,
              updated_at: new Date().toISOString(),
            }
          : section,
      ),
    }));
    markDirty();
  };

  const updateSectionContent = (sectionId: string, contentPatch: Record<string, unknown>) => {
    if (!activePageId) return;

    setSectionsByPage((current) => ({
      ...current,
      [activePageId]: (current[activePageId] || []).map((section) =>
        section.id === sectionId
          ? {
              ...pushHistory(section),
              content: { ...section.content, ...contentPatch },
              updated_at: new Date().toISOString(),
            }
          : section,
      ),
    }));
    markDirty();
  };

  const removeSection = (sectionId: string) => {
    if (!activePageId) return;
    const nextSections = activeSections.filter((section) => section.id !== sectionId);
    setSectionsByPage((current) => ({ ...current, [activePageId]: nextSections }));
    setSelectedSectionId(nextSections[0]?.id || null);
    markDirty();
  };

  const reorderSections = (orderedIds: string[]) => {
    if (!activePageId) return;

    const currentSections = sectionsByPage[activePageId] || [];
    const nextSections = orderedIds
      .map((id, index) => {
        const section = currentSections.find((item) => item.id === id);
        return section ? { ...section, sort_order: index, updated_at: new Date().toISOString() } : null;
      })
      .filter((section): section is WebsiteSectionRecord => Boolean(section));

    setSectionsByPage((current) => ({ ...current, [activePageId]: nextSections }));
    markDirty();
  };

  const save = useCallback(async () => {
    if (!workspaceId || !website) return null;

    setSaving(true);
    try {
      let persistedWebsite = website;
      let persistedPages = [...pages];
      let nextSectionsByPage = { ...sectionsByPage };

      if (website.id === 'draft-site') {
        const created = await createWebsiteDraft({
          workspaceId,
          name: website.name,
          domain: website.domain,
        });

        persistedWebsite = created.website;
        const originalHomePage = pages.find((page) => page.is_home) || pages[0];
        const nextPages = pages.map((page) =>
          page.id === originalHomePage?.id
            ? { ...created.homePage, title: page.title, slug: page.slug, seo_metadata: page.seo_metadata }
            : page,
        );

        const remappedSections: Record<string, WebsiteSectionRecord[]> = {};
        for (const page of nextPages) {
          const originalPageId = page.id === created.homePage.id ? originalHomePage?.id || page.id : page.id;
          remappedSections[page.id] = (nextSectionsByPage[originalPageId] || []).map((section, index) => ({
            ...section,
            page_id: page.id,
            workspace_id: workspaceId,
            sort_order: index,
          }));
        }

        persistedPages = nextPages;
        nextSectionsByPage = remappedSections;
        setWebsite(persistedWebsite);
      }

      await updateWebsiteMeta({
        websiteId: persistedWebsite.id,
        name: persistedWebsite.name,
        domain: persistedWebsite.domain,
        status: persistedWebsite.status,
        globalConfig: persistedWebsite.global_config || {},
      });

      for (const page of persistedPages) {
        let persistedPage = page;
        if (page.is_temporary) {
          persistedPage = await createWebsitePage({
            websiteId: persistedWebsite.id,
            title: page.title,
            slug: page.slug,
          });
          persistedPages = persistedPages.map((item) => (item.id === page.id ? persistedPage : item));

          const pageSections = (nextSectionsByPage[page.id] || []).map((section, index) => ({
            ...section,
            page_id: persistedPage.id,
            workspace_id: workspaceId,
            sort_order: index,
          }));
          delete nextSectionsByPage[page.id];
          nextSectionsByPage[persistedPage.id] = pageSections;
        }

        const pageSections = (nextSectionsByPage[persistedPage.id] || []).map((section, index) => ({
          ...section,
          page_id: persistedPage.id,
          workspace_id: workspaceId,
          sort_order: index,
        }));

        await updateWebsitePage(persistedPage, pageSections);
        const mode = await persistWebsiteSections({
          workspaceId,
          pageId: persistedPage.id,
          sections: pageSections,
        });
        setSourceMode(mode);
      }

      setWebsite({ ...persistedWebsite });
      setPages(persistedPages.map((page) => ({ ...page, is_temporary: false })));
      setSectionsByPage(nextSectionsByPage);
      setActivePageId((current) => {
        if (!current) return persistedPages[0]?.id || null;
        if (nextSectionsByPage[current]) return current;
        return persistedPages[0]?.id || null;
      });
      setIsDirty(false);
      toast.success('Website salvo com sucesso.');
      return persistedWebsite.id;
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel salvar o website.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [pages, sectionsByPage, website, workspaceId]);

  return {
    website,
    pages,
    activePage,
    activePageId,
    activeSections,
    selectedSection,
    selectedSectionId,
    loading,
    saving,
    isDirty,
    sourceMode,
    setActivePageId,
    setSelectedSectionId,
    updateWebsite,
    updatePage,
    addPage,
    addSection,
    updateSection,
    updateSectionContent,
    removeSection,
    reorderSections,
    save,
    reload: load,
  };
}
