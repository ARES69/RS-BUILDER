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
- Деплой-карта: прод = проект `rs-builder` + git-интеграция (пуш в main = автодеплой,
  алиас `rs-builder-sigma.vercel.app`); стейдж = `rs-builder-app`
  (`rsb-abuse-test.vercel.app`, RSB_CRON_DISABLED=1, деплой CLI); сторы:
  `rsb-jobs` (private, BLOB_STORE_ID), `rsb-artifacts` (public, ARTIFACTS_STORE_ID).
- Тесты: `npm run release` = typecheck+build+preview+smoke+backend+api+orchestrator;
  live-чек search_web флейчит (duckduckgo) — в тесте есть ретрай.
- playwright/chromium и системные либы стираются между песочницами:
  `npm i -D --no-save playwright && npx playwright install chromium && npx playwright install-deps chromium`.
- `.git` может исчезнуть при рестарте песочницы: лечится `git clone` репо и
  переносом `.git` в воркспейс.

## 3. Карта продукта (RS-BUILDER)

- Лендинг/прайсинг/бренд/легал/блог (React+Vite, EN/RU, dark/light), воркспейс `/app`.
- Бэкенд: `server/orchestrator.mjs` (LLM tool-calling цикл: submit_plan/think/
  web_fetch/run_code(vm)/write_file/make_slides(pptx)/make_captions(srt)/
  http_session/deliver_artifact), детерминированный фолбэк `server/core.mjs`.
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
   при resume), тест-секция F, прод-пруф чекпоинта в джобе.

## 6. Открытые нити (порядок по умолчанию)

1. **Биллинг**: Stripe-кредиты по тарифам прайсинга + метринг LLM-запусков
   (нужен Stripe-ключ юзера).
2. **Auth-hardening**: rate-limit на login/signup, сброс пароля (нужен email-провайдер
   или одноразовые коды в истории), OAuth GitHub как апгрейд.
3. Zen-баланс: пополнение юзером → ключ оживёт сам (cooldown 15 мин).
4. Мелочи: кастомный домен rs-builder.app (упоминался в S1), OG/SEO-аудит.

## 7. Ритуалы

- **Конец сессии**: обновить §5/§6 MEMORY.md → коммит (lookastarik@gmail.com) →
  пуш (PAT юзера или попросить) → короткое «что сделано/что дальше».
- **Начало сессии**: boot-промт §0 → читать MEMORY.md → продолжить §6 сверху.
- **После краха сессии**: юзер экспортирует чат (json) + мы читаем MEMORY.md из
  GitHub — восстанавливаемся без потерь (прецедент S1→S2).
