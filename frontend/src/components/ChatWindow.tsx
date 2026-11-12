import { useEffect, useRef } from 'react';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../api/types';

interface Props {
  messages: Message[];
  isStreaming: boolean;
  onSend: (text: string) => void;
}

export function ChatWindow({ messages, isStreaming, onSend }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = distanceFromBottom < 80;
  };

  useEffect(() => {
    const last = messages[messages.length - 1];
    const forceScroll = last?.role === 'user';
    if (forceScroll || pinnedRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      pinnedRef.current = true;
    }
  }, [messages]);

  return (
    <div className="chat-window">
      <header className="chat-header">
        <div className="chat-title">
          <h1>Юридический ассистент</h1>
          <span className="chat-subtitle">Отвечает только по базе знаний · ПСБ</span>
        </div>
      </header>

      <div
        ref={containerRef}
        className="messages"
        role="log"
        aria-live="polite"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <EmptyState onPick={onSend} />
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={endRef} />
      </div>

      <ChatInput onSend={onSend} disabled={isStreaming} />
    </div>
  );
}
