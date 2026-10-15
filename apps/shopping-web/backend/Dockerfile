FROM php:8.3-cli-alpine

RUN docker-php-ext-install pdo_mysql

WORKDIR /app

COPY public ./public

EXPOSE 8080

CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8080} -t public public/index.php"]
