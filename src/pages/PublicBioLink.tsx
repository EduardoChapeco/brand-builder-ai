import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { BioLinkRenderer } from "@/components/biolink/BioLinkRenderer";
import {
  isReservedBioLinkSlug,
  slugifyBioLink,
  type BioLinkPublicSnapshot,
} from "@/lib/biolink/registry";
import { loadPublishedBioLinkBySlug } from "@/lib/biolink/service";
import { trackBioLinkEvent } from "@/lib/biolink/tracking";

const PublicBioLink = () => {
  const { slug } = useParams<{ slug: string }>();
  const normalizedSlug = useMemo(() => slugifyBioLink(slug || ""), [slug]);
  const [snapshot, setSnapshot] = useState<BioLinkPublicSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchBioLink = async () => {
      if (!normalizedSlug) {
        setError("Bio Link nao encontrado.");
        setLoading(false);
        return;
      }

      if (isReservedBioLinkSlug(normalizedSlug)) {
        setError("Slug reservado pela aplicacao.");
        setLoading(false);
        return;
      }

      try {
        const data = await loadPublishedBioLinkBySlug(normalizedSlug);
        if (!active) return;

        if (!data || data.status === "draft") {
          setError("Bio Link nao encontrado.");
          return;
        }

        setSnapshot(data);
        await trackBioLinkEvent({
          slug: normalizedSlug,
          eventType: "page_view",
          metadata: {
            path: window.location.pathname,
          },
        });
      } catch (err) {
        console.error(err);
        if (active) {
          setError("Ocorreu um erro ao carregar.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchBioLink();

    return () => {
      active = false;
    };
  }, [normalizedSlug]);

  useEffect(() => {
    if (!snapshot) return;

    const previousTitle = document.title;
    const title = snapshot.seo.title || snapshot.displayName || snapshot.slug;
    document.title = title;

    const description = snapshot.seo.description || "";
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute("content") || null;

    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;
      if (metaDescription && previousDescription !== null) {
        metaDescription.setAttribute("content", previousDescription);
      }
    };
  }, [snapshot]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--surface-1)] text-[var(--text-primary)]">
        <div className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface-card)] px-5 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--workspace-brand)]" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">Carregando Bio Link...</span>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--surface-1)] px-6 text-[var(--text-primary)]">
        <div className="text-center">
          <h1 className="mb-3 text-3xl font-bold">404</h1>
          <p className="mx-auto max-w-md text-sm text-[var(--text-muted)]">{error || "Bio Link nao encontrado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-1)]">
      <BioLinkRenderer snapshot={snapshot} mode="public" />
    </div>
  );
};

export default PublicBioLink;
