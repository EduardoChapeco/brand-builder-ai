export type NewsCandidate = {
  title: string;
  description: string;
  source_url: string;
  source_name: string;
  published_at: string | null;
  categories: string[];
};

export const stripHtml = (value: string) =>
  value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export const parseRssXml = (xml: string, sourceName: string): NewsCandidate[] => {
  const items: NewsCandidate[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1];
    const getTagValue = (tag: string) => {
      const pattern = new RegExp(
        `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
        "i",
      );
      return (pattern.exec(itemContent)?.[1] || "").trim();
    };

    const title = getTagValue("title");
    const link = getTagValue("link") || getTagValue("guid");
    if (!title || !link) continue;

    const rawCategories = Array.from(itemContent.matchAll(/<category[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi))
      .map((item) => item[1]?.trim())
      .filter(Boolean) as string[];

    items.push({
      title: stripHtml(title),
      description: stripHtml(getTagValue("description")).slice(0, 360),
      source_url: link,
      source_name: sourceName,
      published_at: getTagValue("pubDate") || getTagValue("dc:date") || null,
      categories: rawCategories,
    });
  }

  return items;
};

export const dedupeByUrl = <T extends { source_url: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.source_url)) return false;
    seen.add(item.source_url);
    return true;
  });
};

export const computeNewsRelevance = (
  article: Pick<NewsCandidate, "title" | "description" | "categories" | "published_at">,
  brandContext: {
    segment?: string | null;
    target_audience?: string | null;
    pain_points?: string | null;
    main_differentials?: string | null;
    keywords?: string[] | null;
    content_pillars?: Array<{ name?: string; description?: string }> | null;
  },
) => {
  const haystack = [
    article.title,
    article.description,
    ...(article.categories || []),
  ].join(" ").toLowerCase();

  const weightedTerms = [
    brandContext.segment,
    brandContext.target_audience,
    brandContext.pain_points,
    brandContext.main_differentials,
    ...(Array.isArray(brandContext.keywords) ? brandContext.keywords : []),
    ...(Array.isArray(brandContext.content_pillars)
      ? brandContext.content_pillars.flatMap((pillar) => [pillar?.name, pillar?.description].filter(Boolean))
      : []),
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).toLowerCase().split(/[,\n;/|]+/))
    .map((value) => value.trim())
    .filter((value) => value.length > 2);

  const uniqueTerms = Array.from(new Set(weightedTerms));
  const matched = uniqueTerms.filter((term) => haystack.includes(term));

  const publishedAt = article.published_at ? new Date(article.published_at).getTime() : Date.now();
  const ageHours = Math.max(0, (Date.now() - publishedAt) / 36e5);
  const freshness = Math.max(10, 45 - Math.min(36, ageHours));
  const matchScore = Math.min(45, matched.length * 9);
  const categoryBonus = (article.categories || []).length > 0 ? 6 : 0;
  const score = Math.max(0, Math.min(100, Math.round(freshness + matchScore + categoryBonus)));

  return {
    score,
    reason: matched.length > 0
      ? `Coincidencias com o briefing: ${matched.slice(0, 5).join(", ")}`
      : "Pontuacao baseada principalmente em frescor e aderencia geral ao nicho.",
  };
};
