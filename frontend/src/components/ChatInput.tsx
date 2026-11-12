import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';

const ATTACH_THRESHOLD = 3000;

export interface Attachment {
  id: string;
  name: string;
  content: string;
  size: number;
}

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.length <= ATTACH_THRESHOLD) return;
    e.preventDefault();
    const name = `pasted_${stamp()}.txt`;
    setAttachments((prev) => [
      ...prev,
      { id: uid(), name, content: pasted, size: new Blob([pasted]).size },
    ]);
  };

  const submit = () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    const parts = attachments.map((a) => `[Вложение: ${a.name}]\n${a.content}`);
    const composed = [...parts, trimmed].filter(Boolean).join('\n\n---\n\n');
    onSend(composed);
    setText('');
    setAttachments([]);
    setOpenId(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className="chat-input-wrap">
      <div className="chat-input">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          placeholder="Задайте вопрос… (Enter — отправить, Shift+Enter — новая строка)"
          rows={1}
          aria-label="Сообщение"
        />
        <button
          className="send-btn"
          onClick={submit}
          disabled={disabled || (!text.trim() && attachments.length === 0)}
          aria-label="Отправить"
        >
          {disabled ? <span className="spinner" /> : '→'}
        </button>
      </div>

      {attachments.length > 0 && (
        <ul className="attachments">
          {attachments.map((a) => (
            <li key={a.id} className="attachment">
              <button
                type="button"
                className="attachment-head"
                onClick={() => setOpenId(openId === a.id ? null : a.id)}
              >
                📎 {a.name} · {(a.size / 1024).toFixed(1)} KB
              </button>
              <button
                type="button"
                className="attachment-del"
                onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                aria-label="Удалить вложение"
              >
                ✕
              </button>
              {openId === a.id && (
                <pre className="attachment-preview">
                  {a.content.slice(0, 2000)}
                  {a.content.length > 2000 ? '…' : ''}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="disclaimer">
        Ассистент отвечает строго по предоставленной базе знаний. Проверяйте ссылки на источники.
      </p>
    </div>
  );
}
