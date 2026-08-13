# Chat-API fuer sonaris.de
#
# Dreistufig, damit das Laufzeit-Abbild klein bleibt und keine Quellen
# oder Build-Werkzeuge enthaelt. Next laeuft im standalone-Modus, das
# Ergebnis braucht weder node_modules noch die Next-CLI.

# ── 1. Abhaengigkeiten ────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# ── 2. Bau ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# npm run build ruft zuerst scripts/embed-content.cjs auf und schreibt
# content/*.md nach lib/embedded-content.generated.ts. Ohne diesen Schritt
# faellt die API zur Laufzeit auf einen leeren System-Prompt zurueck.
RUN npm run build

# ── 3. Laufzeit ───────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3001

# Der Health-Check fragt die Startseite der App ab (app/page.tsx). Sie
# antwortet mit 200, sobald der Server steht, und kostet kein
# OpenAI-Guthaben. Die Chat-Route selbst eignet sich nicht: sie
# antwortet ohne gueltigen Origin mit 403, was wget als Fehler wertet.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3001/ || exit 1

CMD ["node", "server.js"]
