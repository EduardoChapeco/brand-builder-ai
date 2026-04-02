from __future__ import annotations

import json

from simlab.core.personas import PersonaCatalog
from simlab.core.settings import Settings
from simlab.models.contracts import ValidateContentRequest


def test_seed_personas_loads_12_profiles():
    source = Settings().seed_personas_path
    data = json.loads(source.read_text(encoding="utf-8"))
    assert len(data) == 12
    assert {item["id"] for item in data} >= {
        "BR_F_30_MAE_CLASSE_MEDIA",
        "BR_M_26_EMPREENDEDOR_DIGITAL",
        "BR_F_52_INTERIOR_CONSERVADORA",
        "BR_M_42_GESTOR_ANALITICO",
        "BR_F_21_GENZ_DIGITAL",
        "BR_M_38_PEQUENO_EMPRESARIO",
        "BR_M_55_ALTO_PADRAO",
        "BR_F_45_PROFISSIONAL_LIBERAL",
        "BR_M_19_UNIVERSITARIO_NORDESTE",
        "BR_F_35_INFLUENCER_ASPIRACIONAL",
        "BR_M_65_APOSENTADO_DIGITAL",
        "BR_F_28_SERVIDORA_PUBLICA",
    }


def test_persona_selection_prefers_relevant_seed():
    settings = Settings(
        supabase_url="",
        supabase_service_role_key="",
        internal_token="token",
    )
    catalog = PersonaCatalog(settings)
    request = ValidateContentRequest(
        workspace_id="11111111-1111-1111-1111-111111111111",
        module_type="content_post",
        stimulus_type="content",
        objective="Launch a premium service with authority and proof",
        audience_hint="high income audience",
        variants=[{"label": "A", "payload": {"headline": "Test"}}],
    )

    ranked = catalog.select_personas(request, 3)
    assert len(ranked) == 3
    assert ranked[0].persona.id in {
        "BR_M_55_ALTO_PADRAO",
        "BR_F_45_PROFISSIONAL_LIBERAL",
        "BR_M_42_GESTOR_ANALITICO",
        "BR_F_28_SERVIDORA_PUBLICA",
        "BR_M_38_PEQUENO_EMPRESARIO",
        "BR_F_30_MAE_CLASSE_MEDIA",
    }
