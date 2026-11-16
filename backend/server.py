"""HTTP-обёртка над solution.py. Backend сам отдаёт frontend (StaticFiles)."""
import asyncio
import json
import sys
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Импортируем только то, что есть в новой solution.py
from solution import (
    build_state,
    AppState,
    retrieve,
    generate_answer,
    API_BASE,
    LLM_KEY,
    parse_dialogue,
)

app = FastAPI()

# Глобальное состояние (индекс строится один раз при старте сервера)
print("Запуск build_state()...", file=sys.stderr, flush=True)
state: AppState = build_state()


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []


def _dialogue(req: ChatRequest) -> str:
    """Собирает историю в текстовый формат, понятный solution.py"""
    parts = [
        f"{'Пользователь' if m.role == 'user' else 'Ассистент'}: {m.content}"
        for m in req.history
    ]
    parts.append(f"Пользователь: {req.message}")
    return "\n\n".join(parts)


def _split_for_stream(text: str, words_per_chunk: int = 4) -> list[str]:
    words = text.split(" ")
    return [
        " ".join(words[i:i + words_per_chunk])
        + (" " if i + words_per_chunk < len(words) else "")
        for i in range(0, len(words), words_per_chunk)
    ]


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "chunks": len(state.chunks),
        "documents": "N/A",  # В новой версии нет отдельного списка metas, но chunks есть
        "llm_configured": bool(API_BASE and LLM_KEY),
    }


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not API_BASE or not LLM_KEY:
        raise HTTPException(500, "LLM_BASE_URL / LLM_API_KEY not configured")

    # Собираем диалог и парсим его (на случай если придет JSON-строка)
    raw_dialogue = _dialogue(req)
    dialogue = parse_dialogue(raw_dialogue)

    def _run_sync() -> str:
        with httpx.Client(timeout=120.0) as client:
            # Новая упрощенная цепочка вызовов
            selected_chunks = retrieve(
                client,
                dialogue,
                state.chunks,
                state.bm25_index,
                state.emb_cache,
                state.doc_to_contractors
            )
            answer = generate_answer(client, dialogue, selected_chunks)
        return answer

    # Запускаем синхронный RAG в отдельном потоке, чтобы не блокировать asyncio
    answer = await asyncio.to_thread(_run_sync)

    async def stream():
        yield ": keepalive\n\n"
        for chunk in _split_for_stream(answer):
            yield f"data: {json.dumps({'delta': chunk}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0)
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# Раздача статического фронта (собранного на первой стадии Dockerfile)
_DIST = Path(__file__).parent / "frontend_dist"
if _DIST.is_dir():
    app.mount("/", StaticFiles(directory=str(_DIST), html=True), name="frontend")
else:
    print(f"Внимание: папка frontend_dist не найдена по пути {_DIST}", file=sys.stderr)
