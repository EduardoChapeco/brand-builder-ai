import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Link2, Plus, QrCode, Trash2, GripVertical, Eye, Sparkles, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface BioLinkItem {
  id: string;
  label: string;
  url: string;
  emoji?: string;
}

const THEMES = [
  { id: 'glass-dark',  label: 'Glass Dark',  preview: 'from-slate-900 to-purple-900' },
  { id: 'gradient',    label: 'Gradient',    preview: 'from-purple-600 to-pink-500' },
  { id: 'minimal',     label: 'Minimal',     preview: 'from-white to-gray-100' },
  { id: 'neon',        label: 'Neon',        preview: 'from-black to-emerald-950' },
];

const generateBioHtml = (
  links: BioLinkItem[],
  handle: string,
  bio: string,
  primaryColor: string,
  theme: string,
  logoUrl?: string | null
): string => {
  const isDark = theme !== 'minimal';
  const bgMap: Record<string, string> = {
    'glass-dark': 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 100%)',
    'gradient':   'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
    'minimal':    'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    'neon':       'linear-gradient(135deg, #000000 0%, #064e3b 100%)',
  };
  const textColor = isDark ? '#ffffff' : '#111111';
  const cardBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${handle}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'DM Sans', system-ui, sans-serif;
  min-height: 100vh;
  background: ${bgMap[theme] || bgMap['glass-dark']};
  display: flex; align-items: flex-start; justify-content: center;
  padding: 40px 20px;
}
.container { width: 100%; max-width: 480px; }
.profile { text-align: center; margin-bottom: 32px; }
.avatar {
  width: 80px; height: 80px; border-radius: 50%;
  background: ${primaryColor};
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 28px; font-weight: 700;
  margin: 0 auto 12px;
  border: 3px solid rgba(255,255,255,0.2);
  box-shadow: 0 0 32px ${primaryColor}60;
}
.handle { font-size: 18px; font-weight: 700; color: ${textColor}; margin-bottom: 6px; }
.bio { font-size: 14px; color: ${isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}; }
.link-btn {
  display: block; width: 100%;
  background: ${cardBg};
  backdrop-filter: blur(12px);
  border: 1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'};
  border-radius: 16px; padding: 16px 24px;
  color: ${textColor}; text-decoration: none;
  font-size: 15px; font-weight: 600;
  margin-bottom: 12px;
  text-align: center;
  transition: all 0.2s; cursor: pointer;
}
.link-btn:hover { background: ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}; transform: translateY(-2px); }
.footer { text-align: center; margin-top: 32px; font-size: 11px; color: ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}; }
</style>
</head>
<body>
<div class="container">
  <div class="profile">
    <div class="avatar">${handle.slice(0, 2).toUpperCase()}</div>
    <p class="handle">@${handle}</p>
    <p class="bio">${bio}</p>
  </div>
  ${links.map(l => `<a href="${l.url}" class="link-btn" target="_blank">${l.emoji || ''} ${l.label}</a>`).join('\n  ')}
  <div class="footer">Feito com PostGen AI</div>
</div>
</body>
</html>`;
};

const BioLinkPage = () => {
  const { workspace, brandKit, briefing } = useWorkspace();
  const [links, setLinks] = useState<BioLinkItem[]>([]);
  const [theme, setTheme] = useState('glass-dark');
  const [bio, setBio] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftEmoji, setDraftEmoji] = useState('🔗');
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handle = briefing?.instagram_handle?.replace('@', '') ||
    briefing?.company_name?.toLowerCase().replace(/\s/g, '') ||
    workspace?.slug ||
    'suamarca';

  const primaryColor = brandKit?.color_primary || '#9353FF';

  const previewHtml = generateBioHtml(links, handle, bio, primaryColor, theme, brandKit?.logo_url);

  const addLink = () => {
    if (!draftLabel.trim() || !draftUrl.trim()) {
      toast.error('Preencha o label e a URL');
      return;
    }
    setLinks(current => [
      ...current,
      { id: crypto.randomUUID(), label: draftLabel.trim(), url: draftUrl.trim(), emoji: draftEmoji }
    ]);
    setDraftLabel('');
    setDraftUrl('');
    setDraftEmoji('🔗');
    toast.success('Link adicionado');
  };

  const removeLink = (id: string) => setLinks(current => current.filter(l => l.id !== id));

  const exportHtml = () => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biolink-${handle}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('BioLink exportado!');
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(previewHtml);
    toast.success('HTML copiado para a área de transferência');
  };

  return (
    <div className="page-layout gradient-mesh">
      <div className="page-hero">
        <div className="relative z-10">
          <p className="page-hero-eyebrow">Intelligence Suite • Bio Link</p>
          <h1 className="page-hero-title">Bio Link Builder</h1>
          <p className="page-hero-description">
            Crie páginas de link premium para Instagram, TikTok e WhatsApp — exportadas como HTML independente.
          </p>
        </div>
      </div>

      <div className="page-content no-scrollbar">
        <div className="flex gap-6 p-6 h-full">
          {/* Left — Editor */}
          <div className="flex flex-col gap-6" style={{ width: 360 }}>

            {/* Bio */}
            <div className="glass-card rounded-3xl p-6 shrink-0">
              <div className="flex items-center gap-3 border-b pb-5 mb-5" style={{ borderColor: 'var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--primary-muted)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Link2 size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-1)' }}>Configurações</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>@{handle}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Bio / Descrição</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={3}
                    placeholder="Copywriter | Instagram | Resultados reais"
                    className="w-full rounded-xl px-4 py-3 text-sm resize-none"
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-1)' }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Tema Visual</label>
                  <div className="grid grid-cols-2 gap-2">
                    {THEMES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className="flex flex-col items-start gap-2 p-3 rounded-xl transition-all"
                        style={{
                          background: theme === t.id ? 'var(--primary-muted)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${theme === t.id ? 'var(--primary)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <div className={`w-full h-5 rounded-md bg-gradient-to-r ${t.preview}`} />
                        <span className="text-[11px] font-semibold" style={{ color: theme === t.id ? 'var(--primary)' : 'var(--text-2)' }}>
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Add link */}
            <div className="glass-card rounded-3xl p-6 shrink-0">
              <h3 className="font-display text-base font-bold mb-4" style={{ color: 'var(--text-1)' }}>Adicionar Link</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    value={draftEmoji}
                    onChange={e => setDraftEmoji(e.target.value)}
                    className="w-14 rounded-xl px-3 py-2.5 text-center text-lg"
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-1)' }}
                  />
                  <input
                    value={draftLabel}
                    onChange={e => setDraftLabel(e.target.value)}
                    placeholder="Nome do link"
                    className="flex-1 rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-1)' }}
                  />
                </div>
                <input
                  value={draftUrl}
                  onChange={e => setDraftUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-1)' }}
                  onKeyDown={e => e.key === 'Enter' && addLink()}
                />
                <button
                  onClick={addLink}
                  className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
                  style={{ background: 'var(--primary)', color: '#fff' }}
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>

              {links.length > 0 && (
                <div className="mt-4 space-y-2">
                  {links.map((link, idx) => (
                    <div key={link.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <GripVertical size={14} style={{ color: 'var(--text-4)' }} />
                      <span className="text-sm flex-1 truncate font-medium" style={{ color: 'var(--text-2)' }}>
                        {link.emoji} {link.label}
                      </span>
                      <button onClick={() => removeLink(link.id)}>
                        <Trash2 size={14} style={{ color: 'var(--error)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <div className="glass-card rounded-3xl p-6 shrink-0">
              <h3 className="font-display text-base font-bold mb-4" style={{ color: 'var(--text-1)' }}>Exportar</h3>
              <div className="space-y-3">
                <button onClick={exportHtml}
                  className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
                  style={{ background: 'var(--primary)', color: '#fff' }}>
                  <ExternalLink size={16} /> Baixar HTML
                </button>
                <button onClick={copyHtml}
                  className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium border"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-2)' }}>
                  <Copy size={16} /> Copiar HTML
                </button>
              </div>
            </div>
          </div>

          {/* Right — Live Preview */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <Eye size={16} style={{ color: 'var(--primary)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Preview em tempo real</p>
              <div className="flex-1" />
              <span className="badge badge-primary">Live</span>
            </div>

            {/* Phone frame */}
            <div className="flex-1 flex items-start justify-center overflow-y-auto no-scrollbar">
              <div className="rounded-[36px] overflow-hidden shadow-2xl border-4"
                style={{ width: 390, minHeight: 700, borderColor: 'rgba(255,255,255,0.1)', background: '#000' }}>
                <iframe
                  srcDoc={previewHtml}
                  title="BioLink Preview"
                  style={{ width: '100%', height: 700, border: 'none' }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BioLinkPage;
