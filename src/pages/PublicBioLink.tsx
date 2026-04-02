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

// Slug prefixes that belong to the app workspace router — never resolve as Bio Links
const APP_PATH_PREFIXES = [
  "workspace",
  "workspaces",
  "onboarding",
  "dashboard",
  "settings",
  "b",
];

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
        setError("Bio Link não encontrado.");
        setLoading(false);
        return;
      }

      // Guard against routing into app prefixes
      if (isReservedBioLinkSlug(normalizedSlug) || APP_PATH_PREFIXES.includes(normalizedSlug)) {
        setError("Slug reservado pela aplicação.");
        setLoading(false);
        return;
      }

      try {
        const data = await loadPublishedBioLinkBySlug(normalizedSlug);
        if (!active) return;

        if (!data) {
          setError("Bio Link não encontrado ou ainda não publicado.");
          return;
        }

        setSnapshot(data);
        await trackBioLinkEvent({
          slug: normalizedSlug,
          eventType: "page_view",
          metadata: {
            path: window.location.pathname,
            referrer: document.referrer,
          },
        });
      } catch (err) {
        console.error(err);
        if (active) {
          setError("Ocorreu um erro ao carregar o Bio Link.");
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

  // SEO meta tag management
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

    // Open Graph tags
    const og = [
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      ...(snapshot.seo.imageUrl ? [{ property: "og:image", content: snapshot.seo.imageUrl }] : []),
      { property: "og:type", content: "profile" },
    ];
    const createdMeta: HTMLMetaElement[] = [];
    og.forEach(({ property, content }) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
        createdMeta.push(el);
      }
      el.setAttribute("content", content);
    });

    // Meta Pixel (Facebook/Meta)
    if (snapshot.tracking.metaPixelId) {
      const script = document.createElement("script");
      script.id = "meta-pixel";
      script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${snapshot.tracking.metaPixelId}');fbq('track','PageView');`;
      document.head.appendChild(script);
      createdMeta.push(script as unknown as HTMLMetaElement);
    }

    return () => {
      document.title = previousTitle;
      if (metaDescription && previousDescription !== null) {
        metaDescription.setAttribute("content", previousDescription);
      }
      createdMeta.forEach((el) => el.parentNode?.removeChild(el));
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
          <p className="mx-auto max-w-md text-sm text-[var(--text-muted)]">{error || "Bio Link não encontrado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <BioLinkRenderer snapshot={snapshot} mode="public" />
    </div>
  );
};

export default PublicBioLink;
