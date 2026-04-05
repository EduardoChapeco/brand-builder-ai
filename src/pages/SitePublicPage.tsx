import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SITE_SERVICE } from '@/lib/sites/service';
import WebsiteSectionRenderer from '@/components/website/WebsiteSectionRenderer';
import type { Publication, PublicationSection } from '@/types/app.types';
import type { WebsiteSectionRecord, WebsiteSectionType, WebsiteBackgroundType, WebsiteScrollAnimation } from '@/lib/websites/types';
import { SwSpinner } from '@/components/shared/SwComponents';

export default function SitePublicPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ publication: Publication, sections: PublicationSection[] } | null>(null);

  useEffect(() => {
    if (!slug) return;
    
    SITE_SERVICE.getSiteBySlug(slug).then(res => {
      setData(res);
      setLoading(false);
    }).catch(err => {
      console.error('[SitePublic] Load error:', err);
      setLoading(false);
    });
  }, [slug]);

  const mapSectionToRecord = (s: PublicationSection): WebsiteSectionRecord => ({
    id: s.id,
    page_id: s.publication_id,
    workspace_id: s.workspace_id,
    section_type: s.section_type as WebsiteSectionType,
    sort_order: s.position,
    is_visible: s.is_active,
    content: s.content || {},
    bg_type: (s.styles?.bg_type as WebsiteBackgroundType) || 'color',
    bg_value: (s.styles?.bg_value as string) || null,
    padding_top: (s.styles?.padding_top as string) || 'md',
    padding_bottom: (s.styles?.padding_bottom as string) || 'md',
    style_override: {},
    scroll_animation: (s.styles?.scroll_animation as WebsiteScrollAnimation) || 'none',
    version: 1,
    snapshot_history: [],
    created_at: s.created_at || new Date().toISOString(),
    updated_at: s.updated_at || new Date().toISOString()
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#09090f] flex items-center justify-center">
        <SwSpinner className="w-12 h-12 border-t-[#a855f7]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-[#09090f] flex items-center justify-center text-stone-500">
        <p className="text-xl font-bold uppercase tracking-widest">Site não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f]">
       {data.sections.length === 0 ? (
         <div className="p-20 text-center">
            <p className="text-stone-500">Este site ainda não possui seções publicadas.</p>
         </div>
       ) : (
         <div className="w-full">
            {data.sections.map(section => (
              <WebsiteSectionRenderer
                key={section.id}
                section={mapSectionToRecord(section)}
                previewMode="desktop"
                selected={false}
              />
            ))}
         </div>
       )}
    </div>
  );
}
