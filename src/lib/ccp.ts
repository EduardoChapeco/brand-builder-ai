/**
 * SW-013: lib/ccp.ts — Context Control Protocol
 * Compila o snapshot de contexto da marca para alimentar chamadas de IA
 */

import { supabase } from './supabase';
import { logError } from './errorLogger';
import type { CCPSnapshot } from '@/types/database';

/**
 * Compila o CCP Snapshot — contexto completo da marca em um objeto tipado
 * Usado por todas as Edge Functions que chamam LLMs
 */
export async function getCCPSnapshot(workspaceId: string): Promise<CCPSnapshot | null> {
  try {
    // Busca workspace
    const { data: workspace, error: wsErr } = await supabase
      .from('sw_workspaces')
      .select('id, owner_id, name, slug, plan_id, avatar_url, sector, website, settings, created_at, updated_at')
      .eq('id', workspaceId)
      .single();

    if (wsErr || !workspace) {
      await logError({
        code: 'ERR_CCP_WORKSPACE_001',
        module: 'ccp',
        message: 'Workspace não encontrado ao montar CCP snapshot',
        detail: { workspaceId, error: wsErr?.message },
        workspaceId,
      });
      return null;
    }

    // Busca brand kit (tenta sw_brand_kits primeiro, fallback engios)
    const { data: brandKit } = await supabase
      .from('sw_brand_kits')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    // Busca briefing
    const { data: briefing } = await supabase
      .from('sw_briefings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    // Busca personas (agentes do tipo 'persona' e 'brand')
    const { data: personas } = await supabase
      .from('sw_agents')
      .select('id, workspace_id, name, type, status, avatar_url, identity, voice, memory, behavior, tools, integrations, created_by, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .in('type', ['persona', 'brand', 'creator'])
      .eq('status', 'active');

    // Busca perfis SimLab
    const { data: simlabProfiles } = await supabase
      .from('sw_simlab_profiles')
      .select('id, workspace_id, agent_id, name, persona, behaviors, insights, created_by, created_at, updated_at')
      .eq('workspace_id', workspaceId);

    return {
      workspace: workspace as CCPSnapshot['workspace'],
      brandKit: brandKit ?? null,
      briefing: briefing ?? null,
      personas: personas ?? [],
      simlabProfiles: simlabProfiles ?? [],
    };
  } catch (err) {
    await logError({
      code: 'ERR_CCP_SNAPSHOT_001',
      module: 'ccp',
      message: 'Falha ao montar CCP snapshot',
      detail: { error: String(err), workspaceId },
      workspaceId,
    });
    return null;
  }
}

/**
 * Serializa o CCP Snapshot em XML para injeção em system prompts de LLMs
 */
export function serializeCCPtoXML(snapshot: CCPSnapshot): string {
  const { workspace, briefing, brandKit, personas, simlabProfiles } = snapshot;

  return `<CCPSnapshot>
  <Workspace>
    <Name>${escapeXML(workspace.name)}</Name>
    <Slug>${escapeXML(workspace.slug)}</Slug>
    <Sector>${escapeXML(workspace.sector ?? '')}</Sector>
  </Workspace>

  <Briefing>
    <CompanyName>${escapeXML(briefing?.company_name ?? '')}</CompanyName>
    <Segment>${escapeXML(briefing?.segment ?? '')}</Segment>
    <Tagline>${escapeXML(briefing?.tagline ?? '')}</Tagline>
    <TargetAudience>${escapeXML(briefing?.target_audience ?? '')}</TargetAudience>
    <ValueProposition>${escapeXML(briefing?.value_proposition ?? '')}</ValueProposition>
    <ToneOfVoice>${escapeXML(briefing?.tone_of_voice ?? '')}</ToneOfVoice>
    <BrandDNA>${escapeXML(briefing?.brand_dna ?? '')}</BrandDNA>
    <ContentPillars>${(briefing?.content_pillars ?? []).map(p => `<Pillar>${escapeXML(p)}</Pillar>`).join('')}</ContentPillars>
    <CompletenessScore>${briefing?.completeness_score ?? 0}</CompletenessScore>
  </Briefing>

  <BrandKit>
    <Mission>${escapeXML(brandKit?.mission ?? '')}</Mission>
    <Vision>${escapeXML(brandKit?.vision ?? '')}</Vision>
    <Archetype>${escapeXML(brandKit?.archetype ?? '')}</Archetype>
    <Positioning>${escapeXML(brandKit?.positioning ?? '')}</Positioning>
    <PrimaryColor>${escapeXML((brandKit?.colors as Record<string,string>)?.primary ?? '')}</PrimaryColor>
    <ToneAdjectives>${JSON.stringify((brandKit?.tone_of_voice as Record<string,unknown>)?.adjectives ?? [])}</ToneAdjectives>
  </BrandKit>

  <Personas>
    ${personas.map(p => `
    <Persona>
      <Name>${escapeXML(p.name)}</Name>
      <Type>${escapeXML(p.type)}</Type>
      <Identity>${escapeXML(JSON.stringify(p.identity))}</Identity>
      <Voice>${escapeXML(JSON.stringify(p.voice))}</Voice>
    </Persona>`).join('')}
  </Personas>

  <SimLabProfiles>
    ${simlabProfiles.map(sp => `
    <Profile>
      <Name>${escapeXML(sp.name)}</Name>
      <Persona>${escapeXML(JSON.stringify(sp.persona))}</Persona>
      <Behaviors>${escapeXML(JSON.stringify(sp.behaviors))}</Behaviors>
    </Profile>`).join('')}
  </SimLabProfiles>
</CCPSnapshot>`;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
