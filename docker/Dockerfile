FROM node:24-bookworm-slim AS builder

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json vite.export.config.ts ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim

LABEL org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.source="https://github.com/gordonkit/slideforge"

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright NODE_ENV=production
WORKDIR /app
COPY --from=builder /build/package.json /build/package-lock.json ./
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist
COPY examples ./examples
COPY templates ./templates
COPY LICENSE THIRD_PARTY_NOTICES.md /usr/share/licenses/slideforge/
# Playwright installs the Chromium build pinned by package-lock.json and its system libraries.
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install --no-install-recommends -y fonts-noto-cjk fonts-liberation \
    && npx playwright install --with-deps --only-shell chromium \
    && rm -rf /var/lib/apt/lists/* /root/.npm \
    && ln -s /app/dist/cli/index.js /usr/local/bin/slideforge \
    && chmod 755 /app/dist/cli/index.js

USER node
WORKDIR /work
ENV HOME=/tmp
ENTRYPOINT ["slideforge"]
CMD ["--help"]
