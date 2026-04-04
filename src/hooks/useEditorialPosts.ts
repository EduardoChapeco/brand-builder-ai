/**
 * SW-070: useEditorialPosts — Hook canônico para Blog/News
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/errorLogger';
import type { SwEditorialPost, PostType, PostStatus } from '@/types/database';

interface UseEditorialPostsOptions {
  type?: PostType;
  status?: PostStatus;
}

interface UseEditorialPostsReturn {
  posts: SwEditorialPost[];
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  reload: () => void;
  createPost: (title: string, type: PostType) => Promise<SwEditorialPost | null>;
}

export function useEditorialPosts(
  workspaceId: string | null,
  opts: UseEditorialPostsOptions = {}
): UseEditorialPostsReturn {
  const [posts, setPosts] = useState<SwEditorialPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      let query = supabase
        .from('sw_editorial_posts')
        .select('id, workspace_id, type, title, slug, status, body, excerpt, cover_image, seo, author_id, source_id, scheduled_at, published_at, read_time_min, view_count, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (opts.type) query = query.eq('type', opts.type);
      if (opts.status) query = query.eq('status', opts.status);

      const { data, error: dbErr } = await query;

      if (dbErr) throw dbErr;
      setPosts(data as SwEditorialPost[] ?? []);
    } catch (err) {
      const code = 'ERR_EDITORIAL_LOAD_001';
      const message = err instanceof Error ? err.message : String(err);
      setError('Não foi possível carregar os artigos');
      setErrorCode(code);
      await logError({
        code,
        module: 'editorial',
        message: 'Falha ao carregar posts editoriais',
        detail: { error: message, workspaceId, opts },
        workspaceId,
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, opts.type, opts.status]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const createPost = useCallback(async (title: string, type: PostType): Promise<SwEditorialPost | null> => {
    if (!workspaceId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const { data, error: dbErr } = await supabase
        .from('sw_editorial_posts')
        .insert({
          workspace_id: workspaceId,
          type,
          title,
          slug: `${slug}-${Date.now()}`,
          status: 'draft',
          author_id: user?.id ?? null,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;
      await fetchPosts();
      return data as SwEditorialPost;
    } catch (err) {
      await logError({
        code: 'ERR_EDITORIAL_CREATE_001',
        module: 'editorial',
        message: 'Falha ao criar artigo',
        detail: { error: String(err), title, type },
        workspaceId,
      });
      return null;
    }
  }, [workspaceId, fetchPosts]);

  return { posts, isLoading, error, errorCode, reload: fetchPosts, createPost };
}
