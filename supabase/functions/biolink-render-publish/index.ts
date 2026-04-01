import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderBlocks = (blocks: Array<Record<string, unknown>>) =>
  blocks.map((block) => {
    const type = String(block.type || "link");
    if (type === "spacer") {
      return `<div style="height:${Number(block.height || 24)}px"></div>`;
    }

    if (type === "newsletter") {
      return `
        <section class="card">
          <p class="eyebrow">Newsletter</p>
          <h3>${escapeHtml(String(block.title || "Receba novidades"))}</h3>
          <p class="muted">${escapeHtml(String(block.note || ""))}</p>
          <div class="newsletter">
            <input placeholder="${escapeHtml(String(block.placeholder || "Seu melhor e-mail"))}" />
            <button>${escapeHtml(String(block.buttonLabel || "Quero receber"))}</button>
          </div>
        </section>
      `;
    }

    if (type === "map") {
      return `
        <section class="card">
          <p class="eyebrow">Mapa</p>
          <h3>${escapeHtml(String(block.title || "Localizacao"))}</h3>
          <p class="muted">${escapeHtml(String(block.note || block.url || ""))}</p>
          ${block.url ? `<a class="button" href="${escapeHtml(String(block.url))}" target="_blank" rel="noreferrer">Abrir no Maps</a>` : ""}
        </section>
      `;
    }

    if (type === "youtube" || type === "spotify") {
      return `
        <section class="card">
          <p class="eyebrow">${escapeHtml(type)}</p>
          <h3>${escapeHtml(String(block.title || "Embed"))}</h3>
          <p class="muted">${escapeHtml(String(block.url || ""))}</p>
        </section>
      `;
    }

    return `
      <a class="card card-link" href="${escapeHtml(String(block.url || "#"))}" target="_blank" rel="noreferrer">
        <span class="emoji">${escapeHtml(String(block.emoji || "->"))}</span>
        <div>
          <h3>${escapeHtml(String(block.title || block.label || "Link"))}</h3>
          ${block.note ? `<p class="muted">${escapeHtml(String(block.note))}</p>` : ""}
        </div>
      </a>
    `;
  }).join("\n");

const buildPublishedHtml = (row: Record<string, unknown>) => {
  const profile = (row.profile && typeof row.profile === "object" ? row.profile : {}) as Record<string, unknown>;
  const theme = (row.theme_config && typeof row.theme_config === "object" ? row.theme_config : {}) as Record<string, unknown>;
  const blocks = Array.isArray(row.blocks) ? row.blocks as Array<Record<string, unknown>> : [];
  const primary = String(theme.primaryColor || "#9353FF");
  const secondary = String(theme.secondaryColor || "#06B6D4");
  const accent = String(theme.accentColor || primary);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(String(profile.title || row.slug || "Bio Link"))}</title>
    <meta name="description" content="${escapeHtml(String((row.seo_config as Record<string, unknown> | null)?.description || profile.bio || ""))}" />
    <style>
      :root {
        --primary: ${primary};
        --secondary: ${secondary};
        --accent: ${accent};
        --bg: #09090f;
        --surface: rgba(255,255,255,0.08);
        --border: rgba(255,255,255,0.12);
        --text: #f8fafc;
        --muted: rgba(248,250,252,0.72);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "DM Sans", system-ui, sans-serif;
        background: radial-gradient(circle at top, rgba(147,83,255,0.25), transparent 38%), linear-gradient(135deg, #09090f 0%, #1e1b4b 100%);
        color: var(--text);
      }
      .shell {
        width: min(520px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 32px 0 48px;
      }
      .hero, .card {
        border: 1px solid var(--border);
        background: var(--surface);
        backdrop-filter: blur(18px);
        border-radius: 28px;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
      }
      .hero { padding: 28px 24px; text-align: center; margin-bottom: 18px; }
      .avatar {
        width: 92px; height: 92px; border-radius: 999px; margin: 0 auto 16px;
        display: grid; place-items: center; font-weight: 800; font-size: 30px;
        color: white; background: var(--primary); overflow: hidden;
      }
      .avatar img { width: 100%; height: 100%; object-fit: cover; }
      .eyebrow {
        margin: 0 0 8px;
        text-transform: uppercase;
        letter-spacing: .12em;
        font-size: 11px;
        color: var(--muted);
      }
      h1, h3 { margin: 0; }
      .bio { color: var(--muted); line-height: 1.6; margin: 10px 0 0; }
      .grid { display: grid; gap: 14px; }
      .card { padding: 18px; text-decoration: none; color: inherit; display: block; }
      .card-link { display: flex; align-items: center; gap: 14px; }
      .emoji {
        width: 44px; height: 44px; border-radius: 16px; display: grid; place-items: center;
        background: rgba(14,165,233,0.15); flex-shrink: 0;
      }
      .muted { margin: 8px 0 0; color: var(--muted); line-height: 1.5; }
      .button, .newsletter button {
        display: inline-flex; align-items: center; justify-content: center;
        min-height: 46px; border-radius: 14px; padding: 0 18px;
        border: none; background: var(--primary); color: white;
        font-weight: 700; text-decoration: none; margin-top: 14px;
      }
      .newsletter { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
      .newsletter input {
        flex: 1 1 220px; min-height: 46px; border-radius: 14px; padding: 0 14px;
        border: 1px solid var(--border); background: rgba(255,255,255,0.04); color: var(--text);
      }
      footer {
        text-align: center;
        margin-top: 26px;
        font-size: 11px;
        letter-spacing: .12em;
        text-transform: uppercase;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="avatar">
          ${profile.avatar ? `<img src="${escapeHtml(String(profile.avatar))}" alt="${escapeHtml(String(profile.handle || row.slug || ""))}" />` : escapeHtml(String(profile.handle || row.slug || "PG")).slice(0, 2).toUpperCase()}
        </div>
        <p class="eyebrow">${escapeHtml(String(profile.title || "Bio Link Premium"))}</p>
        <h1>@${escapeHtml(String(profile.handle || row.slug || ""))}</h1>
        ${profile.bio ? `<p class="bio">${escapeHtml(String(profile.bio))}</p>` : ""}
        ${profile.location ? `<p class="bio">${escapeHtml(String(profile.location))}</p>` : ""}
      </section>
      <section class="grid">
        ${renderBlocks(blocks)}
      </section>
      <footer>Criado com PostGen AI</footer>
    </main>
  </body>
</html>`;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, biolink_id } = await req.json() as {
      workspace_id?: string;
      biolink_id?: string;
    };

    if (!workspace_id || !biolink_id) {
      return safeJsonResponse({ error: "workspace_id e biolink_id sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const { data: row, error } = await supabase
      .from("bio_links")
      .select("*")
      .eq("id", biolink_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (error || !row) {
      return safeJsonResponse({ error: "Bio Link nao encontrado para o workspace." }, 404);
    }

    const publishedHtml = buildPublishedHtml(row as Record<string, unknown>);
    const { data: updated, error: updateError } = await supabase
      .from("bio_links")
      .update({
        published_html: publishedHtml,
        is_published: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", biolink_id)
      .select("id, slug, is_published, published_html")
      .single();

    if (updateError) {
      throw updateError;
    }

    const appUrl = Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("SITE_URL") || "https://postgen.app";
    return safeJsonResponse({
      id: updated.id,
      slug: updated.slug,
      is_published: updated.is_published,
      public_url: `${appUrl.replace(/\/$/, "")}/b/${updated.slug}`,
      published_html: updated.published_html,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
