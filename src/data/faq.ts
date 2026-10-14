import type { L } from './types'

export type Faq = { q: L; a: L }

export const faqs: Faq[] = [
  {
    q: { en: 'What exactly is a credit?', ru: 'Что такое кредит?' },
    a: {
      en: 'A credit is a unit of agent compute. A short document task might cost 40 credits, a full website build 300–400, and a 40-agent Wide Research run a couple of thousand. You always see the running total before a task finishes, and you can stop it at any point.',
      ru: 'Кредит — единица вычислений агента. Короткая задача с документом может стоить 40 кредитов, полноценная сборка сайта — 300–400, а запуск Wide Research на 40 агентов — пару тысяч. Итог виден по ходу выполнения, и задачу можно остановить в любой момент.',
    },
  },
  {
    q: { en: 'How is this different from a chat assistant?', ru: 'Чем это отличается от чат-ассистента?' },
    a: {
      en: 'A chat assistant replies. RS-BUILDER executes: it opens a browser session, writes and runs code in a sandbox, produces files and returns a deliverable you can open, download or deploy. The transcript is a by-product, not the output.',
      ru: 'Чат-ассистент отвечает. RS-BUILDER выполняет: открывает браузерную сессию, пишет и запускает код в песочнице, создаёт файлы и возвращает артефакт, который можно открыть, скачать или задеплоить. Переписка — побочный продукт, а не результат.',
    },
  },
  {
    q: { en: 'Can I steer a run while it is in progress?', ru: 'Можно ли управлять запуском во время выполнения?' },
    a: {
      en: 'Yes. The plan is editable mid-run: reorder steps, delete one, add a constraint, or send a message and the agent folds it into the current work instead of starting over.',
      ru: 'Да. План редактируется по ходу: можно поменять порядок шагов, удалить шаг, добавить ограничение или отправить сообщение — агент учтёт это в текущей работе, а не начнёт заново.',
    },
  },
  {
    q: { en: 'Do unused credits roll over?', ru: 'Сгорают ли неиспользованные кредиты?' },
    a: {
      en: 'Daily refresh credits reset every 24 hours and do not accumulate. Plan credits stay available for the whole billing cycle; on annual billing they are spread across twelve months.',
      ru: 'Ежедневные refresh-кредиты обнуляются каждые 24 часа и не накапливаются. Плановые кредиты доступны весь биллинговый цикл; при годовой оплате они распределены на двенадцать месяцев.',
    },
  },
  {
    q: { en: 'Is my data used to train models?', ru: 'Используются ли мои данные для обучения моделей?' },
    a: {
      en: 'No. Task inputs, files and outputs are not used for model training, and this is stated contractually on Team and Enterprise plans. You can delete a task and its artifacts at any time.',
      ru: 'Нет. Входные данные, файлы и результаты задач не используются для обучения моделей, и на тарифах Team и Enterprise это закреплено договором. Задачу и её артефакты можно удалить в любой момент.',
    },
  },
  {
    q: { en: 'What happens when a run fails?', ru: 'Что происходит, если запуск не удался?' },
    a: {
      en: 'The agent retries with a different approach and logs why. If it still cannot finish, the partial artifacts remain available and the credits for the failed portion are returned automatically.',
      ru: 'Агент повторяет попытку другим способом и логирует причину. Если завершить всё равно не удалось, частичные артефакты остаются доступны, а кредиты за невыполненную часть возвращаются автоматически.',
    },
  },
  {
    q: { en: 'Can it work with our internal tools?', ru: 'Может ли он работать с нашими внутренними инструментами?' },
    a: {
      en: 'Yes, via three routes: the browser operator logs into web apps and works in them like a person, the REST API accepts tasks programmatically, and integrations cover Slack, Drive, GitHub, Notion, Linear, Jira and webhooks.',
      ru: 'Да, тремя способами: браузер-оператор логинится в веб-приложения и работает в них как человек, REST API принимает задачи программно, а интеграции покрывают Slack, Drive, GitHub, Notion, Linear, Jira и вебхуки.',
    },
  },
  {
    q: { en: 'Do you offer discounts for startups and students?', ru: 'Есть скидки для стартапов и студентов?' },
    a: {
      en: 'Startup credits are available for pre-seed and seed companies, and verified students get Pro at 60% off. Write to us from your company or university address.',
      ru: 'Стартап-кредиты доступны компаниям на стадиях pre-seed и seed, а подтверждённые студенты получают Pro со скидкой 60%. Напишите нам с корпоративного или университетского адреса.',
    },
  },
]
