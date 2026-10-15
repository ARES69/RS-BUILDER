# Deployment / Деплой

RS-BUILDER — статический SPA + опциональный агентский бэкенд. Ниже четыре проверенных маршрута.

## 0. Переменные окружения (билд-тайм)

| Переменная | Зачем | Пример |
|---|---|---|
| `VITE_ROUTER_MODE` | `browser` (чистые URL, нужен SPA-fallback) или `hash` (любой статик, даже `file://`) | `browser` |
| `VITE_AGENT_API_URL` | URL живого бэкенда. Пусто → воркспейс без запусков (честная плашка) | `https://agent.example.com` |
| `VITE_APP_NAME` / `VITE_APP_TAGLINE` / `VITE_SUPPORT_EMAIL` | Бренд и почта в UI | — |

Vite подхватывает их из окружения процесса при `npm run build`, поэтому в CI/хостинге задавайте их **до** сборки.

## 1. Vercel (фронтенд + бэкенд вместе)

Бэкенд живёт в `api/` как Vercel Functions (`api/v1/runs.mjs`, `api/v1/health.mjs`) поверх общего
LLM-оркестратора (единственный движок). В проде фронтенд ходит в него **same-origin**: `VITE_AGENT_API_URL=/api`
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

## 6. LLM-оркестратор (единственный движок)

`server/engine.mjs` = тонкая обёртка над LLM-циклом с tool-calling (`server/orchestrator.mjs`).
Детерминированное ядро удалено: без доступных провайдеров запуск честно падает с причиной
в треде/джобе (`status: failed`, `error`).

| Переменная | Пример | Зачем |
|---|---|---|
| `OPENAI_API_KEY` | `sk-or-…` | включает OpenAI-совместимый провайдер (по умолчанию OpenRouter) |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` | любой OpenAI-compatible эндпоинт (OpenRouter, Together, vLLM) |
| `OPENAI_MODEL` | `auto-free` | модель или `auto-free` = авто-подбор бесплатных (`:free`) моделей с тулзами |
| `RSB_LLM_MODEL_CHAIN` | `a,b,c` | явная цепочка OpenRouter-моделей вместо авто-подбора |
| `RSB_PROVIDERS` | `openrouter,groq` | порядок/состав провайдеров; `none` = движок выключен (запуски падают честно) |
| `OPENCODE_API_KEY` | — | включает OpenCode Zen (анонимный free-tier закрыт политикой с октября 2026) |
| `RSB_ZEN_BASE_URL` | `https://opencode.ai/zen/v1` | переопределение эндпоинта Zen |
| `RSB_ZEN_MODELS` | `a-free,b-free` | явный список Zen-моделей вместо live-каталога |
| `GROQ_API_KEY` / `GEMINI_API_KEY` / `MISTRAL_API_KEY` / `NVIDIA_API_KEY` | — | бесплатные тиры провайдеров из awesome-free-models (включаются своим ключом) |
| `RSB_<ID>_MODELS` | `llama-3.3-70b-versatile` | явный список моделей для keyed-провайдера (GROQ/GEMINI/MISTRAL/NIM) |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | включает Anthropic (платный, opt-in) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | модель |

Что оркестратор делает по-настоящему:
- план и рассуждения придумывает модель (инструменты `submit_plan`, `think`, `step_done`);
- `run_code` реально выполняется в `node:vm`-песочнице (без fs/net/process, таймаут 2.5s);
- `web_fetch` реально ходит в интернет, с SSRF-гардом (private/loopback-адреса и не-http схемы заблокированы) и лимитом 6KB текста;
- `write_file`/`read_file` ведут in-memory файловую систему запуска; артефакт — либо `deliver_artifact` от модели, либо собирается из файлов воркспейса;
- предохранители: ≤6 шагов, ≤8 tool-вызовов на шаг, ≤28 всего, дедлайн 10 минут, таймаут LLM-запроса 45s; при недоступности всех провайдеров запуск завершается ошибкой с причиной (симуляции нет).

Локально: `OPENAI_API_KEY=… npm run server`. Прод: `vercel env add OPENAI_API_KEY production`
и redeploy. Проверка без настоящего ключа: `npm run test:orchestrator` (мок-LLM гонит весь цикл).

**Бесплатный режим (0 кредитов).** Порядок источников бесплатного инференса:

1. **OpenCode Zen** (`https://opencode.ai/zen/v1`, паттерн из [keman-ai/dsh-opencode-zen](https://github.com/keman-ai/dsh-opencode-zen)) —
   каталог free-моделей обнаруживается живьём через `GET /models` (кэш 1 час).
   **Внимание:** с октября 2026 Zen отклоняет анонимные chat-completions
   (`403 FreeTierError: free tier can only be used from within OpenCode`), поэтому
   провайдер включается только при `OPENCODE_API_KEY` (или явно через `RSB_PROVIDERS`).
   С ключом подаётся **платный** каталог cheapest-first (free-модели отклоняют и вызовы
   с ключом); нулевой баланс отвечает `402 Insufficient account funds`, провайдер уходит
   в cooldown на 15 минут — пополнение на opencode.ai подхватывается автоматически.
2. **OpenRouter** — при `OPENAI_MODEL=auto-free` оркестратор сам обнаруживает через
   `GET /models` все модели `:free` с ценой $0 и поддержкой tools (кэш 10 минут).
   Лимит бесплатного аккаунта: **50 запросов/день на все `:free`-модели** (сброс 00:00 UTC);
   $10 кредитов поднимают лимит до 1000/день. Статический фолбэк-чейн (снимок каталога 2026-10-14):
   Inkling / Nemotron / Dots / Laguna / Gemma / Qwen.
3. **Groq / Gemini / Mistral / NVIDIA NIM** — бесплатные тиры из курируемого списка
   [12britz/awesome-free-models](https://github.com/12britz/awesome-free-models); каждый
   включается своим ключом.
4. **Anthropic** — платный, opt-in.

Цепочка устойчива к мёртвым звеньям: любая ошибка провайдера/модели (401/402/403/404/429/5xx,
таймаут, сеть) переключает на следующее звено, а на 429 с далёким `x-ratelimit-reset`
провайдер уходит в cooldown до сброса квоты (не тратит round-trips впустую). Если все
звенья мертвы — запуск честно завершается ошибкой с причиной в треде.
Фактически выбранная модель приходит в событии `model` и видна в логе запуска и в
воркспейсе (чип «⚡ provider/model» под бейджем Live backend).

## Прод-проект и миграция 2026-10-14

Прод живёт в проекте Vercel **`rs-builder-app`** (не `rs-builder`!): старый проект получил
ложноположительный флаг abuse-сканера, и все новые деплои в него блокировались состоянием
`BLOCKED` без диагностики (код при этом чистый — проверено деплоем того же дерева в новый
проект). Алиас `rs-builder-sigma.vercel.app` перенесён на новый проект через
`POST /v2/deployments/{id}/aliases`, для пользователей URL не изменился. На новом проекте
по умолчанию стоял Vercel Authentication (`ssoProtection: all_except_custom_domains`) —
выключен через `PATCH /v9/projects/{id} {ssoProtection: null}`. **Корень BLOCKED найден:** Vercel валидирует email автора коммитов — деплои блокировались,
пока автором был невалидный `rs@builder.local` (CLI шлёт git-метаданные с деплоем).
После переписывания истории (`git filter-branch --env-filter`, автор и коммиттер =
`lookastarik <lookastarik@gmail.com>`, тот же email настрожен в `git config user.email`)
старый проект снова деплоится: проверено превью-деплоем `dpl_DnkaxK85EVYJa3h8ky4UvAvgMY1x`
(READY). Апелляция не нужна. **Правило на будущее: коммитить только с валидным email
аккаунта Vercel/Git.** Прод оставлен в `rs-builder-app` (оба проекта здоровы).

## 7. Настройки в продукте: статус, режимы и свои ключи (BYOK)

- **`GET /api/v1/status`** (и `GET /v1/status` у standalone-сервера) — живая интроспекция:
  движок, активные провайдеры, модель, кулдауны провайдеров (исчерпанные дневные квоты),
  кэши каталогов, отметка времени. Секретов в ответе нет.
- **`x-rsb-keys`** — заголовок запроса к `POST /api/v1/runs`: JSON вида
  `{"openrouter":"sk-or-…","groq":"gsk-…"}`. Ключи живут только время одного запроса
  (парсинг и валидация — `parseRuntimeKeys` в `server/orchestrator.mjs`), не логируются
  и не сохраняются: посетитель может дать билдеру свои бесплатные квоты, когда общие
  исчерпаны, без redeploy и без серверного хранения секретов.
- **Панель настроек в воркспейсе** (шестерёнка в топбаре): режим Auto/Simulator,
  живой статус бэкенда с кулдаунами и ссылки на получение ключа у каждого провайдера;
  ключи хранятся только в localStorage браузера (`src/lib/settings.ts`).
- Баннер в воркспейсе честно объясняет, когда все провайдеры в cooldown/недоступны,
  и ведёт в настройки (BYOK-ключи оживляют запуски мгновенно).

## 8. Очередь запусков (сервисный слой)

Синхронный SSE остался для совместимости, но основной путь продукта — **очередь**:

- `POST /api/v1/runs` с `{"mode":"queue"}` → `202 {jobId, statusUrl, streamUrl, cancelUrl}`;
  воркер (`POST /api/v1/worker`, защищён одноразовым `kickToken` из документа джобы)
  сливает события оркестратора в документ джобы порциями, с heartbeat'ом.
- Хранилище джобов (`server/jobstore.mjs`): **Vercel Blob** в проде (zero-config,
  `BLOB_READ_WRITE_TOKEN`), fs — локально/в тестах. `/api/v1/status` сообщает
  `jobStore` и `capabilities: ["queue"]`, когда очередь доступна.
- Клиент хвостит джобу через `GET /api/v1/jobstream?id=…&cursor=N`: закрытая вкладка,
  обрыв сети или перезапуск воркера не убивают запуск — хвост переподключается с курсором.
  Снапшот — `GET /api/v1/job?id=…`, стоп — `POST /api/v1/jobcancel?id=…` (воркер
  останавливается между батчами). Плоские пути с query-параметрами вместо динамических
  сегментов: platform-роутер молча сбрасывал `[id]`-роуты в SPA-rewrite.
- Vercel Blob в режиме OIDC (без статического токена): `put`/`list` работают сами,
  а `get()` требует явные `{access:'private', oidcToken}` и отдаёт байты в `stream`
  (не Response) — учтено в `server/jobstore.mjs`. Воркер пишет документ джобы
  целиком (single writer): read-modify-write терял батчи событий.
- Длинные прогоны (v2-чекпоинты): воркер перед дедлайном platform (240s) передаёт
  эстафету цепочкой (`kickWorker`), а оркестратор сериализует состояние на границах
  шагов (`runtime.onCheckpoint` → `job.checkpoint`: turns, plan, stepIndex, files,
  binaries base64, счётчики) и при resume продолжает LLM-цикл с середины, не повторяя
  план/шаги/тулзы и не сбрасывая UI повторным `run_start`. Прогоны >300s таким образом
  идут неограниченно долго; гранулярность возобновления — граница шага.
- Ретраи: cron `/api/v1/reap` каждые 10 минут перезапускает джобы без heartbeat
  (бюджет 2 попытки), дальше помечает `failed` с причиной.
- Стейдж не жжёт общие квоты: `RSB_CRON_DISABLED=1` выключает оба крона проекта.

## 9. Хостинг артефактов и версии

Готовые артефакты получают **постоянные публичные ссылки** в отдельном public-сторе
`rsb-artifacts` (подключён с префиксом env `ARTIFACTS_*`, чтобы не конфликтовать с
`BLOB_STORE_ID` приватного стора джоб):

- страница: `https://<public-store>/art/<jobId>/index.html` — самодостаточный HTML,
  работает как share-ссылка и как iframe-preview; токен доступа — неугадываемый id джобы;
- файлы: `/art/<jobId>/<name>` (pptx/srt/md…) с правильными content-type;
- **версии (lineage)**: кнопка «⤷ Продолжить с этого запуска» создаёт дочернюю джобу с
  `parentJobId`; воркспейс ребёнка сидируется файлами родителя (`seedFiles`, включая
  `index.html` артефакта), а манифест `rsb-artmanifest/<root>` нумерует версии v1, v2, …;
- metadata в джобе: `artifactMeta {root, version, versions, pageUrl, files}` — снапшот
  `job_end` уже несёт её, UI рисует плашку «Постоянная ссылка · vN» и ссылки на файлы;
- `GET /api/v1/artifacts` — свои артефакты; `?root=…` — манифест версии (доступ только
  владельцу любой из версий lineage; анонимные корни видны лишь продолжившему аккаунту).

Локально/в тестах артефакты пишутся в `RSB_ARTIFACT_DIR` с url `fs://…`.

## Чек-лист релиза

```bash
npm run release      # typecheck → build → single-file preview → smoke → backend contract
```

Скрипт собирает артефакты в `release/` (dist + single-file + server), которые можно отдать кому угодно.
