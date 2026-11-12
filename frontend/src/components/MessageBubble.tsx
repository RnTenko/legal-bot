import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Citations } from './Citations';
import type { Message } from '../api/types';

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';

  return (
    <div className={`msg ${isUser ? 'msg-user' : 'msg-bot'}`}>
      <div className="msg-avatar" aria-hidden="true">
        {isUser ? 'Вы' : 'ИИ'}
      </div>
      <div className="msg-body">
        <div className="msg-content">
          {isStreaming && !message.content ? (
            <TypingIndicator />
          ) : isUser ? (
            <p>{message.content}</p>
          ) : (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="cursor" aria-hidden="true" />}
            </>
          )}
        </div>

        {message.citations && message.citations.length > 0 && (
          <Citations citations={message.citations} />
        )}

        {message.status === 'error' && (
          <div className="msg-error">
            Не удалось получить ответ: {message.error ?? 'неизвестная ошибка'}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="typing" aria-label="Ассистент печатает">
      <span />
      <span />
      <span />
    </div>
  );
}
