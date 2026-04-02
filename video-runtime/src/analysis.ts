type SubtitleWord = {
  text?: string;
  start?: number;
  end?: number;
};

const VIRAL_KEYWORDS = [
  "agora",
  "segredo",
  "erro",
  "ninguem",
  "rapido",
  "viral",
  "dinheiro",
  "resultado",
  "crescer",
  "atencao",
];

export const buildViralHeatmap = (words: SubtitleWord[]) => {
  const buckets = new Map<number, { second: number; score: number; words: number; hooks: number }>();

  for (const word of words) {
    const second = Math.max(0, Math.floor(Number(word.start || 0)));
    const current = buckets.get(second) || { second, score: 0, words: 0, hooks: 0 };
    current.words += 1;
    const text = String(word.text || "").toLowerCase();
    if (VIRAL_KEYWORDS.some((keyword) => text.includes(keyword))) {
      current.hooks += 1;
    }
    current.score = Math.min(1, current.words / 4 + current.hooks * 0.18);
    buckets.set(second, current);
  }

  return Array.from(buckets.values())
    .sort((left, right) => left.second - right.second)
    .map((bucket) => ({
      second: bucket.second,
      score: Number(bucket.score.toFixed(4)),
      words: bucket.words,
      hooks: bucket.hooks,
      recommendation: bucket.score >= 0.8
        ? "strong_short_candidate"
        : bucket.score >= 0.55
          ? "review_for_cut"
          : "baseline",
    }));
};
