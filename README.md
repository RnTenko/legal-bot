# legit-bot - помощник юристов и директоров юр услуг для ПСБ банка

## Навигация:
```
chatbot-ui/
├── compose.yaml              # запуск одного контейнера: сборка backend/Dockerfile, порт 8000, env LLM_*, DATA_DIR
├── README.md                 # документация проекта (для сдачи: архитектура, запуск, env, ограничения)
│
├── data/                     # вшивается в образ при сборке (COPY)
│   ├── knowledge-base.zip    # база знаний: юридические документы внутри (.txt/.md/.docx)
│   └── questions.csv         # вопросы id,question — только для автосабмита, веб-серверу не нужен
│
├── backend/
│   ├── Dockerfile            # 2 стадии: сборка фронта (pnpm) → python-runtime; кладёт dist→frontend_dist, data→/app/data; uvicorn :8000
│   ├── requirements.txt      # python-зависимости: fastapi, uvicorn, pydantic, httpx
│   ├── server.py             # FastAPI: POST /api/chat (SSE), /api/health, /api/documents (заглушки 501), раздаёт статику фронта
│   └── solution.py           # RAG-ядро: загрузка KB, чанкинг, санитизация injection, BM25+эмбеддинги+реранк,
│                             #   фильтр по контрагенту, промпт, верификация цитат; main() → submission.csv (автосабмит)
│
└── frontend/
    ├── index.html            # точка входа SPA, div#root
    ├── package.json          # зависимости и скрипты dev/build
    ├── pnpm-lock.yaml        # зафиксированные версии зависимостей
    ├── pnpm-workspace.yaml   # конфиг pnpm (allowBuilds для esbuild)
    ├── tsconfig.json         # настройки TypeScript
    ├── vite.config.ts        # сборка vite: react-плагин, dev :5173, proxy /api → :8000
    ├── public/favicon.svg    # иконка вкладки
    ├── dist/                 # старая локальная сборка; в docker не используется (образ собирает фронт заново) — можно удалить
    ├── node_modules/         # локальные зависимости; в образ не попадают (там чистый pnpm install)
    ├── tools/fake-errors.py  # вспомогательный скрипт (симуляция ошибок), в сборке не участвует
    │
    └── src/
        ├── main.tsx          # вход React: createRoot → App
        ├── App.tsx           # корневой компонент: ChatWindow + useChat
        ├── index.css         # все стили приложения
        ├── vite-env.d.ts     # типы для VITE_*-переменных
        │
        ├── api/
        │   ├── client.ts     # POST /api/chat, разбор SSE-потока (delta / citation / [DONE])
        │   ├── mock.ts       # демо-ответы без бэкенда (VITE_USE_MOCK=true)
        │   └── types.ts      # типы: Message, Citation, ChatRequest
        │
        ├── hooks/
        │   └── useChat.ts    # состояние чата: сообщения, стриминг, история, abort, reset
        │
        └── components/
            ├── ChatWindow.tsx    # окно сообщений, автоскролл, шапка
            ├── ChatInput.tsx     # поле ввода: Enter — отправить, paste >3000 символов → чип-вложение
            ├── MessageBubble.tsx # пузырь сообщения: markdown у бота, typing-индикатор, ошибки
            ├── Citations.tsx     # раскрывающийся блок «Источники» с цитатами
            └── EmptyState.tsx    # стартовый экран с пресетами вопросов
```
## Настройка проекта
- Настройка ИИ
```.env
LLM_BASE_URL=https://<хост-API>/v1
LLM_API_KEY=sk-...
LLM_MODEL=deepseek/deepseek-v4.1-flash
```

- Сборка
```bash
docker compose up --build -d
docker compose logs -f app     # первый старт: индекс + эмбеддинги, до пары минут
```
→ UI и API: http://localhost:8000 · проверка: можно через curl -I /api/health или просто откройте страницу в браузере: http://localhost:8000/api/health

- Остановка проекта
```bash
docker compose down
```
