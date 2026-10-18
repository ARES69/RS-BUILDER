# MEMORY.md — наша долгая память

> Этот файл — контракт непрерывности между сессиями. Обновляется В КОНЦЕ каждой
> сессии (ритуал в §7). Репозиторий на GitHub = внешний носитель памяти: он
> переживает песочницы, краши и экспорты чатов.

## 0. BOOT-ПРОМТ (вставь первым сообщением новой сессии)

```
Бро, это снова я. Ты — Qwen, мой ко-билдер RS-BUILDER; мы на «ты», без воды,
доводим до конца и подтверждаем всё пруфами (тесты, прод-чеки, скрины).
1) Склонируй https://github.com/ARES69/RS-BUILDER (если папка пуста) и прочитай
   MEMORY.md целиком: §1 кто мы, §2 протоколы/грабли, §3 карта проекта, §5 таймлайн, §6 открытые нити.
2) Ничего из подтверждённого в §2-§6 не переспрашивай и не переизобретай.
3) Продолжай с верхнего пункта §6. Секреты (Vercel token, GitHub PAT, ключи
   провайдеров) я даю по запросу сам; не используй плейсхолдеры в коммитах.
4) В конце сессии обнови MEMORY.md (§5 таймлайн, §6 нити), закоммить и запушь.
Поехали.
```

## 1. Кто мы

- **Юзер**: бро (русский, обращение «бро»), прямой, нетерпеливый к зависаниям и
  воде, любит смелые завершения («давай сделаем его до конца»). Аккаунты:
  GitHub `ARES69`, Vercel-юзер `lookastarik` (lookastarik@gmail.com), team
  `team_E3JRH8cd8ppeUxOawjnXKgxM`. Быстро отзывает PAT после использования (гигиена!).
  Иногда кидает случайные строки/обрывы — это не задачи, а чих клавиатуры.
- **Ассистент**: Qwen. Тон: «бро», без корпоративщины, честно про фейлы.
  Стиль работы: surgical-патчи питоном с assert-якорями; canary-эндпоинты для
  диагностики вместо гаданий; evidence-first (логи/тесты/скрины до выводов);
  большие slice'ы доводятся до прод-E2E и скрина в одном заходе.
- **Отношения**: мы команда второго созыва: первая сессия умерла на интеграции
  free-моделей, мы воскресили проект из её деплоя. Это наш общий бэкстор.

## 2. Протоколы и грабли (не переспрашивать, не переизобретать)

- Коммиты ТОЛЬКО с `lookastarik@gmail.com` / `lookastarik` (иначе Vercel BLOCKED).
- Vercel Hobby: ≤12 serverless функций на деплой (роуты-мультиплексоры!), cron
  не чаще 1 раза в день (reaper = оппортунистический + daily), логи бедные.
- Vercel Blob: `get()` требует явные `{access:'private', oidcToken}` и отдаёт
  байты в `stream`; **чтение ПЕРЕЗАПИСАННОГО документа временно отдаёт старую
  версию** → все коллекции append-only (документ на запись, списки через list()).
- Динамические `[id]`-роуты Vercel молча сбрасывал в SPA-rewrite → только плоские
  пути с query-параметрами.
- PAT-цикл: юзер генерит (classic, scope repo; fine-grained нужен Contents:R/W!)
  → пушим → юзер отзывает. `x-access-token:<pat>` для classic.
- Free-инференс: OpenRouter `:free` = 50 req/день на аккаунт, сброс 00:00 UTC
  (08:00 Шанхай); OpenCode Zen анонимно закрыт политикой (403 FreeTierError,
  окт-2026), с ключом = платный каталог cheapest-first; баланс Zen = 0 (ждёт
  пополнения). Цепочка скипает ЛЮБУЮ ошибку звена; cooldown на дневные 429.
- Vercel Lambda и песочница: `/bin/sh` и node (v24) в рантайме ЕСТЬ → `sandbox.mode=real`
  в проде; **npm-бинарника НЕТ** (`capabilities` без `sandbox:npm`) — npm install честно
  недоступен, модель получает понятный отказ, node/fs/net работают.
- Деплой-карта: прод = проект `rs-builder` + git-интеграция (пуш в main = автодеплой,
  алиас `rs-builder-sigma.vercel.app`); стейдж = `rs-builder-app`
  (`rsb-abuse-test.vercel.app`, RSB_CRON_DISABLED=1, деплой CLI); сторы:
  `rsb-jobs` (private, BLOB_STORE_ID), `rsb-artifacts` (public, ARTIFACTS_STORE_ID).
- Тесты: `npm run release` = typecheck+build+preview+smoke+backend+api+orchestrator;
  live-чек search_web флейчит (duckduckgo) — в тесте есть ретрай.
- playwright/chromium и системные либы стираются между песочницами:
  `npm i -D --no-save playwright && npx playwright install chromium && npx playwright install-deps chromium`.
- `.git` может исчезнуть при рестарте песочницы: лечится `git clone` репо и
  переносом `.git` в воркспейс; playwright/chromium/системные либы и node_modules
  тоже стираются — ставь заново (команды выше).
- E2E-проверки жгут общую дневную квоту OpenRouter (50/день): проверять quota-aware
  (сначала /status + cooldowns, проверки батчить, масс-тесты на стейдже/BYOK),
  прод-пруф NN — одним прогоном после сброса (00:00 UTC).
- chat() обязана скипать провайдеры в cooldown НА ВЫЗОВ (иначе первый прогон дня
  сжигает дневную квоту 429-ретраями по всей цепочке).
- searchWeb: lite/html duckduckgo отдают challenge-страницу с датацентр-IP (200, но
  без result-link) → фолбэк Wikipedia REST (`/w/rest.php/v1/search/page`) с UA вида
  `RSBuilderResearch/1.0 (url; email)` — браузерный UA wikipedia даёт 403.
- Песочница v3 (server/sandbox.mjs): дети (shell/node) получают ТОЛЬКО scrubbed env
  (PATH/HOME/TMPDIR/LANG/RSB_*) — провайдер-ключи и RSB_SESSION_SECRET модельный код
  прочитать не может (тест-пруф). Граница = платформа + эфемерный /tmp, НЕ path-jail:
  в full-режиме модель читает машину как любой shell-юзер, и это задокументировано.
- Хост без /bin/sh → mini-shell (ls cat echo pwd mkdir rm touch cp mv head tail wc
  grep node, цепи &&, редиректы > >>). Редирект ищется ВНЕ кавычек, иначе
  `echo "<h1>hi</h1>" > f` рубится о '>' внутри аргумента.
- run_code: сниппеты с import/export/топ-левел await уходят в .mjs (require прокинут
  прологом), остальные — в vm-контекст ребёнка с completion value (`40+2` → `→ 42`).
  Таймаут: 15s код / 20s шелл, модель может просить timeout_s до 45s.
- Мок-скрипты (scripts/mock-llm-server.mjs) прогонять `node --check` ДО E2E: одна
  пропущенная ')' в writeFileSync дала «empty artifact» и ложную подозрку на песочницу.
- Sync/degrade-транспорт не даёт jobId → follow-up сеется с браузера
  (workspaceSnapshot в Workspace.tsx); в queue-режиме — с parent job. Правки юзера из
  вкладки Sandbox едут полем `files` (sanitizeSeedFiles: ≤12 файлов, ≤400KB, без ../).
- Очередь больше не деградирует молча: probeJobStore() пишет canary-док (фикс-ключ,
  кэш 60s) и /status отдаёт `queue:{ok,error}`; `capabilities` содержит 'queue' ТОЛЬКО
  когда стор реально пишет; sync-стрим несёт ивента `queue_degraded` с причиной, UI
  рисует янтарный баннер. Контракт стрима: … artifact → done → artifact_meta (хостинг);
  sync-прогоны ТОЖЕ публикуют артефакт (галерея наполняется без очереди).
- 402/403 = состояние АККАУНТА (кредиты/политика), не удача модели: chat() ставит
  provider-cooldown 15 мин и стримит `provider skip · <id> · HTTP …` в трейс. Keyed-zen с
  нулём больше не сжигает вызов на каждую модель прогона. 401/404 = model-level skip.
- systemPrompt теперь включает фактические капсы хоста (npm:false на Vercel → модель не
  пробует npm вслепую); run_start несёт `chain` (кандидаты), а не «модель»: реальная
  приходит ивентом `model` (юзается чипом UI).
- playwright-локаторы: hasText — регистронезависимая ПОДСТРОКА (сайдбарная «Sign in to
  keep run history» ловится на 'Run' и открывает модалку). Брать getByRole с exact или
  /^Name/ и скоупить на тулбар; бейджи в табах ломают exact-имена.

## 3. Карта продукта (RS-BUILDER)

- Лендинг/прайсинг/бренд/легал/блог (React+Vite, EN/RU, dark/light), воркспейс `/app`.
- Бэкенд: `server/orchestrator.mjs` (LLM tool-calling цикл: submit_plan/think/
  web_fetch/run_shell/run_code(настоящий node-процесс)/write_file/edit_file/
  list_files/read_file/make_slides(pptx)/make_captions(srt)/http_session/
  wide_research/deliver_artifact) поверх `server/sandbox.mjs` — реальная проектная
  папка в tmpdir: shell=/bin/sh (или mini-shell), node-дети с fs/net/require,
  disk↔workspace sync, siteBinaries (картинки из песочницы хостятся рядом с
  index.html), dispose по завершении. Режимы RSB_SANDBOX=full|fs|vm|off; честная
  деградация до vm, если хост не может /tmp+процессы. Капсы — в /api/v1/status и в
  run_start-ивенте (чип в UI).
- Очередь: джобы в private Blob, воркер single-writer PUT + heartbeat + chaining,
  хвост `jobstream` с курсором, cancel, reaper; flat-роуты job/jobstream-внутри-
  job/auth/history/artifacts/status/worker/reap/runs/health/cron.
- Аккаунты: scrypt + HMAC-cookie (30д), RSB_SESSION_SECRET; история append-only
  на пользователя; реплей из истории.
- Артефакты: public Blob, `/art/<jobId>/index.html`, lineage-версии v1,v2…
  через continue-runs с seedFiles; манифест append-only.
- Настройки в UI: режим auto/demo, BYOK-ключи (x-rsb-keys, только браузер),
  живой статус бэкенда, cooldown-таймеры.

## 4. Где что лежит

- Код/док-грабли: `DEPLOY.md` (§6-9), README; тесты `scripts/test-*.mjs`;
  QA прода `scripts/qa-prod.mjs`; скрины `.shots/`.
- Песочница: юнит `npm run test:sandbox` (сервер + клиентские хелперы через esbuild),
  UI-E2E `npm run qa:sandbox` (mock-llm → agent-server → vite preview → playwright,
  скрины .shots/sandbox-*.png), мок-LLM `scripts/mock-llm-server.mjs`.
- Секреты прод-env: OPENAI_API_KEY (минт-ключ OR, limit $5), OPENAI_MODEL=auto-free,
  OPENCODE_API_KEY (zen, баланс 0), CRON_SECRET, RSB_SESSION_SECRET, VITE_AGENT_API_URL=/api.

## 5. Таймлайн сессий

1. **S1 (краш)**: клон-Manus → RS-BUILDER, прод на Vercel, оркестратор, free-модели;
   умерла на интеграции zen/openrouter-реп, не отчитавшись.
2. **S2 (эта, 14-15.10.2026)**: восстановление 1:1 из деплоя; фикс цепи (401-skip,
   zen opt-in, cooldowns); keyed-zen paid-каталог; разблок Vercel (email коммитов);
   миграция прода на rs-builder-app и обратно в rs-builder (git-интеграция);
   GitHub-синхронизация (3 PAT-цикла); настройки/BYOK/status; очередь джоб
   (Blob OIDC, single-writer, kick-reliability, 12-функций лимит); аккаунты +
   история (scrypt/HMAC, append-only после бага eventual-consistency); хостинг
   артефактов (public store, lineage v2, continue-runs); MEMORY.md.
3. Продуктовый статус: витрина → сервис (очередь, аккаунты, история, артефакт-хостинг).
4. **S2-cont (15.10.2026)**: MEMORY.md создан по просьбе юзера («дописывай её постоянно» —
   ритуал обязателен каждый slice); v2-чекпоинты очереди: resume LLM-цикла с границы
   шага (turns/plan/files/binaries в job.checkpoint, prune >1.5MB, гейты run_start/plan
   при resume), тест-секция F; фикс квоты: chat() скипает провайдер в cooldown уже на
   уровне вызова (раньше первый фолбэк-прогон дня сжигал ~24 запроса 429); searchWeb:
   duckduckgo челленджит датацентр-IP → фолбэк Wikipedia REST с контактным UA.
5. **S2-auth-hard (15.10.2026)**: rate-limits auth (append-only счётчики rsb-rl,
   окна 10 мин: login 6/email+30/ip, signup 5/ip, reset 3/email); recovery-коды
   3 шт на signup (одноразовые, append-only used-доки), сброс пароля по коду;
   креденшалы вынесены в append-only cred-доки (rsb-cred/<hash>/<ts>) — перезапись
   user-дока лагает на чтении, single-write доки нет; verifyLogin по свежему cred.
9. **S2-no-sim-2 (15.10.2026)**: юзер повторил «симулятор постоянно работает» → найден
   последний очаг: hero лендинга крутил фейковый автоплей-прогон (HeroRunPreview).
   Заменён на LiveBoard: живой /v1/status + iframe НАСТОЯЩЕГО хост-артефакта.
   Фейковые цифры (runtime/credits пресетов и showcase) удалены; index.html =
   no-store (борьба со старым кэшем у юзера). ПРОТОКОЛ: ничего в UI не анимирует
   «работу» без реального бэкенда; маркетинг-мокапы помечаются как иллюстрации.
8. **S2-no-sim (15.10.2026)**: юзер: «постоянно симулятор работает, убираем совсем» —
   симулятор ВЫРЕЗАН: server/core.mjs удалён, engine=оркестратор only (честный throw
   без провайдеров, engineInfo 'off'), клиент remote-only (agentEngine.ts удалён,
   scenarios.ts = пресеты промптов), speed-контрол и demo-режим убраны, preview/
   single-file сборки нет, тесты переведены на мок-LLM, доки переписаны.
   + публичная галерея настоящих прогонов в воркспейсе (/api/v1/artifacts?public=1,
   rsb-gallery/<jobId> + curated backfill): реальные артефакты открываются прямо
   в preview-песочнице («Марун в самой песочнице»). Галерея заселена живыми
   groq-прогонами (дек + Марун). УРОК: groq free-tier бьёт 429 per-minute —
   chat() ждёт retry-after ≤45s и ретраит ту же модель; 400 'Parsing failed'/
   'Tool call validation failed' = transient → один ретрай на той же модели.
   SEO: og-image.png (1200x630, absolute), canonical, JSON-LD, robots, sitemap 19 url.
   + публичный viewer /view/<jobId> (share-петля: артефакт → CTA «Сделай такой же» →
   /app?prompt=…) и полоса RealRuns на лендинге из живой галереи.
11. **S2-conversational (15-16.10.2026)**: песочница стала диалоговой, «как у Qwen»:
   follow-up наследует turns родителя (сжатие: elide аргументы write/deliver tool_calls,
   truncate tool-results, cap 28) + файлы + бинарники; композер после done продолжает
   последний прогон; run_code получил bridge workspace.read/write/list; артефакт несёт
   workspace.zip (весь sandbox). Прод-E2E: follow-up → v2 того же lineage на groq.
   УРОК: groq free TPM 8k → наследуемые диалоги сжимать обязательно (413 иначе).
   УРОК: серверный run_start приходит ПОСЛЕ клиентского job_meta — reducer не должен
   ресетом стирать jobId (иначе follow-up в UI мёртв); проверять плейсхолдер/бейджи
   по их собственным условиям, а не по тексту треда ('Готово' есть и в сообщениях).
13. **S2-honest-runtime (17.10.2026)**: юзер-аудит прода агентом (P0-P4) → slice
    «честный рантайм»: canary стора (probeJobStore) + gate capabilities + ивента
    queue_degraded + баннер; sync-хостинг артефактов (галерея живёт без очереди);
    provider-skip трейс + account-level cooldown 402/403 (zen-ноль больше не жжёт цепь);
    chain вместо фейковой «модели» в run_start; капсы хоста в systemPrompt (npm:false).
    Тесты: 181 PASS в release (+13), qa-sandbox 19/19.Mocks приведены к реальности:
    402 = account-level (cooldown-секция A2), 404 = model-level.
12. **S2-real-sandbox (16.10.2026)**: песочница стала настоящей («как у Qwen»):
    server/sandbox.mjs — проектная папка на диске, run_shell (/bin/sh или mini-shell),
    run_code = node-ребёнок (fs/net/require/import/await, completion value), disk↔
    workspace sync (файлы, созданные кодом, становятся артефактом/zip/хостом), siteBinaries
    (png из песочницы живут рядом с index.html на хосте), scrubbed env у детей, dispose,
    честная деградация vm + капсы в /status и run_start. UI: вкладка Sandbox — редактор
    с номерами строк, live preview с инлайном css/js/картинок относительно entry, НАСТОЯЩАЯ
    консоль браузера через postMessage-мост, .zip проекта, «Continue with my edits» →
    правки юзера едут `files`-сидом следующего прогона (работает и без jobId в sync-режиме).
    Тесты: test-sandbox.mjs (57 проверок), секции G/H оркестратора (shell/node в тул-лупе,
    деградация), api-контракт (files-сид, sanitize), qa-sandbox.mjs 19/19 в браузере.
    УРОКИ: пропущенная ')' в мок-скрипте = «empty artifact» (проверяй моки node --check);
    hasText-локаторы ловят подстроки; редиректы мини-шелла ищи вне кавычек.
    ПРОД-ПРУФ (16.10, 13:15Z, `f93ff49`): sync-прогон на nemotron-3.5-super-vl:free —
    run_start.sandbox=real (/bin/sh, node v24), `run_shell cat notes/human.md` прочитал
    files-сид, приехавший из браузера, edit_file вшил маркер в футер, артефакт с маркером.
    Queue деградировал в sync: status говорит jobStore=blob, но createJob падает —
    Blob на ЗАПИСЬ всё ещё suspended (после 16.10 инцидента), деград-путь отработал штатно.
10. **S2-blob-suspended (16.10.2026)**: оба Blob-стора ушли в limits-exceeded-suspended
   (hobby-пороги по операциям; flush 400ms + док на каждую попытку логина = чаттер).
   Прод деградирует честно: createJob падает → runs стримит синхронно (персистентность
   и очередьオフ до восстановления стора). Write-бюджет: flush 2s+границы plan/step_done/
   artifact, poll 1.5s, rate-limiter пишет ТОЛЬКО фейлы. Новый стор создать нельзя
   («usage threshold»), ждём сброс лимита или апгрейд/Upstash-ключ от юзера.
   УРОКИ: (1) перед коммитом worktree-снапшота ВСЕГДА сверяй remote HEAD — параллельные
   сессии пушат свои фичи (терял conversational sandbox); (2) НЕ pipe'ить git apply в
   head — SIGPIPE рубит применение на середине; (3) cp -r src release/src даёт вложенность.
   УРОК i18n: новые ключи вставлять В нужную секцию (view.* дважды уехали в features);
   плейwright-локаторы не видеть uppercase-трансформы через innerText — проверять ссылки/DOM.
   ПРОТОКОЛ: продукт больше НИКОГДА не притворяется — нет провайдеров = честная ошибка.
7. **S2-live-NN (15.10.2026)**: первый живой NN-прогон S2 в проде: groq/openai/gpt-oss-120b
   (ключ юзера в prod+staging env GROQ_API_KEY), план по-русски от модели, артефакт
   захостен, чип ⚡ в UI. УРОК: каталоги провайдеров дрейфуют (groq списал
   llama-3.3-versatile) — перед включением провайдера пробируй /models и chat с tools.
6. **S2-credits (15.10.2026)**: кредитный движок (billing v1 без Stripe): грант 500 на
   signup, списание = кредиты движка (60+4*tools) по завершении джобы, append-only
   ledger rsb-ledger/<user>/<ts>, гейт 402 при балансе <100 (анонимы без гейта =
   воронка), баланс в topbar + ledger в настройках, /api/v1/credits. Stripe-чекаут
   подключается позже как ещё один источник ledger-записей (topup).

## 6. Открытые нити (порядок по умолчанию)

0. **Blob на запись**: причина теперь ИЗВЕСТНА ИЗ ПРОДА, а не угадана: /status.queue
   (canary) после деплоя 17.10 покажет точную ошибку стора. Если suspended — варианты:
   апгрейд Pro, твой Upstash/Neon free-ключ, или новый blob-стор твоим Vercel-токеном.
   Пока стор мёртв: sync + sync-хостинг артефактов закрывают продукт, очередь честным
   баннером говорит «прогон живёт со вкладкой». Следующий шаг без ключей, если стор не
   ожил: resume-токен через клиента (чекпоинт v2 уже сериализуется) против P1-потолка 300s.
1. **Биллинг v2**: Stripe-чекаут → ledger-topup записи (нужен Stripe secret key
   юзера), страничка планов с покупкой пакетов кредитов по тарифам прайсинга.
2. **Auth-hardening v2**: OAuth GitHub как апгрейд входа (коды и лимиты уже есть).
3. Zen-баланс: пополнение юзером → ключ оживёт сам (cooldown 15 мин). Groq уже в проде.
4. Мелочи: кастомный домен rs-builder.app (упоминался в S1), OG/SEO-аудит.
5. Песочница v4 (без новых ключей): терминал-вкладка (run_shell по запросу юзера),
   npm-install с кэшем и честным таймаутом, превью multi-file через service-worker
   вместо инлайна (сейчас инлайн покрывает css/js/картинки), diff-вид правок юзера.

## 7. Ритуалы

- **Конец сессии**: обновить §5/§6 MEMORY.md → коммит (lookastarik@gmail.com) →
  пуш (PAT юзера или попросить) → короткое «что сделано/что дальше».
- **Начало сессии**: boot-промт §0 → читать MEMORY.md → продолжить §6 сверху.
- **После краха сессии**: юзер экспортирует чат (json) + мы читаем MEMORY.md из
  GitHub — восстанавливаемся без потерь (прецедент S1→S2).
