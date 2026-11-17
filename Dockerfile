FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@10.17.0

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

EXPOSE 3001

# Aplica migraciones y levanta la API. El seed NO corre en cada arranque (en producción
# se carga una sola vez a mano: pnpm db:seed con DATABASE_URL apuntando a la base).
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/src/main.js"]
