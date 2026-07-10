FROM php:8.4-apache

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Laravel: DocumentRoot = public/
RUN sed -i 's|/var/www/html|/var/www/html/public|g' /etc/apache2/sites-available/000-default.conf \
    && sed -i '/<Directory \/var\/www\/public\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

COPY . .

# Создаём .env если его нет — дефолтные настройки
RUN if [ ! -f .env ]; then \
      echo "APP_NAME=PaymentCalendar" > .env && \
      echo "APP_ENV=local" >> .env && \
      echo "APP_KEY=" >> .env && \
      echo "APP_DEBUG=true" >> .env && \
      echo "APP_URL=http://localhost:8000" >> .env && \
      echo "DB_CONNECTION=pgsql" >> .env && \
      echo "DB_HOST=postgres" >> .env && \
      echo "DB_PORT=5432" >> .env && \
      echo "DB_DATABASE=payment_calendar" >> .env && \
      echo "DB_USERNAME=postgres" >> .env && \
      echo "DB_PASSWORD=postgres" >> .env && \
      echo "FRONTEND_URL=http://localhost:5173" >> .env && \
      echo "SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost,127.0.0.1" >> .env && \
      echo "SESSION_DRIVER=database" >> .env && \
      echo "CACHE_STORE=database" >> .env && \
      echo "QUEUE_CONNECTION=database" >> .env; \
    fi

RUN chmod +x entrypoint.sh

EXPOSE 80

CMD ["./entrypoint.sh"]
