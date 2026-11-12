import type { ChatRequest, Citation } from './types';
import type { StreamHandlers } from './client';

interface Answer {
  text: string;
  citations: Citation[];
}

const GK_49: Answer = {
  text:
    'Согласно п. 1 ст. 49 ГК РФ, правоспособность юридического лица возникает ' +
    'с момента внесения в ЕГРЮЛ сведений о его создании и прекращается в момент ' +
    'внесения сведений о его прекращении.\n\n' +
    'Для проверки контрагента запросите выписку из ЕГРЮЛ и сверьте ОГРН, ИНН, ' +
    'наименование и адрес. На основании п. 2 ст. 51 ГК РФ данные ЕГРЮЛ считаются ' +
    'достоверными, пока не доказано иное.\n\n' +
    '**Вывод:** контрагент правоспособен, если сведения о нём содержатся в ЕГРЮЛ ' +
    'и не внесены записи о прекращении.',
  citations: [
    {
      documentId: 'doc-demo-gk',
      documentName: 'ГК_РФ_статьи_49-51.pdf',
      section: 'п. 1 ст. 49',
      page: 12,
      quote:
        'Правоспособность юридического лица возникает с момента внесения в ЕГРЮЛ...',
    },
    {
      documentId: 'doc-demo-gk',
      documentName: 'ГК_РФ_статьи_49-51.pdf',
      section: 'п. 2 ст. 51',
      page: 14,
      quote:
        'Данные государственной регистрации включаются в ЕГРЮЛ, открытый для всеобщего ознакомления.',
    },
  ],
};

const USTAV: Answer = {
  text:
    'В предоставленной базе знаний отсутствуют положения о требованиях к ' +
    'уставному капиталу ООО. В базе только ст. 49–51 ГК РФ ' +
    '(правоспособность и регистрация юридического лица).\n\n' +
    'Уточните запрос или загрузите соответствующий документ (например, ФЗ «Об ООО»).',
  citations: [],
};

const NO_CONTEXT: Answer = {
  text:
    'Не могу дать ответ по этому запросу: релевантных положений в базе знаний не найдено.\n\n' +
    'Отвечаю строго по предоставленным документам, без внешних источников.',
  citations: [],
};

const GIBBERISH: Answer = {
  text:
    'Вопрос не распознан. Пожалуйста, сформулируйте запрос так, чтобы было понятно, ' +
    'какую правовую ситуацию вы хотите проверить.\n\n' +
    'Примеры корректных вопросов:\n' +
    '— Проверить правоспособность контрагента для выдачи кредита\n' +
    '— Какие документы подтверждают полномочия директора?\n' +
    '— Какие основания для расторжения кредитного договора?',
  citations: [],
};

const NO_CONFIRMATION: Answer = {
  text:
    'В базе знаний нет положений, прямо подтверждающих ответ на этот вопрос. ' +
    'Уточните, пожалуйста:\n\n' +
    '1. Какой именно документ регулирует ситуацию?\n' +
    '2. Какая редакция применима (на какую дату события)?',
  citations: [],
};

function pickAnswer(message: string): Answer {
  const msg = message.trim().toLowerCase();
  if (!msg) return NO_CONTEXT;
  if (/правоспособ|контрагент|егрюл|ст\.?\s*49|ст\.?\s*51|кредит/.test(msg)) return GK_49;
  if (/устав|капитал|ооо/.test(msg)) return USTAV;
  if (!/[а-яё]{3,}/.test(msg)) return GIBBERISH;
  return NO_CONFIRMATION;
}

export async function mockChat(
  req: ChatRequest,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const answer = pickAnswer(req.message);

  const chunks = answer.text.split(/(\s+)/);
  for (const chunk of chunks) {
    if (signal?.aborted) return;
    handlers.onDelta(chunk);
    await new Promise((r) => setTimeout(r, 24));
  }
  if (signal?.aborted) return;
  for (const c of answer.citations) handlers.onCitation?.(c);
  handlers.onDone();
}
