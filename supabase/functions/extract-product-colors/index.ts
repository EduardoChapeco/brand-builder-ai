import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, safeJsonResponse } from "../_shared/postgen.ts";

const normalizePalette = (palette: string[] = []) =>
  palette
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.startsWith("#") ? item : `#${item}`)
    .slice(0, 5);

const inferCategory = (text: string) => {
  const normalized = text.toLowerCase();
  if (/perfume|skincare|serum|cosmetic|maquiagem|batom|creme/.test(normalized)) return "Cosmético";
  if (/chocolate|snack|food|bebida|cookie|bar|cafe|suco/.test(normalized)) return "Alimento";
  if (/camisa|moda|vestuario|jaqueta|roupa|tenis/.test(normalized)) return "Vestuário";
  if (/phone|tech|fone|notebook|gadget|hardware/.test(normalized)) return "Tech";
  return "Outro";
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      provided_palette,
      product_description,
      filename,
    } = await req.json() as {
      provided_palette?: string[];
      product_description?: string;
      filename?: string;
    };

    const palette = normalizePalette(provided_palette || []);
    const product_category = inferCategory([product_description, filename].filter(Boolean).join(" "));

    return safeJsonResponse({
      palette,
      product_category,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
