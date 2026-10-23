import type { SiteSettings } from '@/lib/types';

export type LegalDocumentType = 'terms' | 'privacy' | 'cookies' | 'refund';

export const DEFAULT_LEGAL_CONTENT: Record<string, string> = {
  terms_en: `Terms of Service

1. Acceptance of Terms
By creating an account or using KaizenAI, you agree to these Terms of Service. If you do not agree, do not use the service.

2. Service Description
KaizenAI provides tools for generating audio, images, video, voice, and related creative content with third-party and in-house AI models.

3. Account Responsibility
You are responsible for your account, login credentials, and all activity that happens under your account. Do not share access with unauthorized users.

4. Lawful Use
You may use the service only for lawful purposes. You must not use KaizenAI to create or distribute illegal, fraudulent, abusive, infringing, hateful, or harmful content.

5. Generated Content
You are responsible for the prompts, uploads, and outputs connected to your account. Make sure you have the rights needed for any material you upload or transform.

6. Credits, Plans, and Billing
Some features require credits or a paid plan. Credits may be deducted when a generation starts or when a task is processed according to the active pricing rules shown in the product.

7. Availability and Changes
We may update, improve, limit, or remove features, models, pricing, or access rules at any time. We do not guarantee uninterrupted availability of every model or feature.

8. Suspension and Termination
We may suspend or terminate access if we reasonably believe you violated these terms, created risk for other users, or used the service in a way that harms the platform.

9. Limitation of Liability
The service is provided on an "as is" and "as available" basis. To the maximum extent permitted by law, KaizenAI is not liable for indirect, incidental, or consequential damages resulting from use of the service.

10. Contact
If you have questions about these terms, contact the service administrator through the contact channels listed on the site.`,
  terms_ru: `Условия использования

1. Принятие условий
Создавая аккаунт или используя KaizenAI, вы соглашаетесь с настоящими условиями. Если вы не согласны, пожалуйста, не используйте сервис.

2. Описание сервиса
KaizenAI предоставляет инструменты для генерации аудио, изображений, видео, голоса и другого креативного контента с помощью сторонних и внутренних ИИ-моделей.

3. Ответственность за аккаунт
Вы несёте ответственность за свой аккаунт, данные для входа и все действия, совершаемые под вашей учётной записью. Не передавайте доступ посторонним лицам.

4. Законное использование
Сервис можно использовать только в законных целях. Запрещено создавать или распространять незаконный, мошеннический, оскорбительный, нарушающий права, опасный или вредоносный контент.

5. Сгенерированный контент
Вы несёте ответственность за промпты, загрузки и результаты генерации, связанные с вашим аккаунтом. У вас должны быть необходимые права на материалы, которые вы загружаете или изменяете.

6. Кредиты, тарифы и списания
Часть функций требует кредиты или платный тариф. Кредиты могут списываться при запуске генерации или в процессе обработки задачи в соответствии с актуальными правилами тарификации в продукте.

7. Доступность и изменения
Мы можем обновлять, улучшать, ограничивать или удалять функции, модели, цены и правила доступа в любое время. Мы не гарантируем постоянную доступность каждой модели или функции.

8. Блокировка и прекращение доступа
Мы можем ограничить или прекратить доступ, если есть разумные основания считать, что вы нарушили условия, создаёте риск для других пользователей или вредите платформе.

9. Ограничение ответственности
Сервис предоставляется по принципу "как есть" и "по мере доступности". В максимально допустимой законом степени KaizenAI не несёт ответственности за косвенные, случайные или последующие убытки, связанные с использованием сервиса.

10. Связь
Если у вас есть вопросы по этим условиям, свяжитесь с администратором сервиса через контактные каналы, указанные на сайте.`,
  privacy_en: `Privacy Policy

1. What We Collect
We collect the information needed to operate the service, including your email address, account data, billing-related records, prompts, uploaded files, generated results, and technical logs.

2. Why We Use Data
We use this data to authenticate users, process generations, provide support, improve stability, prevent abuse, and maintain billing and usage records.

3. Generated Content and Uploads
Files, prompts, and outputs may be stored so you can access your projects, retry tasks, or review previous generations. Internal administrators may access this data only when needed for support, moderation, or technical maintenance.

4. Third-Party Providers
Some generations are processed through external AI providers or infrastructure partners. The data required to fulfill your request may be transmitted to those providers for processing.

5. Cookies
We currently use essential cookies required to keep you signed in and maintain session security. We do not currently rely on a separate analytics or advertising cookie consent flow. If that changes, we will update this policy and request consent where required.

6. Data Retention
We keep account and project data for as long as needed to provide the service, comply with legal obligations, resolve disputes, or enforce platform rules.

7. Data Sharing
We do not sell your personal data. We may share limited information with service providers that help us operate hosting, payments, moderation, support, or infrastructure, only to the extent necessary.

8. Security
We take reasonable technical and organizational steps to protect your data, but no system can guarantee absolute security.

9. Your Rights
Depending on your jurisdiction, you may have rights to access, correct, or request deletion of your personal data. You can contact the administrator regarding such requests.

10. Updates
We may update this Privacy Policy from time to time. Continued use of the service after updates means you accept the revised policy.`,
  privacy_ru: `Политика конфиденциальности

1. Какие данные мы собираем
Мы собираем данные, необходимые для работы сервиса: email, данные аккаунта, сведения о платежах, промпты, загруженные файлы, результаты генераций и технические журналы.

2. Зачем мы используем данные
Эти данные используются для авторизации пользователей, выполнения генераций, поддержки, улучшения стабильности, предотвращения злоупотреблений и ведения учёта оплат и использования сервиса.

3. Загрузки и сгенерированный контент
Файлы, промпты и результаты могут храниться, чтобы вы могли открывать свои проекты, повторять задачи и просматривать прошлые генерации. Администраторы получают доступ к этим данным только при необходимости поддержки, модерации или технического обслуживания.

4. Сторонние провайдеры
Часть генераций может обрабатываться через внешних ИИ-провайдеров или инфраструктурных партнёров. Данные, необходимые для выполнения вашего запроса, могут передаваться таким провайдерам для обработки.

5. Cookie
Сейчас мы используем только обязательные cookie, которые нужны для входа в аккаунт и безопасности сессии. Отдельный баннер согласия для аналитических или рекламных cookie пока не требуется, потому что такие cookie сейчас не используются. Если это изменится, мы обновим политику и добавим согласие там, где это требуется.

6. Срок хранения данных
Мы храним данные аккаунта и проектов столько, сколько необходимо для работы сервиса, выполнения юридических обязанностей, разрешения споров и соблюдения правил платформы.

7. Передача данных
Мы не продаём персональные данные. Мы можем передавать ограниченную информацию подрядчикам, которые помогают с хостингом, платежами, модерацией, поддержкой и инфраструктурой, только в объёме, необходимом для работы сервиса.

8. Безопасность
Мы принимаем разумные технические и организационные меры для защиты данных, однако ни одна система не может гарантировать абсолютную безопасность.

9. Ваши права
В зависимости от вашей юрисдикции у вас могут быть права на доступ, исправление или удаление персональных данных. По таким вопросам можно обратиться к администратору сервиса.

10. Обновления
Мы можем периодически обновлять эту политику конфиденциальности. Продолжение использования сервиса после обновлений означает принятие новой редакции политики.`,
  cookies_en: `Cookies Policy

1. Essential Cookies
We use essential cookies required for authentication, session continuity, security checks, and core account functionality.

2. Why Cookies Are Used
These cookies help keep you signed in, protect your account, prevent abuse, and support secure payment and billing flows.

3. Analytics and Marketing
If analytics, advertising, or remarketing cookies are introduced in the future, this policy will be updated and any required consent flow will be added before those cookies are used.

4. Third-Party Services
Some embedded services, payment providers, or external tools may set their own cookies according to their own policies when you interact with them.

5. Browser Controls
You can control or delete cookies through your browser settings. Disabling essential cookies may limit login, checkout, or account-related functionality.

6. Updates
We may revise this Cookies Policy from time to time. The latest version published on the site is the current one.`,
  cookies_ru: `Политика использования cookie

1. Обязательные cookie
Мы используем обязательные cookie, необходимые для авторизации, работы сессии, проверок безопасности и базовой функциональности аккаунта.

2. Зачем используются cookie
Эти cookie помогают сохранять вход в систему, защищать аккаунт, предотвращать злоупотребления и поддерживать безопасную работу оплаты и биллинга.

3. Аналитика и маркетинг
Если в будущем будут добавлены аналитические, рекламные или маркетинговые cookie, эта политика будет обновлена, а при необходимости будет добавлен механизм согласия до начала их использования.

4. Сторонние сервисы
Некоторые встроенные сервисы, платёжные провайдеры или внешние инструменты могут устанавливать свои cookie в соответствии со своими политиками при взаимодействии с ними.

5. Настройки браузера
Вы можете управлять cookie или удалять их через настройки браузера. Отключение обязательных cookie может ограничить работу входа, оплаты или функций аккаунта.

6. Обновления
Мы можем периодически обновлять эту политику. Актуальной считается последняя версия, опубликованная на сайте.`,
  refund_en: `Refund Policy

1. Digital Service Nature
KaizenAI provides digital services, credit-based usage, and access to third-party AI generation providers. Because processing starts quickly after launch, refund eligibility is limited.

2. Credit Packs
If unused purchased credits were delivered incorrectly because of a billing error, duplicate charge, or technical issue caused by the platform, you may contact support for review.

3. Used Credits and Completed Generations
Credits already spent on completed or successfully processed generations are generally non-refundable.

4. Failed Generations
If a generation fails due to a confirmed platform or provider-side error, the system may automatically restore the charged credits. If that does not happen, contact support with the task ID for manual review.

5. Subscriptions and Recurring Billing
Subscription payments are generally non-refundable for the already started billing period unless required by applicable law or unless a duplicate or incorrect charge occurred.

6. Chargebacks and Abuse
Fraudulent refund requests, abusive chargebacks, or attempts to use the service and then reverse payment may lead to account suspension.

7. Contact
For billing or refund questions, contact the administrator through the support channels listed on the site and include your payment reference or task ID where possible.`,
  refund_ru: `Политика возвратов

1. Цифровой характер сервиса
KaizenAI предоставляет цифровые услуги, кредитную модель использования и доступ к сторонним ИИ-провайдерам. Поскольку обработка обычно начинается сразу после запуска, возможность возврата ограничена.

2. Пакеты кредитов
Если купленные и неиспользованные кредиты были начислены некорректно из-за ошибки биллинга, двойного списания или технической проблемы на стороне платформы, вы можете обратиться в поддержку для проверки.

3. Использованные кредиты и завершённые генерации
Кредиты, уже списанные за успешно обработанные или завершённые генерации, как правило, не возвращаются.

4. Неудачные генерации
Если генерация не удалась из-за подтверждённой ошибки платформы или провайдера, система может автоматически вернуть списанные кредиты. Если этого не произошло, обратитесь в поддержку и укажите ID задачи.

5. Подписки и рекуррентные платежи
Платежи по подписке, как правило, не возвращаются за уже начавшийся расчётный период, если иное не требуется применимым законодательством или если не произошло ошибочное либо двойное списание.

6. Чарджбеки и злоупотребления
Мошеннические запросы на возврат, злоупотребления чарджбеками или попытки использовать сервис, а затем отозвать оплату, могут привести к блокировке аккаунта.

7. Связь
По вопросам оплаты и возвратов свяжитесь с администратором через каналы поддержки, указанные на сайте, и по возможности приложите ссылку на платёж или ID задачи.`,
};

export function getLegalDocumentContent(
  settings: SiteSettings | Record<string, string> | null | undefined,
  locale: string,
  type: LegalDocumentType,
) {
  const normalizedLocale = locale === 'ru' ? 'ru' : 'en';
  const localizedKey = `${type}_${normalizedLocale}`;
  const englishKey = `${type}_en`;

  return (
    settings?.[localizedKey] ||
    settings?.[englishKey] ||
    DEFAULT_LEGAL_CONTENT[localizedKey] ||
    DEFAULT_LEGAL_CONTENT[englishKey]
  );
}

export function getLegalDocumentTitle(locale: string, type: LegalDocumentType) {
  const isRu = locale === 'ru';
  const titles: Record<LegalDocumentType, { ru: string; en: string }> = {
    terms: { ru: 'Условия использования', en: 'Terms of Use' },
    privacy: { ru: 'Политика конфиденциальности', en: 'Privacy' },
    cookies: { ru: 'Политика cookie', en: 'Cookies' },
    refund: { ru: 'Политика возвратов', en: 'Refund Policy' },
  };

  return isRu ? titles[type].ru : titles[type].en;
}

export function getLegalTypeFromSlug(slug: string): LegalDocumentType | null {
  const normalized = String(slug || '').toLowerCase();
  if (normalized === 'terms') return 'terms';
  if (normalized === 'privacy') return 'privacy';
  if (normalized === 'cookies') return 'cookies';
  if (normalized === 'refund') return 'refund';
  return null;
}
