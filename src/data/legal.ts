import type { L } from './types'

export type LegalSection = { id: string; title: L; updated: string; blocks: L[]; list?: L[] }

export const legalSections: LegalSection[] = [
  {
    id: 'about',
    title: { en: 'About RS-BUILDER', ru: 'О RS-BUILDER' },
    updated: '2026-10-01',
    blocks: [
      {
        en: 'RS-BUILDER builds autonomous agents that produce finished work rather than advice. The product started as an internal tool for a team that was tired of copying model output into documents, editors and deploy pipelines by hand. The agent got the workspace, the browser and the shell; the human kept the judgment.',
        ru: 'RS-BUILDER делает автономных агентов, которые производят готовую работу, а не советы. Продукт начался как внутренний инструмент команды, уставшей вручную переносить вывод модели в документы, редакторы и пайплайны деплоя. Агент получил воркспейс, браузер и шелл; человек оставил за собой решения.',
      },
      {
        en: 'The team is distributed across Europe, works in the open where possible, and ships on a two-week cadence. Everything in this demo project — copy, design, brand, code — is original work created for this template.',
        ru: 'Команда распределена по Европе, работает открыто, где это возможно, и релизится раз в две недели. Всё в этом демо-проекте — тексты, дизайн, бренд и код — оригинальная работа, созданная для этого шаблона.',
      },
    ],
  },
  {
    id: 'careers',
    title: { en: 'Careers', ru: 'Вакансии' },
    updated: '2026-10-01',
    blocks: [
      {
        en: 'We hire people who ship. Roles below are illustrative placeholders for this template — replace them with your real openings and point the links at your applicant tracker.',
        ru: 'Мы нанимаем тех, кто доводит до релиза. Вакансии ниже — иллюстративные заглушки для этого шаблона: замените их реальными и направьте ссылки в свою систему найма.',
      },
    ],
    list: [
      { en: 'Senior Agent Engineer — remote (EU)', ru: 'Старший инженер агентов — удалённо (ЕС)' },
      { en: 'Product Designer, Workspace — Berlin / remote', ru: 'Продуктовый дизайнер, воркспейс — Берлин / удалённо' },
      { en: 'Developer Advocate — remote', ru: 'Developer Advocate — удалённо' },
      { en: 'Forward Deployed Engineer — remote (EU)', ru: 'Инженер на внедрении — удалённо (ЕС)' },
    ],
  },
  {
    id: 'changelog',
    title: { en: 'Changelog', ru: 'Обновления' },
    updated: '2026-10-10',
    blocks: [
      {
        en: 'Product updates, newest first. Dates and entries below are template content — wire this list to your real release feed.',
        ru: 'Обновления продукта, свежие сверху. Даты и записи ниже — контент шаблона; подключите этот список к вашей ленте релизов.',
      },
    ],
    list: [
      { en: '2.0 — parallel sub-agents, live artifact preview, scheduled runs', ru: '2.0 — параллельные суб-агенты, живое превью артефактов, запуски по расписанию' },
      { en: '1.9 — editable plans mid-run, per-step credit metering', ru: '1.9 — правка плана на лету, учёт кредитов по шагам' },
      { en: '1.8 — video timeline editor and caption styling', ru: '1.8 — редактор видео-таймлайна и стилизация субтитров' },
      { en: '1.7 — browser operator session reuse', ru: '1.7 — переиспользование сессий браузер-оператора' },
      { en: '1.6 — PPTX export with editable charts', ru: '1.6 — экспорт PPTX с редактируемыми графиками' },
    ],
  },
  {
    id: 'security',
    title: { en: 'Security & trust', ru: 'Безопасность и доверие' },
    updated: '2026-09-20',
    blocks: [
      {
        en: 'Task data is encrypted in transit (TLS 1.3) and at rest (AES-256). Agent runs execute in per-task sandboxes that are destroyed on completion. Credentials used by the browser operator are held in the session only and masked in logs, transcripts and artifacts.',
        ru: 'Данные задач шифруются при передаче (TLS 1.3) и хранении (AES-256). Запуски агента выполняются в изолированных песочницах, которые уничтожаются по завершении. Учётные данные, используемые браузер-оператором, живут только в сессии и маскируются в логах, транскриптах и артефактах.',
      },
      {
        en: 'Task inputs and outputs are not used for model training. On Team and Enterprise plans this is guaranteed contractually, with EU data residency, SSO/SAML, SCIM provisioning, audit logs and a 99.9% uptime SLA available.',
        ru: 'Входные и выходные данные задач не используются для обучения моделей. На тарифах Team и Enterprise это закреплено договором; доступны хранение данных в ЕС, SSO/SAML, SCIM, журнал аудита и SLA 99.9%.',
      },
    ],
    list: [
      { en: 'SOC 2 Type II — controls audited annually', ru: 'SOC 2 Type II — ежегодный аудит контролей' },
      { en: 'GDPR — DPA available, EU residency option', ru: 'GDPR — DPA доступно, опция резидентности в ЕС' },
      { en: 'ISO 27001 — in progress, target Q2 2027', ru: 'ISO 27001 — в процессе, цель Q2 2027' },
      { en: 'Sub-processor list published and updated on change', ru: 'Список субподрядчиков опубликован и обновляется при изменениях' },
    ],
  },
  {
    id: 'terms',
    title: { en: 'Terms of service', ru: 'Условия сервиса' },
    updated: '2026-09-01',
    blocks: [
      {
        en: 'These are template terms for a demo project, not legal advice and not a real agreement. Replace this section with terms drafted by your counsel before taking payments or processing customer data.',
        ru: 'Это шаблонные условия для демо-проекта, а не юридическая консультация и не реальное соглашение. Замените этот раздел условиями, подготовленными вашим юристом, до приёма платежей или обработки данных клиентов.',
      },
      {
        en: 'In summary, a real version should cover: account eligibility and acceptable use; the licence granted to run tasks and to use outputs; credit purchase, expiry and refund rules; prohibited use (unlawful content, impersonation, circumvention of rate limits); disclaimers about model accuracy; limitation of liability; termination; and governing law.',
        ru: 'Кратко: реальная версия должна описывать право на аккаунт и допустимое использование; лицензию на запуск задач и использование результатов; правила покупки, сгорания и возврата кредитов; запрещённое использование (незаконный контент, выдача себя за других, обход лимитов); оговорки о точности моделей; ограничение ответственности; расторжение и применимое право.',
      },
    ],
  },
  {
    id: 'privacy',
    title: { en: 'Privacy policy', ru: 'Политика конфиденциальности' },
    updated: '2026-09-01',
    blocks: [
      {
        en: 'Template privacy notice for a demo project. This site stores only two values in your browser localStorage: the selected theme and the selected language. No analytics, advertising or tracking scripts are loaded by this template.',
        ru: 'Шаблонное уведомление о конфиденциальности для демо-проекта. Этот сайт хранит в localStorage браузера только два значения: выбранную тему и выбранный язык. Аналитика, реклама и трекинг-скрипты этим шаблоном не загружаются.',
      },
      {
        en: 'A production version should describe what personal data you collect, the legal basis for processing, retention periods, sub-processors, international transfers, data subject rights and how to contact your DPO.',
        ru: 'Продакшн-версия должна описывать, какие персональные данные вы собираете, правовое основание обработки, сроки хранения, субподрядчиков, трансграничную передачу, права субъектов данных и контакты DPO.',
      },
    ],
  },
]
