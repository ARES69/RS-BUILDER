# RS-BUILDER

**ИИ-агент, который отдаёт готовый артефакт, а не совет.** Лендинг + прайсинг + бренд-кит + интерактивный воркспейс с симуляцией запуска агента. Один код-бейс, две темы, два языка (EN/RU), ноль внешних ассетов: вся графика нарисована CSS/SVG.

Проект — оригинальная реализация в духе современных лендингов AI-агентов (структура: announcement-бар → hero с композером → возможности → процесс → примеры работ → тарифы с кредитами → FAQ → футер с колонками). **Никакие ассеты, тексты, логотипы или код сторонних продуктов не копировались** — см. `NOTICE.md`.

---

## Production

Живой деплой (Vercel, фронт + бэкенд на одном домене):

- Сайт: **https://rs-builder-sigma.vercel.app**
- Бэкенд: `GET /api/v1/health`, `POST /api/v1/runs` (SSE) — same-origin, без CORS
- Проверка прода: `PROD_URL=https://rs-builder-sigma.vercel.app node scripts/qa-prod.mjs`

## Быстрый старт

```bash
npm install
npm run dev            # http://localhost:5173

npm run build          # прод-сборка в dist/ (с code-splitting)
npm run preview        # локальный прод-сервер собранного dist/

npm run build:preview  # ОДИН самодостаточный HTML → preview/rs-builder.html
                       # (открывается с диска, работает без сети и без сервера)

npm run smoke          # headless-проверка: jsdom грузит приложение,
                       # прогоняет все роуты и живой запуск агента
```

Демо-режим воркспейса работает без API-ключа: сценарии зашиты в `src/data/scenarios.ts`, а любой произвольный промпт получает правдоподобный ad-hoc запуск (`buildAdHocScenario`).

## Что внутри

| Раздел | Где |
|---|---|
| Лендинг: hero с композером и чипсами, живая превью-панель запуска, возможности, процесс, примеры работ, сравнение, интеграции, отзывы, тарифы-тизер, FAQ, CTA | `src/pages/Home.tsx`, `src/components/home/*` |
| Тарифы: переключатель месяц/год, 4 плана, кредиты, Team/Enterprise, безопасность, подробная сравнительная таблица, FAQ | `src/pages/Pricing.tsx`, `src/components/pricing/*` |
| Страницы возможностей `/features/:slug` (9 шт.) с мокапами | `src/pages/Feature.tsx`, `src/data/features.ts` |
| Воркспейс `/app`: тред с рассуждениями и тул-чипами, план с прогрессом и кредитами, вкладки Preview/Browser/Files/Console, скорость 0.5–4×, стоп/сброс | `src/pages/Workspace.tsx`, `src/components/workspace/*`, `src/lib/agentEngine.ts` |
| Бренд-кит `/brand`: логотипы, палитра с копированием hex, типографика, do/don't, скачивание SVG | `src/pages/Brand.tsx` |
| Документы `/legal`: about, careers, changelog, security, terms, privacy | `src/pages/Legal.tsx`, `src/data/legal.ts` |
| Auth `/login`, `/signup` (демо: любые данные ведут в воркспейс) | `src/pages/Auth.tsx` |
| i18n EN/RU с автоопределением и персистом | `src/i18n/*` |
| Темы dark/light/system с персистом и без flash-of-theme | `src/lib/theme.tsx`, инлайн-скрипт в `index.html` |

Артефакты агента — настоящие самодостаточные документы: лендинг кофейни, seed-дек со scroll-snap, отчёт Wide Research и **играбельная аркада на canvas** (`NEON HOP`). Они рендерятся в `<iframe sandbox="allow-scripts">` во вкладке Preview.

## Кастомизация

- **Бренд-токены** (цвета, шрифты, радиусы): `src/index.css` — блоки `:root` и `.dark` + `@theme inline`. Поменяйте переменные — перекрасится всё, включая мокапы и бренд-кит.
- **Контент**: `src/data/home.ts`, `pricing.ts`, `features.ts`, `faq.ts`, `legal.ts`, `site.ts` (навигация/футер/соцсети).
- **Тексты интерфейса**: `src/i18n/en.ts` и `src/i18n/ru.ts` (тип `Dict` гарантирует паритет ключей на этапе компиляции).
- **Сценарии агента**: `src/data/scenarios.ts` — шаги, мысли, тул-вызовы, логи, файлы и HTML-артефакты.
- **Env**: `.env.example` → `.env.local` (`VITE_ROUTER_MODE`, `VITE_AGENT_API_URL`, бренд/почта).

## Деплой

- **Vercel**: `vercel.json` уже лежит в корне (SPA-rewrite настроен).
- **Netlify**: `public/_redirects` отдаёт `/* → /index.html`.
- **Docker/nginx**: `docker build -t rs-builder . && docker run -p 8080:8080 rs-builder` (конфиг `nginx.conf`, кэш `/assets` на год, gzip).
- **Любой статик-хостинг**: соберите `npm run build` и положите `dist/` — нужен SPA-fallback на `/index.html`.
- **Без сервера вообще**: `npm run build:preview` → один файл `preview/rs-builder.html` (hash-роутинг, всё инлайном).

## Проверки

- `npm run smoke` — jsdom поднимает собранный single-file билд, проходит все роуты, запускает сценарий агента до артефакта, переключает язык через реальный UI. Любая console.error / необработанное исключение = провал.
- `npm run qa:shots` — опциональные скриншоты в реальном браузере: `npm i -D playwright && npx playwright install chromium`, затем `npx vite preview` в одном терминале и скрипт в другом. Готовые снимки лежат в `.shots/`.

## Стек

Vite 6 · React 18 · TypeScript (strict) · Tailwind CSS v4 · React Router 6 · Framer Motion · lucide-react.


---

## Живой агентский бэкенд (вместо симулятора)

По умолчанию воркспейс крутит встроенный симулятор (`src/data/scenarios.ts`). Если задан
`VITE_AGENT_API_URL`, приложение стримит запуск с бэкенда по SSE:

```bash
npm run server                                   # zero-deps reference server → :8787
echo 'VITE_AGENT_API_URL=http://localhost:8787' > .env.local
npm run dev                                      # воркспейс покажет бейдж "Live backend"
```

Контракт и формат событий описаны в шапке `server/agent-server.mjs` и в `DEPLOY.md`.
Фронтенд не зависит от реализации: любой оркестратор, стримящий те же события
(`plan → thought/tool/console/file → progress → artifact → delivered → done`),
подключается без правок UI. Отмена запроса рвёт SSE-поток, сервер останавливает генерацию.

Готовые однофайловые сборки в `preview/`:
- `rs-builder.html` — симулятор (работает офлайн);
- `rs-builder-live.html` — собран с `VITE_AGENT_API_URL=http://localhost:8787`:
  поднимите `npm run server`, откройте файл через любой статик-сервер
  (`python3 -m http.server` в папке `preview/`) и получите живой прогон.

Важно: `build:preview` очищает папку `preview/` перед сборкой (стандартное поведение
Vite для outDir), поэтому live-версию собирайте в отдельную папку и кладите рядом:

```bash
VITE_AGENT_API_URL=http://localhost:8787 npx vite build --config vite.config.preview.ts --outDir .preview-live
mv .preview-live/index.html preview/rs-builder-live.html && rm -rf .preview-live
npm run build:preview && mv preview/index.html preview/rs-builder.html   # симулятор последним
```

Проверки бэкенда:
- `npm run test:backend` — standalone сервер: health, последовательность событий, локализация, abort;
- `npm run test:api` — Vercel-функции `api/runs.mjs` и `api/health.mjs` с мок-объектами req/res.

Оба транспорта крутят один движок `server/engine.mjs`: настоящий LLM-оркестратор
(`server/orchestrator.mjs`, tool-calling цикл с реальным выполнением кода и web-fetch)
при наличии ключа провайдера, иначе детерминированное ядро `server/core.mjs`.
Контракт событий одинаковый, поэтому транспорт и UI не зависят от выбора движка.
Подробности и переменные окружения — в `DEPLOY.md`, раздел 6; тест цикла без ключа:
`npm run test:orchestrator`.
Прод на Vercel использует same-origin `/api` (`VITE_AGENT_API_URL=/api`), локальная
разработка — standalone сервер; выкатка одной командой: `npm run deploy:vercel`.

## Бесплатные модели ($0)

Оркестратор умеет работать вообще без затрат — цепочка источников бесплатного инференса
(паттерны из [keman-ai/dsh-opencode-zen](https://github.com/keman-ai/dsh-opencode-zen) и
[12britz/awesome-free-models](https://github.com/12britz/awesome-free-models)):

| # | Провайдер | Как включается | Реальность (октябрь 2026) |
|---|---|---|---|
| 1 | **OpenCode Zen** | `OPENCODE_API_KEY` (или явно `RSB_PROVIDERS=opencode-zen`) | анонимный free-tier закрыт политикой: `403 FreeTierError` («only from within OpenCode»); каталог `/models` по-прежнему публичен и обнаруживается живьём |
| 2 | **OpenRouter `:free`** | `OPENAI_API_KEY` + `OPENAI_MODEL=auto-free` | live-дискавери $0-моделей с tools (кэш 10 мин); лимит бесплатного аккаунта **50 запросов/день** (сброс 00:00 UTC), $10 кредитов → 1000/день |
| 3 | **Groq / Gemini / Mistral / NVIDIA NIM** | своими ключами (`GROQ_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY`, `NVIDIA_API_KEY`) | щедрые бесплатные тиры из списка awesome-free-models |
| 4 | **Anthropic** | `ANTHROPIC_API_KEY` | платный, opt-in |

Устойчивость цепочки: любая ошибка звена (401/402/403/404/429/5xx, таймаут, сеть) —
переход к следующей модели; на 429 с далёким `x-ratelimit-reset` провайдер уходит
в cooldown до сброса квоты; если мертвы все — запуск мягко падает на детерминированное
ядро (продукт никогда не ломается). Модель, которая фактически выполнила запуск,
приходит в SSE-событии `model` и отображается чипом «⚡ provider/model» в воркспейсе.

## Блог

`/blog` и `/blog/:slug` — данные в `src/data/blog.ts` (4 записи, EN/RU, секции, цитата,
автор, мокап-обложка). Анонс-бар и футер ссылаются на запись релиза 2.0. Добавьте свою
запись одним объектом в массив `blogPosts`.

## Релиз одной командой

```bash
npm run release   # typecheck → build → single-file → smoke → backend contract → release/
```

В `release/` ложатся: `dist/`, `rs-builder.html`, `agent-server.mjs`, документы и `VERSION`.
