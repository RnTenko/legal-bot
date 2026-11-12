import { ChatWindow } from './components/ChatWindow';
import { useChat } from './hooks/useChat';

export default function App() {
  const chat = useChat();
  return (
    <div className="app app-single">
      <main className="main">
        <ChatWindow
          messages={chat.messages}
          isStreaming={chat.isStreaming}
          onSend={(text) => void chat.send(text)}
        />
      </main>
    </div>
  );
}
