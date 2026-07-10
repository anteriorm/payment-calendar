#!/bin/sh
set -e

# composer install если нет vendor
if [ ! -d "vendor" ]; then
  composer install --no-interaction --prefer-dist
fi

# key:generate если APP_KEY пустой
if ! grep -q "APP_KEY=." .env 2>/dev/null; then
  php artisan key:generate --force
fi

# Миграции — всегда
php artisan migrate --force

# Сидеры — только если пользователей нет (первый запуск или пустая БД)
USER_COUNT=$(php artisan tinker --execute="echo App\Models\User::count();" 2>/dev/null || echo "0")
if [ "$USER_COUNT" = "0" ]; then
  php artisan db:seed --force
fi

exec apache2-foreground
