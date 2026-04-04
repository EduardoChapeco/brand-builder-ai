import { useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

/**
 * WorkspaceThemeInjector
 * SDD-1.0 — Injeta as variáveis de marca do Brand Kit no :root do documento.
 * Garante que todo o SaaS reflita a identidade visual do cliente em tempo real.
 *
 * Lê a estrutura JSONB real do banco:
 *   brandKit.colors.{primary, secondary, accent, background, text}
 *   brandKit.fonts.{heading, body, mono, display}
 *   brandKit.voice.{border_radius_scale, shadow_style, animation_style}
 */
export function WorkspaceThemeInjector() {
  const { brandKit } = useWorkspace();

  useEffect(() => {
    if (!brandKit) return;

    const root = document.documentElement;
    const colors = brandKit.colors || {};
    const fonts  = brandKit.fonts  || {};
    const voice  = brandKit.voice  || {};

    // 1. Injetar Cores (lendo do JSONB real)
    if (colors.primary)    root.style.setProperty('--sw-primary',    colors.primary);
    if (colors.secondary)  root.style.setProperty('--sw-secondary',  colors.secondary);
    if (colors.accent)     root.style.setProperty('--sw-accent',     colors.accent);
    if (colors.background) root.style.setProperty('--sw-bg-dark',    colors.background);
    if (colors.bg_light)   root.style.setProperty('--sw-bg-light',   colors.bg_light);
    if (colors.text)       root.style.setProperty('--sw-text-dark',  colors.text);
    if (colors.text_light) root.style.setProperty('--sw-text-light', colors.text_light);
    if (colors.success)    root.style.setProperty('--sw-success',    colors.success);
    if (colors.warning)    root.style.setProperty('--sw-warning',    colors.warning);
    if (colors.danger)     root.style.setProperty('--sw-danger',     colors.danger);

    // 2. Injetar Fontes (lendo do JSONB real)
    if (fonts.heading) root.style.setProperty('--sw-font-heading', fonts.heading);
    if (fonts.body)    root.style.setProperty('--sw-font-body',    fonts.body);
    if (fonts.mono)    root.style.setProperty('--sw-font-mono',    fonts.mono);
    if (fonts.display) root.style.setProperty('--sw-font-display', fonts.display);

    // 3. Carregar Google Fonts dinamicamente
    const fontsToLoad = [fonts.heading, fonts.body, fonts.display, fonts.mono].filter((f): f is string => !!f);
    
    if (fontsToLoad.length > 0) {
      const uniqueFonts = [...new Set(fontsToLoad)];
      const fontQuery = uniqueFonts
        .map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`)
        .join('&');
      const linkId = 'sw-dynamic-fonts';
      let link = document.getElementById(linkId) as HTMLLinkElement | null;
      
      if (!link) {
        link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.setAttribute('data-source', 'simwork-theme');
        document.head.appendChild(link);
      }
      
      const newHref = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;
      if (link.href !== newHref) {
        link.href = newHref;
      }
    }

    // 4. Injetar Raio de Borda (lendo do voice.border_radius_scale)
    const radiusMap: Record<string, string> = {
      none:   '0px',
      small:  '4px',
      medium: '12px',
      large:  '24px',
      pill:   '9999px',
    };
    if (voice.border_radius_scale) {
      root.style.setProperty('--sw-radius', radiusMap[voice.border_radius_scale] || '12px');
    }

    // 5. Injetar variáveis de sombra
    const shadowMap: Record<string, string> = {
      none:   'none',
      subtle: '0 4px 20px rgba(0,0,0,0.1)',
      medium: '0 10px 30px rgba(0,0,0,0.25)',
      strong: '0 20px 40px rgba(0,0,0,0.5)',
    };
    if (voice.shadow_style) {
      root.style.setProperty('--sw-shadow', shadowMap[voice.shadow_style] || 'none');
    }

    // 6. Injetar velocidade de animação
    const motionMap: Record<string, string> = {
      none:    '0ms',
      minimal: '100ms',
      smooth:  '250ms',
      bouncy:  '350ms',
    };
    if (voice.animation_style) {
      root.style.setProperty('--sw-motion', motionMap[voice.animation_style] || '250ms');
    }

  }, [brandKit]);

  return null; // Componente invisível — apenas efeitos colaterais no DOM
}
