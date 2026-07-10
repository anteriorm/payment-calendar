# Платёжный календарь

Планирование поступлений и платежей, контроль остатков и кассовых разрывов.

## Быстрый старт

```bash
docker compose up --build
```

Приложение запускается одной командой. Данные сохраняются между перезапусками — закрыли приложение, завтра открыли, всё на месте.

### Что происходит при запуске

При запуске `docker compose up --build` в консоли вы увидите 3 этапа:

**Этап 1: Сборка образов (1-2 минуты)**
Видите строки `#1 ... DONE` — это Docker собирает контейнеры.
Можно не обращать внимания.

**Этап 2: Запуск бэкенда (30-60 секунд)**
```
Installing dependencies from lock file...    ← composer ставит пакеты
Application key set successfully.            ← ключ сгенерирован
Running migrations.                          ← таблицы создаются
Seeding database.                            ← тестовые данные (только первый раз)
Apache ... configured -- resuming ...        ← БЭКЕНД ГОТОВ
```

**Этап 3: Запуск фронтенда (5-10 секунд)**
```
VITE v6.3.5 ready in ... ms                 ← фронтенд готов
```

### Когда можно открывать браузер

Открывайте **http://localhost:5173** ТОЛЬКО когда увидите обе строки:
- `Apache ... configured -- resuming normal operations`
- `VITE ... ready in ... ms`

Если откроете раньше — увидите ошибку "нет связи с сервером".
Подождите 10-20 секунд и обновите страницу.

### Повторный запуск

Если приложение уже запускалось ранее — нажмите "Start" в Docker Desktop или выполните `docker compose up`. Данные сохраняются, миграции применяются автоматически.

### Адреса сервисов

| Сервис | URL |
|--------|-----|
| Фронтенд | http://localhost:5173 |
| Бэкенд (API) | http://localhost:8000 |
| PostgreSQL | localhost:5432 |

> Если видите ошибки в консоли — перезапустите: `docker compose down && docker compose up --build`

## Тестовые аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | admin@truemachine.ru | password |
| Инициатор | initiator@truemachine.ru | password |
| Казначей | treasurer@truemachine.ru | password |
| Руководитель | manager@truemachine.ru | password |

## Удаление тестовых данных

При первом запуске база заполняется тестовыми данными. Чтобы начать работу с чистого листа — удалите все данные кроме пользователей:

```bash
docker compose exec postgres psql -U postgres -d payment_calendar -c "
TRUNCATE payments, incomes, registries, approvals, audit_logs, accounts, counterparties, items RESTART IDENTITY CASCADE;
"
```

Аккаунты пользователей сохраняются, все счета, контрагенты, статьи, платежи и поступления удаляются.

## Стек

- **Бэкенд:** PHP 8.4, Laravel 13
- **Фронтенд:** React 18, Vite, Tailwind CSS 4
- **База данных:** PostgreSQL 16
- **Контейнеризация:** Docker Compose

## Структура проекта

```
├── docker-compose.yml
├── backend/              # Laravel API
│   ├── Dockerfile        # Сборка образа (PHP 8.4 + Apache)
│   ├── entrypoint.sh     # Скрипт запуска (migrate, seed, key)
│   ├── .dockerignore     # Исключения из образа
│   ├── app/              # Модели, контроллеры, сервисы
│   ├── database/         # Миграции и сидеры
│   └── routes/           # API маршруты
└── frontend/             # React SPA
    └── src/
        ├── api/          # API-клиент и моки
        └── app/          # Компоненты и страницы
```

> Переменная `VITE_USE_MOCK=false` задаётся в `docker-compose.yml`, отдельный `.env` файл для фронтенда не нужен.
