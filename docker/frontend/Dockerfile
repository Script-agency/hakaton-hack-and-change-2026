# ---- Build stage ----
FROM node:24-alpine AS build

# Enable corepack so pnpm auto-resolves to the version locked in package.json
RUN corepack enable

WORKDIR /build

# Copy package manager files first for layer caching
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./

# Install dependencies (corepack uses packageManager field from package.json)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY frontend/ .

# Build the widget
RUN pnpm build

# Extract version info for cache-busting
RUN echo "Build date: $(date -u +%Y-%m-%dT%H:%M:%SZ)" > /build/dist/build-info.txt

# ---- Serve stage ----
FROM nginx:alpine

# Copy nginx config
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /build/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]