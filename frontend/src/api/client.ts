import type { ChatRequest, Citation } from './types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export interface StreamHandlers {
  onDelta: (text: string) => void;
  onCitation?: (c: Citation) => void;
  onDone: () => void;
  onError: (e: Error) => void;
}

export const api = {
  async chat(req: ChatRequest, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
    if (USE_MOCK) {
      const { mockChat } = await import('./mock');
      return mockChat(req, handlers, signal);
    }

    let res: Response;
    try {
      res = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(req),
        signal,
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      handlers.onError(new Error(`Сеть недоступна: ${(e as Error).message}`));
      return;
    }

    if (!res.ok || !res.body) {
      let detail = '';
      try { detail = await res.text(); } catch { /* ignore */ }
      handlers.onError(
        new Error(`Ошибка сервера (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`),
      );
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;

    const handleFrame = (frame: string) => {
      if (done) return;
      for (const line of frame.split(/\r?\n/)) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const data = t.slice(5).trim();
        if (!data) continue;
        if (data === '[DONE]') { done = true; return; }
        try {
          const evt = JSON.parse(data) as { delta?: string; citation?: Citation };
          if (typeof evt.delta === 'string') handlers.onDelta(evt.delta);
          if (evt.citation && handlers.onCitation) handlers.onCitation(evt.citation);
        } catch { /* skip */ }
      }
    };

    try {
      while (true) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? '';
        for (const f of frames) handleFrame(f);
        if (done) { handlers.onDone(); return; }
      }
      buffer += decoder.decode();
      if (buffer.trim()) handleFrame(buffer);
      handlers.onDone();
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      handlers.onError(e as Error);
    }
  },
};
