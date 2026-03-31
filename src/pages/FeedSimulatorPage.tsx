import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Grid3x3,
  Play, ChevronLeft, ChevronRight, MonitorSmartphone, Smartphone,
  Facebook, Linkedin, Sparkles, ExternalLink
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Post = Tables<'posts_v2'>;
type Platform = 'instagram' | 'facebook' | 'linkedin';

const PLATFORMS: { id: Platform; label: string; icon: typeof Smartphone }[] = [
  { id: 'instagram', label: 'Instagram', icon: Smartphone },
  { id: 'facebook',  label: 'Facebook',  icon: Facebook },
  { id: 'linkedin',  label: 'LinkedIn',  icon: Linkedin },
];

const formatTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Agora';
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const randBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const InstagramPostCard = ({
  post,
  brandKit,
  briefing,
}: {
  post: Post;
  brandKit: { color_primary: string; logo_url: string | null; watermark_text: string | null } | null;
  briefing: { instagram_handle?: string | null; company_name?: string | null } | null;
}) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const primaryColor = brandKit?.color_primary || '#E1306C';
  const handle = briefing?.instagram_handle?.replace('@', '') || briefing?.company_name?.toLowerCase().replace(/\s/g, '_') || 'suamarca';
  const imageUrls = Array.isArray(post.image_urls) ? (post.image_urls as string[]) : [];
  const slidesCount = imageUrls.length || 1;
  const likes = randBetween(150, 4800);

  return (
    <div className="feed-card" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, #833AB4, #FD1D1D)`,
              padding: 2,
            }}
          >
            {brandKit?.logo_url ? (
              <img src={brandKit.logo_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span>{handle.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: '#f5f5f5' }}>@{handle}</p>
            <p className="text-[11px]" style={{ color: '#8e8e8e' }}>Patrocinado</p>
          </div>
        </div>
        <MoreHorizontal size={20} color="#8e8e8e" />
      </div>

      {/* Image / Slides */}
      <div className="relative bg-black" style={{ aspectRatio: post.format === 'story' ? '9/16' : '1/1', maxHeight: 480 }}>
        {imageUrls[slideIdx] ? (
          <img
            src={imageUrls[slideIdx]}
            alt={post.title || 'post'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #111, #1a1a2e)' }}
          >
            <Sparkles size={32} color={primaryColor} />
            <p className="text-xs font-medium" style={{ color: '#8e8e8e' }}>
              {post.title || 'Sem imagem gerada'}
            </p>
          </div>
        )}

        {slidesCount > 1 && (
          <>
            <button
              onClick={() => setSlideIdx(i => Math.max(0, i - 1))}
              disabled={slideIdx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-0"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            >
              <ChevronLeft size={16} color="#fff" />
            </button>
            <button
              onClick={() => setSlideIdx(i => Math.min(slidesCount - 1, i + 1))}
              disabled={slideIdx === slidesCount - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-0"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            >
              <ChevronRight size={16} color="#fff" />
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {Array.from({ length: slidesCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlideIdx(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === slideIdx ? 16 : 6,
                    height: 6,
                    background: i === slideIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button onClick={() => setLiked(l => !l)} className="transition-transform active:scale-90">
            <Heart
              size={24}
              fill={liked ? '#FF3040' : 'none'}
              color={liked ? '#FF3040' : '#f5f5f5'}
            />
          </button>
          <MessageCircle size={24} color="#f5f5f5" />
          <Send size={22} color="#f5f5f5" style={{ transform: 'rotate(0deg)' }} />
        </div>
        <button onClick={() => setSaved(s => !s)}>
          <Bookmark
            size={24}
            fill={saved ? '#f5f5f5' : 'none'}
            color="#f5f5f5"
          />
        </button>
      </div>

      {/* Likes */}
      <div className="px-4">
        <p className="text-[13px] font-semibold" style={{ color: '#f5f5f5' }}>
          {(likes + (liked ? 1 : 0)).toLocaleString('pt-BR')} curtidas
        </p>
      </div>

      {/* Caption */}
      <div className="px-4 pb-2 mt-1">
        <p className="text-[13px] leading-5" style={{ color: '#f5f5f5' }}>
          <span className="font-semibold">@{handle} </span>
          <span style={{ color: '#c7c7c7' }}>
            {post.caption?.slice(0, 120) || post.title || 'Legenda do post'}{post.caption && post.caption.length > 120 ? '...' : ''}
          </span>
        </p>
        {post.hashtags && (
          <p className="text-[12px] mt-1" style={{ color: '#1877F2' }}>
            {post.hashtags.slice(0, 80)}
          </p>
        )}
        <p className="text-[11px] mt-1.5 uppercase tracking-wider" style={{ color: '#8e8e8e' }}>
          {formatTime(post.created_at)}
        </p>
      </div>

      {/* Fake comment box */}
      <div className="flex items-center gap-3 px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
          style={{ background: primaryColor }}>
          V
        </div>
        <p className="text-[12px]" style={{ color: '#8e8e8e' }}>Adicionar um comentário...</p>
      </div>
    </div>
  );
};

const FacebookPostCard = ({
  post,
  brandKit,
  briefing,
}: {
  post: Post;
  brandKit: { color_primary: string; logo_url: string | null } | null;
  briefing: { company_name?: string | null } | null;
}) => {
  const [liked, setLiked] = useState(false);
  const imageUrls = Array.isArray(post.image_urls) ? (post.image_urls as string[]) : [];
  const name = briefing?.company_name || 'Sua Marca';
  const likes = randBetween(40, 900);

  return (
    <div className="feed-card" style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
            style={{ background: brandKit?.color_primary || '#1877F2' }}
          >
            {brandKit?.logo_url ? (
              <img src={brandKit.logo_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span>{name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: '#e4e6ea' }}>{name}</p>
            <p className="text-[12px]" style={{ color: '#8a8d91' }}>{formatTime(post.created_at)} · 🌐</p>
          </div>
        </div>

        <p className="text-[14px] leading-6 mb-3" style={{ color: '#e4e6ea' }}>
          {post.caption?.slice(0, 200) || post.title}
        </p>
      </div>

      {imageUrls[0] && (
        <img src={imageUrls[0]} alt={post.title || 'post'} className="w-full object-cover" style={{ maxHeight: 380 }} />
      )}

      <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-[13px]" style={{ color: '#8a8d91' }}>
        <span>👍 {(likes + (liked ? 1 : 0)).toLocaleString('pt-BR')}</span>
        <span>{randBetween(5, 60)} comentários</span>
      </div>

      <div className="flex border-t mx-4" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {[
          { label: 'Curtir', onClick: () => setLiked(l => !l), color: liked ? '#1877F2' : '#8a8d91' },
          { label: 'Comentar', color: '#8a8d91' },
          { label: 'Compartilhar', color: '#8a8d91' },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className="flex-1 py-2.5 text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-70"
            style={{ color: btn.color }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const InstagramGrid = ({
  posts,
}: {
  posts: Post[];
}) => (
  <div className="instagram-post-grid">
    {posts.slice(0, 9).map((post) => {
      const imageUrls = Array.isArray(post.image_urls) ? (post.image_urls as string[]) : [];
      return (
        <div key={post.id} className="relative aspect-square overflow-hidden bg-black/40 group cursor-pointer">
          {imageUrls[0] ? (
            <img
              src={imageUrls[0]}
              alt={post.title || ''}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Sparkles size={20} style={{ color: 'var(--text-4)' }} />
            </div>
          )}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="flex items-center gap-1 text-white font-semibold text-sm">
              <Heart size={16} fill="white" /> {randBetween(100, 3000).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

const FeedSimulatorPage = () => {
  const navigate = useNavigate();
  const { workspace, brandKit, briefing } = useWorkspace();
  const [posts, setPosts] = useState<Post[]>([]);
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [view, setView] = useState<'feed' | 'grid'>('feed');
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('posts_v2')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setPosts((data || []) as Post[]);
    setLoading(false);
  }, [workspace?.id]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const primaryColor = brandKit?.color_primary || '#9353FF';
  const handle = briefing?.instagram_handle?.replace('@', '') || briefing?.company_name?.toLowerCase().replace(/\s/g, '_') || 'suamarca';
  const postsWithImages = posts.filter(p => Array.isArray(p.image_urls) && (p.image_urls as string[]).length > 0);

  return (
    <div className="page-layout gradient-mesh">
      {/* Hero */}
      <div className="page-hero">
        <div className="relative z-10">
          <p className="page-hero-eyebrow">Intelligence Suite • Feed Simulator</p>
          <h1 className="page-hero-title">Simulador de Feed Social</h1>
          <p className="page-hero-description">
            Visualize como seus posts aparecem nas redes sociais em tempo real — antes de publicar.
          </p>
        </div>
      </div>

      <div className="page-content no-scrollbar">
        <div className="flex gap-6 p-6 h-full">
          {/* Left panel — controls */}
          <div className="glass-card rounded-3xl p-6 flex flex-col gap-6 shrink-0" style={{ width: 280 }}>
            {/* Platform selector */}
            <div>
              <p className="panel-section-title mb-3">Plataforma</p>
              <div className="flex flex-col gap-2">
                {PLATFORMS.map((plat) => {
                  const Icon = plat.icon;
                  return (
                    <button
                      key={plat.id}
                      onClick={() => setPlatform(plat.id)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
                      style={{
                        background: platform === plat.id ? 'var(--primary-muted)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${platform === plat.id ? 'var(--primary)' : 'rgba(255,255,255,0.06)'}`,
                        color: platform === plat.id ? 'var(--primary)' : 'var(--text-2)',
                      }}
                    >
                      <Icon size={16} />
                      <span className="font-semibold text-sm">{plat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* View toggle (Instagram only) */}
            {platform === 'instagram' && (
              <div>
                <p className="panel-section-title mb-3">Visualização</p>
                <div className="flex gap-2">
                  {[
                    { id: 'feed', label: 'Feed', icon: Smartphone },
                    { id: 'grid', label: 'Perfil', icon: Grid3x3 },
                  ].map(v => {
                    const Icon = v.icon;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setView(v.id as 'feed' | 'grid')}
                        className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all text-xs font-semibold"
                        style={{
                          background: view === v.id ? 'var(--primary-muted)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${view === v.id ? 'var(--primary)' : 'rgba(255,255,255,0.06)'}`,
                          color: view === v.id ? 'var(--primary)' : 'var(--text-3)',
                        }}
                      >
                        <Icon size={16} />
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Profile info */}
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="panel-section-title mb-3">Perfil Simulado</p>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, #833AB4)` }}
                >
                  {brandKit?.logo_url ? (
                    <img src={brandKit.logo_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    handle.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>@{handle}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{briefing?.company_name || 'Sua Marca'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Posts', value: posts.length },
                  { label: 'Seguidores', value: '1.2K' },
                  { label: 'Seguindo', value: '342' },
                ].map(stat => (
                  <div key={stat.label}>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{stat.value}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Posts com imagem</p>
                <p className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{postsWithImages.length}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Total de posts</p>
                <p className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{posts.length}</p>
              </div>
              {posts.length === 0 && !loading && (
                <button
                  onClick={() => navigate('../generator')}
                  className="mt-4 w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'var(--primary)', color: '#fff' }}
                >
                  <Sparkles size={14} />
                  Criar primeiro post
                </button>
              )}
            </div>
          </div>

          {/* Main — phone frame */}
          <div className="flex-1 flex flex-col items-center overflow-y-auto no-scrollbar">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-2xl animate-pulse" style={{ background: 'var(--primary-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: 'var(--primary-muted)', border: '1px solid var(--primary)' }}
                >
                  <MonitorSmartphone size={36} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Nenhum post disponível</p>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>Crie posts no gerador para visualizar aqui.</p>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[500px]">
                {/* Phone chrome header */}
                {platform === 'instagram' && view === 'grid' ? (
                  <div className="rounded-3xl overflow-hidden shadow-2xl border"
                    style={{ background: '#121212', borderColor: 'rgba(255,255,255,0.08)' }}>
                    {/* IG profile header */}
                    <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-4 mb-4">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
                          style={{ background: `linear-gradient(135deg, ${primaryColor}, #833AB4, #FD1D1D)` }}
                        >
                          {handle.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-white text-base">{handle}</p>
                          <div className="flex gap-6 mt-2 text-center">
                            {[
                              { label: 'posts', val: postsWithImages.length },
                              { label: 'seguidores', val: '1.2K' },
                              { label: 'seguindo', val: '342' },
                            ].map(s => (
                              <div key={s.label}>
                                <p className="font-bold text-white text-sm">{s.val}</p>
                                <p className="text-[11px]" style={{ color: '#8e8e8e' }}>{s.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-white">{briefing?.company_name || 'Sua Marca'}</p>
                      <p className="text-[13px] mt-1" style={{ color: '#c7c7c7' }}>
                        {briefing?.company_name ? `Conteúdo premium para ${briefing.company_name}` : 'Sua bio aparece aqui'}
                      </p>
                    </div>
                    <InstagramGrid posts={postsWithImages.length > 0 ? postsWithImages : posts} />
                    {posts.length < 9 && (
                      <div className="p-4 text-center">
                        <p className="text-xs" style={{ color: '#8e8e8e' }}>
                          {9 - Math.min(9, posts.length)} slots vazios — crie mais posts para preencher o feed
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {posts.slice(0, 5).map(post => (
                      platform === 'instagram' ? (
                        <InstagramPostCard key={post.id} post={post} brandKit={brandKit} briefing={briefing} />
                      ) : platform === 'facebook' ? (
                        <FacebookPostCard key={post.id} post={post} brandKit={brandKit} briefing={briefing} />
                      ) : (
                        /* LinkedIn simplified */
                        <div key={post.id} className="feed-card p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                              style={{ background: brandKit?.color_primary || '#0A66C2' }}>
                              {(briefing?.company_name || 'M').slice(0, 1)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-white">{briefing?.company_name || 'Sua Marca'}</p>
                              <p className="text-xs" style={{ color: '#8a8d91' }}>{randBetween(200, 5000).toLocaleString('pt-BR')} seguidores · {formatTime(post.created_at)}</p>
                            </div>
                          </div>
                          <p className="text-sm leading-6 mb-3" style={{ color: '#e4e6ea' }}>
                            {post.caption?.slice(0, 300) || post.title}
                          </p>
                          {(Array.isArray(post.image_urls) && (post.image_urls as string[])[0]) && (
                            <img
                              src={(post.image_urls as string[])[0]}
                              alt=""
                              className="w-full rounded-lg object-cover mb-3"
                              style={{ maxHeight: 320 }}
                            />
                          )}
                          <div className="flex gap-4 text-xs" style={{ color: '#8a8d91' }}>
                            <span>👍 {randBetween(20, 800)}</span>
                            <span>{randBetween(2, 40)} comentários</span>
                            <span>🔁 {randBetween(1, 30)} compartilhamentos</span>
                          </div>
                        </div>
                      )
                    ))}

                    {posts.length > 5 && (
                      <div className="text-center py-4">
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                          Exibindo os 5 mais recentes de {posts.length} posts
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedSimulatorPage;
