FROM php:8.2-fpm-alpine AS backend-base

# System dependencies (runtime + build tools for PECL)
RUN apk add --no-cache \
    bash \
    curl \
    git \
    unzip \
    zip \
    libpq-dev \
    icu-dev \
    oniguruma-dev \
    libzip-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    linux-headers \
    $PHPIZE_DEPS

# PHP extensions (no --with-* flags needed in PHP 8.2 — GD auto-detects)
RUN docker-php-ext-configure intl \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_pgsql \
        pgsql \
        mbstring \
        intl \
        gd \
        bcmath \
        zip \
        opcache

# Redis extension from PECL
RUN pecl install redis && docker-php-ext-enable redis

# Clean up build dependencies (keep runtime libs)
RUN apk del $PHPIZE_DEPS linux-headers

# Copy custom php.ini
COPY docker/backend/php.ini "$PHP_INI_DIR/conf.d/custom.ini"

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Working directory
WORKDIR /app

# Copy application files (excludes backend/.env, backend/vendor/ etc. via .dockerignore)
COPY backend/ /app/

# Create minimal .env so phpdotenv doesn't crash on missing file.
# Docker overrides come from docker-compose environment, not this file.
RUN echo '# Placeholder — real values come from docker-compose environment' > /app/.env

# Install dependencies — no-scripts to avoid DB-requiring post-install during build
RUN set -eux; \
    composer install \
        --no-interaction \
        --prefer-dist \
        --optimize-autoloader \
        --no-scripts \
        --working-dir=/app; \
    composer clear-cache

# Run post-install scripts (cookie validation key etc.) — non-fatal if some fail
RUN set -eux; \
    composer run-script post-install-cmd --working-dir=/app || true

# Ensure runtime directories exist with correct permissions
RUN set -eux; \
    mkdir -p /app/runtime /app/web/assets; \
    chown -R www-data:www-data /app/runtime /app/web/assets; \
    chmod -R 775 /app/runtime /app/web/assets

EXPOSE 9000
CMD ["php-fpm"]