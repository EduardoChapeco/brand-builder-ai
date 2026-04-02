import type { CSSProperties } from 'react';
import { BIOLINK_THEMES, BioLinkBlock, getBioLinkTheme, normalizeBioLinkBlocks } from '@/lib/postgenPhase3';

export interface BioLinkData {
  slug: string;
  theme_id?: string | null;
  profile?: {
    avatar?: string;
    handle?: string;
    title?: string;
    bio?: string;
    location?: string;
  };
  theme_config?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
  blocks?: BioLinkBlock[];
  links?: Array<{ id?: string; label?: string; url?: string; emoji?: string }>;
}

const cardMotionStyle: CSSProperties = {
  transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
};

const parseEmbedUrl = (url?: string) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${parsed.pathname.replace('/', '')}`;
    }
    if (parsed.hostname.includes('youtube.com')) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get('v') || ''}`;
    }
    if (parsed.hostname.includes('spotify.com')) {
      return url.replace('/track/', '/embed/track/').replace('/episode/', '/embed/episode/');
    }
    return url;
  } catch {
    return url;
  }
};

const renderBlock = (block: BioLinkBlock, colors: ReturnType<typeof buildColors>) => {
  const shellStyle: CSSProperties = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    borderRadius: colors.shape === 'square' ? 4 : 20,
    boxShadow: colors.shadow,
    backdropFilter: colors.backdrop,
    ...cardMotionStyle,
  };

  if (block.type === 'spacer') {
    return <div key={block.id} style={{ height: block.height || 20 }} />;
  }

  if (block.type === 'youtube') {
    return (
      <div key={block.id} style={{ ...shellStyle, overflow: 'hidden' }}>
        <iframe
          title={block.title || 'YouTube embed'}
          src={parseEmbedUrl(block.url || block.embedUrl)}
          style={{ width: '100%', height: 220, border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (block.type === 'spotify') {
    return (
      <div key={block.id} style={{ ...shellStyle, overflow: 'hidden' }}>
        <iframe
          title={block.title || 'Spotify embed'}
          src={parseEmbedUrl(block.url || block.embedUrl)}
          style={{ width: '100%', height: 232, border: 'none' }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      </div>
    );
  }

  if (block.type === 'map') {
    const query = encodeURIComponent(block.note || block.url || 'Sao Paulo');
    return (
      <div key={block.id} style={{ ...shellStyle, padding: 0, overflow: 'hidden' }}>
        <iframe
          title={block.title || 'Mapa'}
          src={`https://maps.google.com/maps?q=${query}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
          style={{ width: '100%', height: 280, border: 'none', display: 'block' }}
          allowFullScreen
        />
        {(block.title || block.note) && (
          <div style={{ padding: '16px 18px', borderTop: `1px solid ${colors.border}` }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{block.title || 'Localização'}</h3>
            {block.note && <p style={{ margin: 0, color: colors.muted, fontSize: 13, lineHeight: 1.5 }}>{block.note}</p>}
          </div>
        )}
      </div>
    );
  }

  if (block.type === 'newsletter') {
    return (
      <div key={block.id} style={{ ...shellStyle, padding: 18 }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.muted }}>
          Newsletter
        </p>
        <h3 style={{ margin: '10px 0 8px', fontSize: 20 }}>{block.title || 'Receba novidades'}</h3>
        <p style={{ margin: '0 0 14px', color: colors.muted, lineHeight: 1.5 }}>
          {block.note || 'Cadastre seu melhor e-mail para receber atualizações da marca.'}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            disabled
            value=""
            placeholder={block.placeholder || 'Seu melhor e-mail'}
            style={{
              flex: '1 1 220px',
              minWidth: 0,
              height: 46,
              borderRadius: 14,
              padding: '0 14px',
              border: `1px solid ${colors.border}`,
              background: colors.input,
              color: colors.text,
            }}
          />
          <button
            type="button"
            style={{
              height: 46,
              border: 'none',
              borderRadius: 14,
              padding: '0 18px',
              background: colors.primary,
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {block.buttonLabel || 'Quero receber'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <a
      key={block.id}
      href={block.url || '#'}
      target="_blank"
      rel="noreferrer"
      style={{
        ...shellStyle,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        textDecoration: 'none',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-2px)';
        event.currentTarget.style.boxShadow = colors.hoverShadow;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'translateY(0)';
        event.currentTarget.style.boxShadow = colors.shadow;
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          display: 'grid',
          placeItems: 'center',
          borderRadius: colors.shape === 'square' ? 10 : 16,
          background: colors.iconSurface,
          flexShrink: 0,
          fontSize: 20,
        }}
      >
        {block.emoji || '🔗'}
      </div>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: 16, lineHeight: 1.2 }}>{block.title || block.label || 'Link'}</h3>
        {block.note && <p style={{ margin: '6px 0 0', fontSize: 13, color: colors.muted }}>{block.note}</p>}
      </div>
      <span style={{ marginLeft: 'auto', color: colors.muted, fontSize: 18 }}>→</span>
    </a>
  );
};

const buildColors = (data: BioLinkData, themeId: string) => {
  const theme = getBioLinkTheme(themeId);
  const primary = data.theme_config?.primaryColor || '#9353FF';
  const secondary = data.theme_config?.secondaryColor || '#0EA5E9';
  const accent = data.theme_config?.accentColor || primary;
  const isBrutal = themeId === 'brutal-corporate';

  return {
    primary,
    secondary,
    accent,
    surface: isBrutal ? theme.rootStyles.surface : theme.rootStyles.surface,
    border: isBrutal ? theme.rootStyles.border : theme.rootStyles.border,
    text: theme.rootStyles.text,
    muted: theme.rootStyles.muted,
    input: theme.isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
    iconSurface: isBrutal ? primary : `${secondary}22`,
    shape: isBrutal ? 'square' : 'rounded',
    backdrop: isBrutal ? 'none' : 'blur(18px)',
    shadow: isBrutal ? `6px 6px 0 ${theme.rootStyles.border}` : '0 18px 50px rgba(15, 23, 42, 0.14)',
    hoverShadow: isBrutal ? `8px 8px 0 ${theme.rootStyles.border}` : `0 22px 60px ${accent}30`,
  };
};

export const BioLinkRenderer = ({ data, onBlockClick, activeBlockId }: { data: BioLinkData, onBlockClick?: (id: string) => void, activeBlockId?: string | null }) => {
  const theme = getBioLinkTheme(data.theme_id || BIOLINK_THEMES[0].id);
  const blocks = normalizeBioLinkBlocks(data as any);
  const profile = data.profile || {};
  const colors = buildColors(data, theme.id);

  const renderBlockWithInteraction = (block: BioLinkBlock) => {
    const baseElement = renderBlock(block, colors);
    
    // Se não há click handler para edição, não polui com overlay interativo
    if (!onBlockClick) return baseElement;

    const isActive = activeBlockId === block.id;

    return (
      <div 
        key={block.id} 
        onClick={(e) => { e.preventDefault(); onBlockClick(block.id); }}
        style={{ 
          position: 'relative', 
          cursor: 'pointer',
          borderRadius: colors.shape === 'square' ? 4 : 20,
          transition: 'all 0.2s',
          transform: isActive ? 'scale(1.02)' : 'none',
          boxShadow: isActive ? `0 0 0 3px ${colors.primary}50, ${colors.shadow}` : 'none'
        }}
      >
        <div style={{ pointerEvents: 'none' }}>
           {baseElement}
        </div>
        {isActive && (
          <div style={{ position: 'absolute', top: -8, right: -8, background: colors.primary, color: '#fff', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 'bold' }}>
            Editando
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: theme.rootStyles.background,
        display: 'flex',
        justifyContent: 'center',
        padding: '32px 16px 48px',
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>
        <section
          style={{
            padding: '28px 24px',
            borderRadius: colors.shape === 'square' ? 6 : 28,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            boxShadow: colors.shadow,
            backdropFilter: colors.backdrop,
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: 92,
                height: 92,
                overflow: 'hidden',
                borderRadius: colors.shape === 'square' ? 12 : 999,
                background: colors.primary,
                border: `2px solid ${colors.border}`,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: 32,
                fontWeight: 800,
              }}
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.handle || data.slug} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (profile.handle || data.slug || 'PG').slice(0, 2).toUpperCase()
              )}
            </div>
            <p style={{ margin: '16px 0 6px', color: colors.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 11 }}>
              {profile.title || 'Bio Link Premium'}
            </p>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.05, color: colors.text }}>
              @{profile.handle || data.slug}
            </h1>
            {profile.bio && (
              <p style={{ margin: '10px 0 0', maxWidth: 380, color: colors.muted, fontSize: 15, lineHeight: 1.6 }}>
                {profile.bio}
              </p>
            )}
            {profile.location && (
              <p style={{ margin: '12px 0 0', color: colors.text, fontSize: 13, fontWeight: 600 }}>
                {profile.location}
              </p>
            )}
          </div>
        </section>

        <section style={{ display: 'grid', gap: 14 }}>
          {blocks.map((block) => renderBlockWithInteraction(block))}
        </section>

        <p style={{ margin: '26px 0 0', textAlign: 'center', fontSize: 11, letterSpacing: '0.12em', color: colors.muted, textTransform: 'uppercase' }}>
          Criado com PostGen AI
        </p>
      </div>
    </div>
  );
};
