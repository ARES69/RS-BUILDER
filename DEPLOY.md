# Deployment / Деплой

RS-BUILDER — статический SPA + опциональный агентский бэкенд. Ниже четыре проверенных маршрута.

## 0. Переменные окружения (билд-тайм)

| Переменная | Зачем | Пример |
|---|---|---|
| `VITE_ROUTER_MODE` | `browser` (чистые URL, нужен SPA-fallback) или `hash` (любой статик, даже `file://`) | `browser` |
| `VITE_AGENT_API_URL` | URL живого бэкенда. Пусто → встроенный симулятор | `https://agent.example.com` |
| `VITE_APP_NAME` / `VITE_APP_TAGLINE` / `VITE_SUPPORT_EMAIL` | Бренд и почта в UI | — |

Vite подхватывает их из окружения процесса при `npm run build`, поэтому в CI/хостинге задавайте их **до** сборки.

## 1. Vercel (фронтенд + бэкенд вместе)

Бэкенд живёт в `api/` как Vercel Functions (`api/v1/runs.mjs`, `api/v1/health.mjs`) поверх общего
ядра `server/core.mjs`. В проде фронтенд ходит в него **same-origin**: `VITE_AGENT_API_URL=/api`
— CORS не нужен вообще. Локально можно продолжать гонять standalone-сервер на `:8787`.

```bash
export VERCEL_TOKEN=***        # или: vercel login
npm run deploy:vercel             # link → env → build → prod-деплой
```

Скрипт сам проставляет `VITE_AGENT_API_URL=/api` в production-окружение и деплоит
(`vercel.json` уже содержит rewrite `/(.*) → /index.html`; функции в `api/` Vercel
проверяет до rewrites, поэтому `/api/v1/runs` не перекрывается SPA-fallback).

Проверить функции локально без аккаунта: `npm run test:api` (мок req/res, тот же контракт).

Текущий прод: https://rs-builder-sigma.vercel.app (health: `/api/v1/health`).
После деплоя не забудьте снять Deployment Protection для продакшена, если сайт должен
быть публичным: Settings → Deployment Protection → Vercel Authentication = Disabled
(или через API: `PATCH /v9/projects/<id>` с `{"ssoProtection": null}`).

## 2. Netlify

```bash
npm i -g netlify-cli
netlify login
netlify deploy --build --prod --dir=dist
```

SPA-fallback уже лежит в `public/_redirects` (`/* /index.html 200`). Env-переменные: Site settings → Environment variables → rebuild.

## 3. Cloudflare Pages

```bash
npm i -g wrangler
wrangler login
wrangler pages deploy dist --project-name=rs-builder
```

Build command `npm run build`, output `dist`. SPA-fallback: добавьте `public/_routes.json` при необходимости или используйте функцию-фолбэк Cloudflare.

## 4. Свой VPS / Docker

```bash
docker build -t rs-builder .
docker run -d -p 8080:8080 --name rs-builder rs-builder
```

`nginx.conf`: gzip, кэш `/assets` на год, SPA-fallback, порт 8080. Healthcheck внутри образа.

## 5. Вообще без сервера

```bash
npm run build:preview   # → preview/rs-builder.html (hash-роутинг, всё инлайном)
```

Один файл можно положить куда угодно, открыть с диска или вложить в письмо/презентацию.

---

## Агентский бэкенд

Референс-сервер (zero-deps, Node 20+):

```bash
npm run server                       # http://localhost:8787
VITE_AGENT_API_URL=http://localhost:8787 npm run dev
```

Контракт (`server/agent-server.mjs` описан полностью в шапке файла):

- `GET /v1/health` → `{ok, name, version}`
- `POST /v1/runs` с телом `{prompt, locale}` → SSE-поток событий:
  `run_start → message(user) → message(agent) → plan → [step_start → thought* → tool* → browse* → console* → file* → progress → step_done]* → artifact → delivered → message(agent) → done`
- Каждое сообщение: `data: <json>\n\n`; локализованные строки в формате `{en, ru}`.
- Отмена: клиент рвёт соединение (AbortController) — сервер останавливает генерацию.

Заменить референс на настоящий оркестратор (LangGraph, свой цикл с tool-calling, прокси к LLM) можно, не трогая фронтенд: достаточно стримить те же события. CORS открыт (`*`) для простоты разработки — в проде ограничьте своим доменом.

## 6. Настоящий LLM-оркестратор (вместо детерминированного ядра)

Движок выбирается на рантайме (`server/engine.mjs`): если задан ключ провайдера — работает
LLM-цикл с tool-calling (`server/orchestrator.mjs`), иначе детерминированное ядро.
Контракт событий одинаковый, UI не меняется.

| Переменная | Пример | Зачем |
|---|---|---|
| `OPENAI_API_KEY` | `sk-…` | включает OpenAI-совместимый провайдер |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | любой OpenAI-compatible эндпоинт (OpenRouter, Together, vLLM) |
| `OPENAI_MODEL` | `auto-free` | модель или `auto-free` = авто-подбор бесплатных (`:free`) моделей с тулзами |
| `RSB_LLM_MODEL_CHAIN` | `a,b,c` | явная цепочка: при 402/403/429/404 оркестратор переходит к следующей |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | включает Anthropic (если нет OpenAI-ключа) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | модель |

Что оркестратор делает по-настоящему:
- план и рассуждения придумывает модель (инструменты `submit_plan`, `think`, `step_done`);
- `run_code` реально выполняется в `node:vm`-песочнице (без fs/net/process, таймаут 2.5s);
- `web_fetch` реально ходит в интернет, с SSRF-гардом (private/loopback-адреса и не-http схемы заблокированы) и лимитом 6KB текста;
- `write_file`/`read_file` ведут in-memory файловую систему запуска; артефакт — либо `deliver_artifact` от модели, либо собирается из файлов воркспейса;
- предохранители: ≤6 шагов, ≤8 tool-вызовов на шаг, ≤28 всего, дедлайн 10 минут, таймаут LLM-запроса 45s; при падении LLM запуск автоматически уходит на детерминированный движок.

Локально: `OPENAI_API_KEY=… npm run server`. Прод: `vercel env add OPENAI_API_KEY production`
и redeploy. Проверка без настоящего ключа: `npm run test:orchestrator` (мок-LLM гонит весь цикл).

**Бесплатный режим (0 кредитов):** при `OPENAI_MODEL=auto-free` оркестратор сам обнаруживает
через `GET /v1/models` все модели с ценой $0 и поддержкой tools (кэш 10 минут) и идёт по ним
цепочкой, пропуская 402/403 («agentic harness only»)/429/404. Статический фолбэк-чейн —
Nemotron / Gemma / Laguna / Llama / Qwen / DeepSeek (`:free`). Выбранная модель приходит
в событии `model` и видна в логе запуска.

## Чек-лист релиза

```bash
npm run release      # typecheck → build → single-file preview → smoke → backend contract
```

Скрипт собирает артефакты в `release/` (dist + single-file + server), которые можно отдать кому угодно.
