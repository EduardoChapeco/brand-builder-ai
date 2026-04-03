import { fromTable } from '@/integrations/supabase/db-custom';
import type { Json } from '@/integrations/supabase/types';
import { createDefaultPageDraft, createDefaultSection } from './defaults';
import type {
  WebsiteBuilderData,
  WebsitePageRecord,
  WebsiteRecord,
  WebsiteSectionRecord,
} from './types';

const WEBSITE_SELECT = 'id,workspace_id,name,domain,status,global_config,brand_kit_id,created_at,updated_at';
const WEBSITE_PAGE_SELECT = 'id,website_id,title,slug,is_home,seo_metadata,content_blocks,status,created_at,updated_at';
const WEBSITE_SECTION_SELECT =
  'id,page_id,workspace_id,section_type,sort_order,is_visible,content,bg_type,bg_value,padding_top,padding_bottom,style_override,scroll_animation,version,snapshot_history,created_at,updated_at';

const nowIso = () => new Date().toISOString();

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const isMissingTableError = (error: unknown) =>
  Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && (error as { code?: string }).code === '42P01',
  );

const normalizeSectionRecord = (
  raw: Record<string, unknown>,
  workspaceId: string,
  pageId: string,
  sortOrder: number,
): WebsiteSectionRecord => ({
  id: typeof raw.id === 'string' ? raw.id : crypto.randomUUID(),
  page_id: typeof raw.page_id === 'string' ? raw.page_id : pageId,
  workspace_id: typeof raw.workspace_id === 'string' ? raw.workspace_id : workspaceId,
  section_type: typeof raw.section_type === 'string' ? raw.section_type as WebsiteSectionRecord['section_type'] : 'legacy_block',
  sort_order: typeof raw.sort_order === 'number' ? raw.sort_order : sortOrder,
  is_visible: typeof raw.is_visible === 'boolean' ? raw.is_visible : true,
  content: asObject(raw.content),
  bg_type: typeof raw.bg_type === 'string' ? raw.bg_type as WebsiteSectionRecord['bg_type'] : 'color',
  bg_value: typeof raw.bg_value === 'string' ? raw.bg_value : null,
  padding_top: typeof raw.padding_top === 'string' ? raw.padding_top : 'lg',
  padding_bottom: typeof raw.padding_bottom === 'string' ? raw.padding_bottom : 'lg',
  style_override: asObject(raw.style_override),
  scroll_animation:
    typeof raw.scroll_animation === 'string'
      ? raw.scroll_animation as WebsiteSectionRecord['scroll_animation']
      : 'none',
  version: typeof raw.version === 'number' ? raw.version : 1,
  snapshot_history: asArray(raw.snapshot_history).map((item) => asObject(item)),
  created_at: typeof raw.created_at === 'string' ? raw.created_at : nowIso(),
  updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : nowIso(),
});

const mapLegacyBlockToSection = (
  raw: Record<string, unknown>,
  workspaceId: string,
  pageId: string,
  sortOrder: number,
): WebsiteSectionRecord => {
  const type = typeof raw.type === 'string' ? raw.type : 'legacy_block';

  if (type === 'hero_3d') {
    const section = createDefaultSection('hero', workspaceId, pageId, sortOrder);
    const legacyContent = asObject(raw.content);
    return {
      ...section,
      content: {
        ...section.content,
        headline: typeof legacyContent.title === 'string' ? legacyContent.title : section.content.headline,
        subheadline:
          typeof legacyContent.subtitle === 'string'
            ? legacyContent.subtitle
            : section.content.subheadline,
      },
    };
  }

  if (type === 'glass_features') {
    return {
      ...createDefaultSection('features', workspaceId, pageId, sortOrder),
      content: {
        ...createDefaultSection('features', workspaceId, pageId, sortOrder).content,
        imported_legacy: true,
      },
    };
  }

  if (type === 'glow_footer') {
    return {
      ...createDefaultSection('cta', workspaceId, pageId, sortOrder),
      content: {
        ...createDefaultSection('cta', workspaceId, pageId, sortOrder).content,
        imported_legacy: true,
      },
    };
  }

  return {
    ...createDefaultSection('legacy_block', workspaceId, pageId, sortOrder),
    content: {
      legacy_type: type,
      raw,
    },
  };
};

export const deserializeSectionsFromContentBlocks = (
  blocks: unknown,
  workspaceId: string,
  pageId: string,
): WebsiteSectionRecord[] => {
  const items = asArray(blocks);
  return items.map((item, index) => {
    const raw = asObject(item);

    if (typeof raw.section_type === 'string') {
      return normalizeSectionRecord(raw, workspaceId, pageId, index);
    }

    return mapLegacyBlockToSection(raw, workspaceId, pageId, index);
  });
};

export const serializeSectionsToContentBlocks = (sections: WebsiteSectionRecord[]): Json =>
  sections.map((section) => ({
    id: section.id,
    page_id: section.page_id,
    workspace_id: section.workspace_id,
    section_type: section.section_type,
    sort_order: section.sort_order,
    is_visible: section.is_visible,
    content: section.content,
    bg_type: section.bg_type,
    bg_value: section.bg_value,
    padding_top: section.padding_top,
    padding_bottom: section.padding_bottom,
    style_override: section.style_override,
    scroll_animation: section.scroll_animation,
    version: section.version,
    snapshot_history: section.snapshot_history,
    created_at: section.created_at,
    updated_at: section.updated_at,
  })) as Json;

export async function listWebsites(workspaceId: string): Promise<{ websites: WebsiteRecord[]; pageCountBySite: Record<string, number> }> {
  const [{ data: websitesData, error: websiteError }, { data: pageRows, error: pageError }] = await Promise.all([
    fromTable('websites').select(WEBSITE_SELECT).eq('workspace_id', workspaceId).order('updated_at', { ascending: false }),
    fromTable('website_pages').select('website_id').in(
      'website_id',
      (
        await fromTable('websites').select('id').eq('workspace_id', workspaceId)
      ).data?.map((site: { id: string }) => site.id) || ['00000000-0000-0000-0000-000000000000'],
    ),
  ]);

  if (websiteError) throw websiteError;
  if (pageError) throw pageError;

  const pageCountBySite = ((pageRows || []) as Array<{ website_id: string }>).reduce<Record<string, number>>((acc, row) => {
    acc[row.website_id] = (acc[row.website_id] || 0) + 1;
    return acc;
  }, {});

  return {
    websites: (websitesData || []) as WebsiteRecord[],
    pageCountBySite,
  };
}

export async function loadWebsiteBuilderData(siteId: string, workspaceId: string): Promise<WebsiteBuilderData> {
  const { data: websiteData, error: websiteError } = await fromTable('websites')
    .select(WEBSITE_SELECT)
    .eq('id', siteId)
    .eq('workspace_id', workspaceId)
    .single();

  if (websiteError) throw websiteError;

  const { data: pagesData, error: pagesError } = await fromTable('website_pages')
    .select(WEBSITE_PAGE_SELECT)
    .eq('website_id', siteId)
    .order('is_home', { ascending: false })
    .order('created_at', { ascending: true });

  if (pagesError) throw pagesError;

  const pages = (pagesData || []) as WebsitePageRecord[];
  const sectionsByPage: Record<string, WebsiteSectionRecord[]> = {};
  let sourceMode: WebsiteBuilderData['sourceMode'] = 'sections';

  for (const page of pages) {
    try {
      const { data: sectionRows, error: sectionError } = await fromTable('website_sections')
        .select(WEBSITE_SECTION_SELECT)
        .eq('workspace_id', workspaceId)
        .eq('page_id', page.id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });

      if (sectionError) throw sectionError;

      if (sectionRows && sectionRows.length > 0) {
        sectionsByPage[page.id] = (sectionRows as Record<string, unknown>[]).map((section, index) =>
          normalizeSectionRecord(section, workspaceId, page.id, index),
        );
      } else {
        sourceMode = 'legacy';
        sectionsByPage[page.id] = deserializeSectionsFromContentBlocks(page.content_blocks, workspaceId, page.id);
      }
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
      sourceMode = 'legacy';
      sectionsByPage[page.id] = deserializeSectionsFromContentBlocks(page.content_blocks, workspaceId, page.id);
    }
  }

  if (pages.length === 0) {
    const draftPage = createDefaultPageDraft(siteId);
    return {
      website: websiteData as WebsiteRecord,
      pages: [draftPage],
      sectionsByPage: {
        [draftPage.id]: [createDefaultSection('hero', workspaceId, draftPage.id, 0)],
      },
      sourceMode,
    };
  }

  return {
    website: websiteData as WebsiteRecord,
    pages,
    sectionsByPage,
    sourceMode,
  };
}

export async function createWebsiteDraft(params: {
  workspaceId: string;
  name: string;
  domain: string | null;
}): Promise<{ website: WebsiteRecord; homePage: WebsitePageRecord }> {
  const { data: websiteData, error: websiteError } = await fromTable('websites')
    .insert({
      workspace_id: params.workspaceId,
      name: params.name,
      domain: params.domain,
      status: 'draft',
      global_config: {},
    })
    .select(WEBSITE_SELECT)
    .single();

  if (websiteError) throw websiteError;

  const { data: pageData, error: pageError } = await fromTable('website_pages')
    .insert({
      website_id: websiteData.id,
      title: 'Home',
      slug: '/',
      is_home: true,
      status: 'draft',
      seo_metadata: { title: params.name, description: '' },
      content_blocks: [],
    })
    .select(WEBSITE_PAGE_SELECT)
    .single();

  if (pageError) throw pageError;

  return {
    website: websiteData as WebsiteRecord,
    homePage: pageData as WebsitePageRecord,
  };
}

export async function createWebsitePage(params: {
  websiteId: string;
  title: string;
  slug: string;
}): Promise<WebsitePageRecord> {
  const { data, error } = await fromTable('website_pages')
    .insert({
      website_id: params.websiteId,
      title: params.title,
      slug: params.slug,
      is_home: params.slug === '/',
      status: 'draft',
      seo_metadata: { title: params.title, description: '' },
      content_blocks: [],
    })
    .select(WEBSITE_PAGE_SELECT)
    .single();

  if (error) throw error;
  return data as WebsitePageRecord;
}

export async function updateWebsiteMeta(params: {
  websiteId: string;
  name: string;
  domain: string | null;
  status: WebsiteRecord['status'];
  globalConfig?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await fromTable('websites')
    .update({
      name: params.name,
      domain: params.domain,
      status: params.status,
      global_config: params.globalConfig || {},
    })
    .eq('id', params.websiteId);

  if (error) throw error;
}

export async function updateWebsitePage(page: WebsitePageRecord, sections: WebsiteSectionRecord[]): Promise<void> {
  const { error } = await fromTable('website_pages')
    .update({
      title: page.title,
      slug: page.slug,
      is_home: page.is_home,
      status: page.status,
      seo_metadata: page.seo_metadata || {},
      content_blocks: serializeSectionsToContentBlocks(sections),
    })
    .eq('id', page.id);

  if (error) throw error;
}

export async function persistWebsiteSections(params: {
  workspaceId: string;
  pageId: string;
  sections: WebsiteSectionRecord[];
}): Promise<'sections' | 'legacy'> {
  const orderedSections = params.sections.map((section, index) => ({
    ...section,
    workspace_id: params.workspaceId,
    page_id: params.pageId,
    sort_order: index,
    updated_at: nowIso(),
    created_at: section.created_at || nowIso(),
  }));

  try {
    const { data: existingRows, error: existingError } = await fromTable('website_sections')
      .select('id')
      .eq('workspace_id', params.workspaceId)
      .eq('page_id', params.pageId)
      .is('deleted_at', null);

    if (existingError) throw existingError;

    const existingIds = new Set(((existingRows || []) as Array<{ id: string }>).map((row) => row.id));
    const currentIds = new Set(orderedSections.map((section) => section.id));
    const removedIds = Array.from(existingIds).filter((id) => !currentIds.has(id));

    if (removedIds.length > 0) {
      const { error: removeError } = await fromTable('website_sections')
        .update({ deleted_at: nowIso() })
        .in('id', removedIds);

      if (removeError) throw removeError;
    }

    if (orderedSections.length > 0) {
      const { error: upsertError } = await fromTable('website_sections').upsert(
        orderedSections.map((section) => ({
          id: section.id,
          page_id: params.pageId,
          workspace_id: params.workspaceId,
          section_type: section.section_type,
          sort_order: section.sort_order,
          is_visible: section.is_visible,
          content: section.content,
          bg_type: section.bg_type,
          bg_value: section.bg_value,
          padding_top: section.padding_top,
          padding_bottom: section.padding_bottom,
          style_override: section.style_override,
          scroll_animation: section.scroll_animation,
          version: section.version,
          snapshot_history: section.snapshot_history,
          created_at: section.created_at,
          updated_at: section.updated_at,
          deleted_at: null,
        })),
        { onConflict: 'id' },
      );

      if (upsertError) throw upsertError;
    }

    return 'sections';
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    return 'legacy';
  }
}
