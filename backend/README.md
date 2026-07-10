# Платёжный календарь — Backend

Laravel-бэкенд для платёжного календаря. Обеспечивает REST API для фронтенда, управление данными, аутентификацию и бизнес-логику.

## Запуск

```bash
docker compose up -d backend
```

Контейнер сам поставит зависимости через composer, создаст `.env` из `.env.example`, сгенерирует `APP_KEY`, прогонит миграции и поднимет сервер на http://localhost:8000. Повторный запуск идемпотентен — шаги пропускаются, если уже выполнены.

API доступен по адресу `http://localhost:8000/api`.

## Запуск локально (без Docker)

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

В `.env` настроить подключение к PostgreSQL:

```
DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=payment_calendar
DB_USERNAME=postgres
DB_PASSWORD=postgres
```

## Тесты

```bash
docker exec -w /var/www/html payment_backend php artisan test
```

Используется sqlite в памяти (настроено в `phpunit.xml`), реальная база для разработки не трогается.

## Интеграция с фронтендом

CORS настроен в `config/cors.php`. Фронтенд на порту `5173` может обращаться к `http://localhost:8000/api` без дополнительной настройки.

Аутентификация через Laravel Sanctum (Bearer token). При логине (`POST /api/login`) сервер возвращает `token` — он нужен в заголовке `Authorization: Bearer <token>` для всех остальных запросов.

## Памятка: что может пользователь

В системе четыре роли, каждая видит и может делать своё.

**Инициатор** — роль по умолчанию:
- создаёт заявки на платёж и плановые поступления;
- просматривает календарь, заявки, поступления, справочники;
- не может согласовывать, формировать реестр или управлять справочниками.

**Казначей**:
- всё то же, что инициатор, плюс:
- ведёт календарь, переносит платежи на другие даты;
- формирует реестр из согласованных заявок;
- отмечает заявки как оплаченные;
- выгружает реестр и отчёты в файл.

**Руководитель**:
- согласовывает или отклоняет заявки с комментарием;
- утверждает реестр;
- просматривает отчёты по ликвидности.

**Администратор**:
- всё то же, что казначей и руководитель, плюс;
- управляет справочниками: счета, контрагенты, статьи, валюты, пользователи;
- просматривает журнал аудита.

## API эндпоинты

### Авторизация

- `POST /api/login` — вход, возвращает `{token, user}`;
- `POST /api/logout` — выход, удаляет токен;
- `GET /api/me` — текущий пользователь.

### Справочники (CRUD)

- `GET/POST /api/accounts` — счета и кассы;
- `GET/POST /api/counterparties` — контрагенты;
- `GET/POST /api/items` — статьи движения;
- `GET/POST /api/users` — пользователи (только администратор).

### Заявки на платёж

- `GET /api/payments` — список (фильтры: status, account_id, counterparty_id, date_from, date_to);
- `POST /api/payments` — создание (amount, planned_date, account_id, counterparty_id, item_id, priority);
- `PUT /api/payments/{id}` — изменение (только черновики);
- `DELETE /api/payments/{id}` — удаление (только черновики);
- `POST /api/payments/{id}/submit` — отправить на согласование;
- `POST /api/payments/{id}/approve` — согласовать (руководитель, администратор);
- `POST /api/payments/{id}/reject` — отклонить (руководитель, администратор);
- `POST /api/payments/{id}/move` — перенести дату.

### Поступления

- `GET /api/incomes` — список;
- `POST /api/incomes` — создание;
- `PUT /api/incomes/{id}` — изменение;
- `DELETE /api/incomes/{id}` — удаление;
- `POST /api/incomes/{id}/confirmed` — подтвердить;
- `POST /api/incomes/{id}/received` — отметить полученным.

### Календарь

- `GET /api/calendar?start_date=...&end_date=...&account_id=...` — данные по дням с остатками.

### Реестры

- `GET /api/registries` — список;
- `POST /api/registries` — создание (registry_date, payment_ids);
- `GET /api/registries/{id}` — детали;
- `POST /api/registries/{id}/pay` — оплатить;
- `GET /api/registries/{id}/export` — экспорт в CSV.

### Отчёты

- `GET /api/reports/balances` — остатки по счетам;
- `GET /api/reports/cash-gaps` — кассовые разрывы;
- `GET /api/reports/plan-fact` — план и факт.

### Аудит

- `GET /api/audit` — журнал действий (только администратор).

## Модель данных

| Таблица | Описание | Ключевые поля |
|---|---|---|
| `users` | Пользователи | name, email, password, role |
| `accounts` | Счета | name, type (bank/cash), currency, initial_balance |
| `counterparties` | Контрагенты | name, inn, details |
| `items` | Статьи движения | name, type (income/payment) |
| `payments` | Заявки | amount, planned_date, account_id, counterparty_id, item_id, priority, status |
| `incomes` | Поступления | amount, planned_date, account_id, counterparty_id, item_id, status |
| `registries` | Реестры | registry_date, status, created_by, approved_by |
| `approvals` | Согласования | payment_id, user_id, decision, comment |
| `audit_logs` | Аудит | user_id, action, entity, details |

## Статусы

**Заявки:** `draft` → `pending` → `approved` → `in_registry` → `paid` (ветвление: `pending` → `rejected`)

**Поступления:** `planned` → `confirmed` → `received`

**Реестры:** `created` → `paid` → `canceled`

## Хранение денег

Все суммы хранятся в копейках (целое число). Фронтенд конвертирует в рубли только при отображении. При отправке на бэкенд — обратно в копейки.

## Команды artisan

```bash
php artisan migrate          # Выполнить миграции
php artisan migrate:fresh    # Пересоздать базу
php artisan db:seed          # Заполнить начальными данными
php artisan serve            # Запустить dev-сервер
php artisan key:generate     # Сгенерировать APP_KEY
php artisan test             # Запустить тесты
```
