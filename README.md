# BookItEasy

MVP для SaaS-платформи автоматизації подобової оренди нерухомості.

## Стек

- Next.js 14+ (App Router)
- React + TypeScript
- Tailwind CSS
- Firebase Auth / Firestore / Storage
- Vercel-ready

## Що вже налаштовано

- Базова структура `app/` з українським UI
- Роутинг для:
  - `/` — головна сторінка
  - `/host/[username]` — персональна сторінка хоста
  - `/dashboard` — кабінет орендодавця
  - `/dashboard/properties` — керування власними об’єктами
  - `/dashboard/calendar` — календар бронювань та блокування дат
  - `/dashboard/finances` — фінанси, доходи та витрати
  - `/admin` — панель супер-адміна
  - `/login` — вхід
  - `/signup` — реєстрація
  - `/logout` — вихід
- Конфігурації `next.config.mjs`, `tailwind.config.ts`, `postcss.config.js`
- Firebase-клієнт у `lib/firebase.ts`
- Auth-логіка та користувацький провайдер у `lib/auth.ts` і `app/providers.tsx`
- Firestore Rules у `firebase.rules`
- Firestore операції для `properties`, `bookings`, `expenses` у `lib/properties.ts`, `lib/bookings.ts`, `lib/expenses.ts`
- `.env.example` з усіма необхідними змінними

## Запуск проекту

1. Скопіюйте `.env.example` у `.env.local` або `.env`.
2. Встановіть залежності:
   ```bash
   npm install
   ```
3. Запустіть локально:
   ```bash
   npm run dev
   ```

### Якщо бачите MIME/404 помилки для `/_next/static/*`

Це зазвичай означає, що браузер запитує старі чанки після падіння/перезапуску `next dev`.

- Використовуйте `npm run dev` як основний режим (без примусової очистки `.next`).
- Якщо залипли старі чанки або був аварійний рестарт, використайте `npm run dev:clean`.
- Після аварійного рестарту зробіть hard reload у браузері (`Ctrl+Shift+R`).

## Адмінський доступ

- Email: `andrii.disha@gmail.com`
- Пароль: `October2020!?`

## Далі

- Додати завантаження фото об’єктів у Firebase Storage
- Реалізувати повний процес бронювання для клієнтів
- Додати аналітику чистого прибутку за місяць/квартал/рік
- Оптимізувати RBAC та доступ до Firestore через `firebase.rules`
- Розгорнути на Vercel
