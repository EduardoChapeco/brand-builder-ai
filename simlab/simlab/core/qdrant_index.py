from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from simlab.core.settings import Settings
from simlab.models.contracts import PersonaDefinition


@dataclass(slots=True)
class QdrantHit:
    persona_id: str
    score: float


class QdrantPersonaIndex:
    def __init__(self, settings: Settings, embedder: object | None = None) -> None:
        self.settings = settings
        self.embedder = embedder
        self._client = None

    def _require_client(self):
        if not self.settings.has_qdrant:
            raise RuntimeError("Qdrant is not configured.")
        try:
            from qdrant_client import QdrantClient
        except ImportError as exc:  # pragma: no cover - dependency guard
            raise RuntimeError("qdrant-client is not installed") from exc

        if self._client is None:
            self._client = QdrantClient(
                url=self.settings.qdrant_url,
                api_key=self.settings.qdrant_api_key,
            )
        return self._client

    async def ping(self) -> bool:
        if not self.settings.has_qdrant:
            return False
        client = self._require_client()
        client.get_collections()
        return True

    async def ensure_collection(self) -> None:
        if not self.settings.has_qdrant:
            return
        client = self._require_client()
        from qdrant_client.http import models as qmodels

        collections = client.get_collections().collections
        if any(collection.name == self.settings.qdrant_collection for collection in collections):
            return

        client.create_collection(
            collection_name=self.settings.qdrant_collection,
            vectors_config=qmodels.VectorParams(
                size=self.settings.qdrant_vector_size,
                distance=qmodels.Distance.COSINE,
            ),
        )

    async def upsert_personas(self, personas: Sequence[PersonaDefinition]) -> None:
        if not self.settings.has_qdrant:
            return
        if self.embedder is None:
            raise RuntimeError("Qdrant embedding provider is not configured.")
        client = self._require_client()
        texts = [
            f"{persona.name}\n{persona.demographic}\n{persona.psychography}\n{persona.digital_behavior}"
            for persona in personas
        ]
        embeddings = await self.embedder.embed_texts(texts)
        from qdrant_client.http import models as qmodels

        points = []
        for persona, vector in zip(personas, embeddings, strict=True):
            points.append(
                qmodels.PointStruct(
                    id=persona.id,
                    vector=vector,
                    payload=persona.model_dump(mode="json"),
                )
            )

        client.upsert(collection_name=self.settings.qdrant_collection, points=points)

    async def search(self, query: str, limit: int = 4) -> list[QdrantHit]:
        if not self.settings.has_qdrant:
            return []
        if self.embedder is None:
            raise RuntimeError("Qdrant embedding provider is not configured.")

        client = self._require_client()
        embeddings = await self.embedder.embed_texts([query])
        hits = client.search(
            collection_name=self.settings.qdrant_collection,
            query_vector=embeddings[0],
            limit=limit,
        )
        return [QdrantHit(persona_id=str(hit.id), score=float(hit.score or 0.0)) for hit in hits]
