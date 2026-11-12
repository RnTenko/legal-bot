import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Citation, Message } from '../api/types';

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesRef = useRef<Message[]>([]);
  const isStreamingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreamingRef.current) return;

    isStreamingRef.current = true;
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const userMessage: Message = {
      id: uid(), role: 'user', content: trimmed,
      createdAt: new Date().toISOString(), status: 'done',
    };
    const botId = uid();
    const botMessage: Message = {
      id: botId, role: 'assistant', content: '', citations: [],
      createdAt: new Date().toISOString(), status: 'streaming',
    };

    const history = messagesRef.current
      .filter((m) => m.status !== 'error' && m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMessage, botMessage]);

    const patch = (updater: (m: Message) => Message) =>
      setMessages((prev) => prev.map((m) => (m.id === botId ? updater(m) : m)));

    const finish = () => {
      isStreamingRef.current = false;
      setIsStreaming(false);
      abortRef.current = null;
    };

    try {
      await api.chat(
        { message: trimmed, history },
        {
          onDelta: (delta) => patch((m) => ({ ...m, content: m.content + delta })),
          onCitation: (c: Citation) =>
            patch((m) => ({
              ...m,
              citations: m.citations?.some((x) => x.documentId === c.documentId && x.quote === c.quote)
                ? m.citations
                : [...(m.citations ?? []), c],
            })),
          onDone: () => { patch((m) => ({ ...m, status: 'done' })); finish(); },
          onError: (err) => {
            patch((m) => ({ ...m, status: 'error', error: err.message }));
            finish();
          },
        },
        controller.signal,
      );
    } catch (e) {
      patch((m) => ({ ...m, status: 'error', error: (e as Error).message }));
      finish();
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setIsStreaming(false);
    isStreamingRef.current = false;
  }, []);

  return { messages, isStreaming, send, reset };
}
