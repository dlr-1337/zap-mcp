FROM node:24.21.0-bookworm-slim@sha256:51b1100cc2a83d370c6a60952e3f2989c8a43159d0e38586e090f3b3326efefd AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY ops/verify-dependencies.mjs ./ops/
COPY .planning/phases/03-consulta-e-arquivos-reais-no-codex/03-DEPENDENCY-REVALIDATION.json ./ops/dependency-audit.json
RUN node ops/verify-dependencies.mjs
RUN npm ci --ignore-scripts --no-audit --no-fund
# Native code is built on this target; no host node_modules enters the image.
RUN npm rebuild better-sqlite3 --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY test ./test
RUN npm run build
RUN node --input-type=module -e "import D from 'better-sqlite3'; const d=new D(':memory:'); d.exec('CREATE VIRTUAL TABLE p USING fts5(t)'); d.close(); await import('./dist/src/main.js'); await import('./dist/src/mcp.js'); if(process.version!=='v24.21.0') throw Error('runtime');"
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:24.21.0-bookworm-slim@sha256:51b1100cc2a83d370c6a60952e3f2989c8a43159d0e38586e090f3b3326efefd
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/src ./dist/src
COPY package.json ./
COPY public ./public
# Git checkouts made with a private umask still need readable code for the app UID.
RUN chmod -R a+rX /app
USER 12001:12001
RUN node --input-type=module -e "import D from 'better-sqlite3'; import { readFileSync } from 'node:fs'; const d=new D(':memory:'); d.exec('CREATE VIRTUAL TABLE p USING fts5(t)'); d.close(); await import('./dist/src/main.js'); readFileSync('./public/index.html');"
EXPOSE 3000
STOPSIGNAL SIGTERM
CMD ["node", "dist/src/main.js", "serve"]
