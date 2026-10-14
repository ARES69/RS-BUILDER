import type { L } from './types'
import type { MockKind } from '@/components/ui/Mockups'

export type BlogSection = { heading: L; paragraphs: L[] }

export type BlogPost = {
  slug: string
  date: string
  readMinutes: number
  tags: L[]
  title: L
  excerpt: L
  author: { name: string; initials: string; role: L }
  mock: MockKind
  sections: BlogSection[]
  pullquote: L
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'introducing-rs-builder-2-0',
    date: '2026-09-28',
    readMinutes: 6,
    tags: [{ en: 'Release', ru: 'Релиз' }],
    title: {
      en: 'Introducing RS-BUILDER 2.0: parallel agents, live preview, scheduled runs',
      ru: 'Представляем RS-BUILDER 2.0: параллельные агенты, живое превью и запуски по расписанию',
    },
    excerpt: {
      en: 'The 1.x agent could finish one task at a time while you watched. The 2.0 agent splits the question, runs a fleet, shows the artifact forming in real time, and comes back on a schedule without being asked.',
      ru: 'Агент 1.x умел заканчивать одну задачу за раз, пока вы смотрите. Агент 2.0 делит вопрос на срезы, гоняет флот, показывает артефакт в реальном времени и возвращается по расписанию сам.',
    },
    author: { name: 'RS-BUILDER Team', initials: 'RB', role: { en: 'Product', ru: 'Продукт' } },
    mock: 'fleet',
    pullquote: {
      en: 'The plan is the interface. Everything else is output.',
      ru: 'План и есть интерфейс. Всё остальное — вывод.',
    },
    sections: [
      {
        heading: { en: 'What changed', ru: 'Что изменилось' },
        paragraphs: [
          {
            en: 'Three capabilities ship together. Wide Research splits one big question into up to forty sub-agent slices that run in parallel and merge into a single sourced report. The preview pane now renders the artifact while the run is still going, so you can redirect it early instead of reviewing a finished thing you did not want. Automations turn any successful run into a recurring job with delivery targets and credit guardrails.',
            ru: 'Три возможности выходят вместе. Wide Research делит большой вопрос на срезы до сорока суб-агентов, которые работают параллельно и сводятся в один отчёт с источниками. Панель превью теперь рендерит артефакт ещё во время запуска — можно развернуть работу рано, а не ревьюить готовое, которое вы не просили. Автоматизации превращают любой удачный запуск в повторяющуюся задачу с каналами доставки и ограничением кредитов.',
          },
          {
            en: 'Underneath, the run model changed too. Steps are now first-class objects with their own estimate, credit cost and evidence trail, which is what makes mid-run editing and per-step metering possible.',
            ru: 'Под капотом изменилась модель запуска. Шаги стали объектами первого класса со своей оценкой, стоимостью в кредитах и цепочкой доказательств — именно это делает возможной правку на лету и поминутный учёт.',
          },
        ],
      },
      {
        heading: { en: 'Why parallel, and why visible', ru: 'Почему параллельно и почему видно' },
        paragraphs: [
          {
            en: 'Sequential research scales linearly with the size of the question, which means the interesting questions were simply too expensive to ask. Parallelism fixes the cost; visibility fixes the trust. A fleet you cannot inspect is a black box with extra steps, so every sub-agent gets its own row: status, sources visited, partial findings.',
            ru: 'Последовательное исследование масштабируется линейно с размером вопроса, то есть интересные вопросы было просто слишком дорого задавать. Параллелизм чинит стоимость; видимость чинит доверие. Флот, который нельзя осмотреть, — это чёрный ящик с лишними шагами, поэтому у каждого суб-агента своя строка: статус, посещённые источники, частичные находки.',
          },
        ],
      },
      {
        heading: { en: 'Rollout', ru: 'Доступность' },
        paragraphs: [
          {
            en: 'Wide Research is on Pro and above, with five sub-agents on Starter so everyone can feel the shape of it. Automations and live preview are on every plan, including free. Scheduled runs on Max and Team are unlimited, capped only by the per-job credit guardrail you set.',
            ru: 'Wide Research доступен с тарифа Pro, при этом на Starter есть пять суб-агентов, чтобы каждый почувствовал форму возможности. Автоматизации и живое превью — на всех тарифах, включая бесплатный. Запуски по расписанию на Max и Team безлимитны и ограничены лишь лимитом кредитов на задачу, который задаёте вы.',
          },
        ],
      },
    ],
  },
  {
    slug: 'the-plan-is-the-interface',
    date: '2026-08-14',
    readMinutes: 5,
    tags: [{ en: 'Design', ru: 'Дизайн' }, { en: 'Research', ru: 'Исследование' }],
    title: {
      en: 'The plan is the interface: why we made the todo list editable mid-run',
      ru: 'План и есть интерфейс: почему список задач редактируется прямо во время запуска',
    },
    excerpt: {
      en: 'Most agent UIs hide the reasoning and show you a spinner. We did the opposite, and the support tickets told us it was the right call.',
      ru: 'Большинство агентских интерфейсов прячут рассуждения и показывают спиннер. Мы сделали наоборот — и тикеты в поддержку подтвердили, что это было верное решение.',
    },
    author: { name: 'P. Adeyemi', initials: 'PA', role: { en: 'Head of Design', ru: 'Руководитель дизайна' } },
    mock: 'browser',
    pullquote: {
      en: 'A spinner asks for faith. A plan asks for a decision.',
      ru: 'Спиннер просит веры. План просит решения.',
    },
    sections: [
      {
        heading: { en: 'The problem with spinners', ru: 'Проблема спиннеров' },
        paragraphs: [
          {
            en: 'When the interface between you and a long-running agent is a spinner, the only control you have is cancellation. People do not want to cancel; they want to correct. In our first usability sessions, eleven of fourteen participants tried to click on the reasoning trace to change it.',
            ru: 'Когда интерфейс между вами и долгим запуском — это спиннер, единственный доступный контроль — отмена. Люди не хотят отменять; они хотят поправить. В первых юзабилити-сессиях одиннадцать из четырнадцати участников пытались кликнуть по трассировке рассуждений, чтобы изменить её.',
          },
        ],
      },
      {
        heading: { en: 'Editable plans changed the conversation', ru: 'Редактируемый план изменил разговор' },
        paragraphs: [
          {
            en: 'Once steps became objects with cost and evidence, we could expose three operations safely: reorder, delete, constrain. Users stopped writing defensive prompts ("and make sure you also…") because the plan itself became the place to say it. Prompt length dropped 34% in the first month after launch.',
            ru: 'Когда шаги стали объектами со стоимостью и доказательствами, мы смогли безопасно дать три операции: поменять порядок, удалить, добавить ограничение. Пользователи перестали писать оборонительные промпты («и обязательно ещё…»), потому что план сам стал местом, где это говорится. Средняя длина промпта упала на 34% за первый месяц после запуска.',
          },
          {
            en: 'The second effect was emotional. Watching a checklist tick forward converts waiting into supervising, and supervising feels like work you chose rather than latency you endure.',
            ru: 'Второй эффект — эмоциональный. Наблюдать, как отметки бегут по чек-листу, — значит превратить ожидание в супервизию, а супервизия ощущается как работа, которую вы выбрали, а не как задержка, которую терпите.',
          },
        ],
      },
      {
        heading: { en: 'What we deliberately did not build', ru: 'Что мы сознательно не стали строить' },
        paragraphs: [
          {
            en: 'No Gantt charts, no dependencies graph, no manual step authoring from scratch. The agent proposes; you adjust. The moment a user has to write the plan themselves, the product has failed at its only job.',
            ru: 'Никаких диаграмм Ганта, графов зависимостей и ручного написания плана с нуля. Агент предлагает — вы правите. В момент, когда пользователь вынужден писать план сам, продукт провалился в своей единственной работе.',
          },
        ],
      },
    ],
  },
  {
    slug: 'credits-explained',
    date: '2026-07-02',
    readMinutes: 4,
    tags: [{ en: 'Pricing', ru: 'Тарифы' }],
    title: {
      en: 'Credits, explained: what you are actually paying for',
      ru: 'Кредиты, объяснённые: за что вы на самом деле платите',
    },
    excerpt: {
      en: 'Seat pricing charges you for presence. Credit pricing charges you for work done. Here is how we set the numbers, and where the meter runs.',
      ru: 'Оплата за места берёт деньги за присутствие. Оплата кредитами — за выполненную работу. Вот как мы выставили цифры и где крутится счётчик.',
    },
    author: { name: 'RS-BUILDER Team', initials: 'RB', role: { en: 'Product', ru: 'Продукт' } },
    mock: 'schedule',
    pullquote: {
      en: 'You should be able to predict the invoice from the run log.',
      ru: 'Счёт должен предсказуемо выводиться из лога запуска.',
    },
    sections: [
      {
        heading: { en: 'One unit, one thing', ru: 'Одна единица — одна вещь' },
        paragraphs: [
          {
            en: 'A credit is a unit of agent compute: model tokens plus sandbox seconds plus browser sessions. We priced it so that a short document task lands around 40 credits, a full landing page around 300–400, and a forty-slice Wide Research run in the low thousands. The run log shows the running total per step, so the invoice is never a surprise.',
            ru: 'Кредит — это единица вычислений агента: токены модели плюс секунды песочницы плюс браузерные сессии. Мы выставили цену так, чтобы короткая задача с документом стоила около 40 кредитов, полноценный лендинг — 300–400, а Wide Research на сорок срезов — несколько тысяч. Лог запуска показывает нарастающий итог по шагам, поэтому счёт никогда не становится сюрпризом.',
          },
        ],
      },
      {
        heading: { en: 'Refresh credits are the free lunch, on purpose', ru: 'Refresh-кредиты — сознательный бесплатный обед' },
        paragraphs: [
          {
            en: 'Every account gets 300 refresh credits a day, on every plan including free. They do not accumulate, and that is deliberate: the point is that the agent is useful today, not that you hoard a balance. Plan credits are the ones that roll with your billing cycle.',
            ru: 'Каждый аккаунт получает 300 refresh-кредитов в день на всех тарифах, включая бесплатный. Они не накапливаются, и это сознательно: смысл в том, что агент полезен сегодня, а не в том, что вы копите баланс. Плановые кредиты — те, что живут в рамках биллингового цикла.',
          },
        ],
      },
      {
        heading: { en: 'Failed runs', ru: 'Неудачные запуски' },
        paragraphs: [
          {
            en: 'If a run cannot finish, the credits for the unfinished portion are returned automatically and the partial artifacts stay available. You pay for work the agent actually did, not for its optimism.',
            ru: 'Если запуск не может завершиться, кредиты за незавершённую часть возвращаются автоматически, а частичные артефакты остаются доступны. Вы платите за работу, которую агент реально сделал, а не за его оптимизм.',
          },
        ],
      },
    ],
  },
  {
    slug: 'how-we-handle-your-logins',
    date: '2026-05-19',
    readMinutes: 5,
    tags: [{ en: 'Security', ru: 'Безопасность' }],
    title: {
      en: 'How the browser operator handles your logins',
      ru: 'Как браузер-оператор работает с вашими логинами',
    },
    excerpt: {
      en: 'An agent that clicks through your portals needs your sessions. Here is exactly where credentials live, what gets masked, and what never leaves your browser.',
      ru: 'Агенту, который кликает по вашим порталам, нужны ваши сессии. Вот где именно живут учётные данные, что маскируется и что никогда не покидает ваш браузер.',
    },
    author: { name: 'D. Sokolov', initials: 'DS', role: { en: 'CEO', ru: 'CEO' } },
    mock: 'browser',
    pullquote: {
      en: 'The transcript is evidence, not a keychain.',
      ru: 'Транскрипт — это доказательство, а не связка ключей.',
    },
    sections: [
      {
        heading: { en: 'Sessions, not passwords', ru: 'Сессии, а не пароли' },
        paragraphs: [
          {
            en: 'You log in once inside a browser session that belongs to your account. The agent drives that session; it never sees the password field value, and credential inputs are masked at the driver layer before anything reaches a log, a transcript or an artifact.',
            ru: 'Вы логинитесь один раз в браузерной сессии, которая принадлежит вашему аккаунту. Агент управляет этой сессией; он никогда не видит значение поля пароля, а ввод учётных данных маскируется на уровне драйвера до того, как что-либо попадёт в лог, транскрипт или артефакт.',
          },
        ],
      },
      {
        heading: { en: 'Evidence without leakage', ru: 'Доказательства без утечек' },
        paragraphs: [
          {
            en: 'Every action is recorded with a screenshot and a DOM snapshot so you can replay it. Before storage, the capture pipeline redacts input values, tokens in URLs and anything matching your deny-list patterns. You audit what the agent did without handing it — or us — a second copy of your secrets.',
            ru: 'Каждое действие записывается со скриншотом и снапшотом DOM, чтобы вы могли воспроизвести его. Перед сохранением пайплайн скриншотов вычищает значения полей, токены в URL и всё, что совпадает с вашими шаблонами запретов. Вы проверяете, что сделал агент, не передавая ему — и нам — вторую копию ваших секретов.',
          },
        ],
      },
      {
        heading: { en: 'Destroyed on completion', ru: 'Уничтожается по завершении' },
        paragraphs: [
          {
            en: 'The sandbox and its session store are destroyed when the run ends. Scheduled runs create a fresh session each time and prompt you to re-authenticate when the session expires — deliberately, because a forever-session is a forever liability.',
            ru: 'Песочница и её хранилище сессий уничтожаются по завершении запуска. Запуски по расписанию каждый раз создают свежую сессию и просят вас повторно авторизоваться, когда сессия истекает, — сознательно, потому что вечная сессия есть вечная ответственность.',
          },
        ],
      },
    ],
  },
]

export const blogBySlug = (slug?: string) => blogPosts.find((p) => p.slug === slug)
