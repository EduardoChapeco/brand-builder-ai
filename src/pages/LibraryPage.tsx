import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Images, Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { ArtboardFormat, getArtboardDimensions } from '@/lib/canvasEngine';
import { exportAllSlides, exportSlide } from '@/lib/exportPost';

interface Post {
  id: string;
  title: string | null;
  format: string;
  slides_html: string[];
  slides_count: number;
  caption: string | null;
  hashtags: string | null;
  template_id: string | null;
  image_urls: string[] | null;
  generation_meta?: {
    artboard_format?: ArtboardFormat;
    [key: string]: unknown;
  } | null;
  source_topic?: string | null;
  source_url?: string | null;
  created_at: string;
  status: string | null;
}

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'post', label: 'Posts' },
  { id: 'carousel', label: 'Carrosseis' },
  { id: 'story', label: 'Stories' },
  { id: 'landscape', label: 'Paisagem' },
];

const getPostDimensions = (post: Post) => {
  const storedFormat = post.generation_meta?.artboard_format;
  if (storedFormat) return getArtboardDimensions(storedFormat);
  if (post.format === 'story') return getArtboardDimensions('story');
  if (post.format === 'landscape') return getArtboardDimensions('landscape');
  return getArtboardDimensions('square');
};

const FormatBadge = ({ format }: { format: string }) => {
  const colors: Record<string, [string, string]> = {
    post: ['#7C3AED20', '#7C3AED'],
    carousel: ['#0EA5E920', '#0EA5E9'],
    story: ['#F59E0B20', '#F59E0B'],
    landscape: ['#10B98120', '#10B981'],
  };
  const [bg, color] = colors[format] ?? ['#47556920', '#475569'];

  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}
    >
      {format}
    </span>
  );
};

const LibraryPage = () => {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();

  const [posts, setPosts] = useState<Post[]>([]);
  const [filtered, setFiltered] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFormat, setFilterFormat] = useState('all');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);

  const fetchPosts = useCallback(async () => {
    if (!workspace?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts_v2')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []).map(post => ({
        ...post,
        slides_html: Array.isArray(post.slides_html) ? post.slides_html : [],
        slides_count: post.slides_count || 0,
        image_urls: Array.isArray(post.image_urls) ? post.image_urls : null,
        generation_meta:
          post.generation_meta && typeof post.generation_meta === 'object'
            ? (post.generation_meta as Post['generation_meta'])
            : null,
      })) as Post[];

      setPosts(rows);
      setFiltered(rows);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar a biblioteca');
    } finally {
      setIsLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const query = search.trim().toLowerCase();

    const next = posts.filter(post => {
      if (filterFormat !== 'all' && post.format !== filterFormat) return false;
      if (!query) return true;

      const haystack = [post.title, post.caption, post.source_topic, post.hashtags]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });

    setFiltered(next);
  }, [filterFormat, posts, search]);

  const handleDelete = async (postId: string) => {
    if (!confirm('Excluir este post da biblioteca?')) return;

    const { error } = await supabase.from('posts_v2').delete().eq('id', postId);
    if (error) {
      toast.error('Erro ao excluir o post');
      return;
    }

    toast.success('Post removido da biblioteca');
    if (selectedPost?.id === postId) setSelectedPost(null);
    fetchPosts();
  };

  const handleDownload = async (post: Post, idx = 0) => {
    if (!post.slides_html?.[idx]) {
      toast.error('HTML do slide nao disponivel');
      return;
    }

    const { width, height } = getPostDimensions(post);
    toast.info('Exportando slide...');

    const blob = await exportSlide(post.slides_html[idx], `slide-${idx + 1}`, width, height);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${post.title || 'post'}_slide_${idx + 1}.png`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async (post: Post) => {
    if (!post.slides_html?.length) {
      toast.error('HTML dos slides nao disponivel');
      return;
    }

    const { width, height } = getPostDimensions(post);
    await exportAllSlides(post.slides_html, post.title || 'post', width, height);
  };

  const handleEdit = (post: Post) => {
    setSelectedPost(null);
    navigate('../generator', { state: { post } });
  };

  const modalDimensions = selectedPost ? getPostDimensions(selectedPost) : null;

  return (
    <div className="page-layout">
      <div className="page-hero">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="page-hero-eyebrow">Intelligence Suite • Biblioteca</p>
            <h1 className="page-hero-title" style={{ fontSize: '2rem' }}>Biblioteca de Posts</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>
              {filtered.length} {filtered.length === 1 ? 'post' : 'posts'} · todos os formatos
            </p>
          </div>
          <div className="relative hidden md:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar posts..."
              className="pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-1)', width: 240 }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
        {FILTERS.map(filter => (
          <button
            key={filter.id}
            onClick={() => setFilterFormat(filter.id)}
            className={`chip ${filterFormat === filter.id ? 'active' : ''}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="page-content no-scrollbar">
        <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl animate-pulse"
                style={{ background: 'var(--bg-card)', height: 220 }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <Images size={32} style={{ color: 'var(--text-3)' }} />
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
                Nenhum post encontrado
              </p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Crie o primeiro post no gerador
              </p>
            </div>
            <button
              onClick={() => navigate('../generator')}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--primary)', color: 'white' }}
            >
              Ir para o gerador
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                onClick={() => {
                  setSelectedPost(post);
                  setSlideIdx(0);
                }}
              >
                <div className="relative" style={{ height: 180, background: 'var(--bg-elevated)' }}>
                  {post.image_urls?.[0] ? (
                    <img
                      src={post.image_urls[0]}
                      alt={post.title || 'Thumbnail do post'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl opacity-20">✦</span>
                    </div>
                  )}

                  <div
                    className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'rgba(0,0,0,0.65)' }}
                  >
                    <button
                      onClick={event => {
                        event.stopPropagation();
                        handleDownload(post);
                      }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                    >
                      <Download size={15} />
                    </button>
                    <button
                      onClick={event => {
                        event.stopPropagation();
                        handleEdit(post);
                      }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(124,58,237,0.25)', color: '#C4B5FD' }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={event => {
                        event.stopPropagation();
                        handleDelete(post.id);
                      }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(239,68,68,0.25)', color: '#EF4444' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-sm font-semibold truncate mb-1" style={{ color: 'var(--text-1)' }}>
                    {post.title || 'Post sem titulo'}
                  </p>
                  <div className="flex items-center justify-between">
                    <FormatBadge format={post.format} />
                    <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                      {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        </div>
      </div>

      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent
          className="max-w-4xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
        >
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display" style={{ color: 'var(--text-1)' }}>
                  {selectedPost.title || 'Post'}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div
                    className="rounded-xl overflow-hidden mb-3"
                    style={{
                      background: 'var(--bg-elevated)',
                      aspectRatio: modalDimensions
                        ? `${modalDimensions.width} / ${modalDimensions.height}`
                        : '1 / 1',
                    }}
                  >
                    {selectedPost.image_urls?.[slideIdx] ? (
                      <img
                        src={selectedPost.image_urls[slideIdx]}
                        className="w-full h-full object-cover"
                        alt="Preview do post"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl opacity-20">✦</span>
                      </div>
                    )}
                  </div>

                  {selectedPost.slides_count > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSlideIdx(current => Math.max(0, current - 1))}
                        disabled={slideIdx === 0}
                        className="text-xs px-2 py-1 rounded disabled:opacity-30"
                        style={{ color: 'var(--text-2)', background: 'var(--bg-elevated)' }}
                      >
                        ‹
                      </button>
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {slideIdx + 1} / {selectedPost.slides_count}
                      </span>
                      <button
                        onClick={() =>
                          setSlideIdx(current => Math.min(selectedPost.slides_count - 1, current + 1))
                        }
                        disabled={slideIdx === selectedPost.slides_count - 1}
                        className="text-xs px-2 py-1 rounded disabled:opacity-30"
                        style={{ color: 'var(--text-2)', background: 'var(--bg-elevated)' }}
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <FormatBadge format={selectedPost.format} />
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {new Date(selectedPost.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <textarea
                    readOnly
                    value={selectedPost.caption || ''}
                    rows={6}
                    className="w-full text-xs rounded-xl px-3 py-2 resize-none"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-2)',
                    }}
                  />

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedPost.caption || '');
                      toast.success('Legenda copiada');
                    }}
                    className="w-full py-2 rounded-xl text-xs font-medium"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-2)',
                    }}
                  >
                    Copiar legenda
                  </button>

                  <button
                    onClick={() => handleDownload(selectedPost, slideIdx)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--primary)', color: 'white' }}
                  >
                    Baixar PNG atual
                  </button>

                  <button
                    onClick={() => handleDownloadAll(selectedPost)}
                    className="w-full py-2 rounded-xl text-xs font-medium"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-2)',
                    }}
                  >
                    Baixar todos (.zip)
                  </button>

                  <button
                    onClick={() => handleEdit(selectedPost)}
                    className="w-full py-2 rounded-xl text-xs font-medium"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-2)',
                    }}
                  >
                    Editar no gerador
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LibraryPage;
