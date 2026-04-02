export type Tone = 'Casual' | 'Sério' | 'Informativo' | 'Humor' | 'Urgente';
export type Funnel = 'Awareness' | 'Educativo' | 'Captar Leads' | 'Vendas' | 'Engajamento';

export interface RssTopic {
  title: string;
  description: string;
  url: string;
  source_name: string;
  published_at: string;
  source_type?: 'rss' | 'ai';
  trend_score?: number;
  hook_suggestions?: string[];
}
