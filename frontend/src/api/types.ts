export type Role = 'user' | 'assistant';

export interface Citation {
  documentId: string;
  documentName: string;
  section: string;
  page?: number;
  quote: string;
}

export type MessageStatus = 'pending' | 'streaming' | 'done' | 'error';

export interface Message {
  id: string;
  role: Role;
  content: string;
  citations?: Citation[];
  createdAt: string;
  status?: MessageStatus;
  error?: string;
}

export interface ChatRequest {
  message: string;
  history: Array<{ role: Role; content: string }>;
}
