# Serwer gry: Nakama z modułem Kuźni Legend.
# Budowanie z katalogu głównego repozytorium (moduł korzysta ze wspólnego silnika gry w src/):
#   docker compose build nakama

# 1) Moduł serwera z TypeScriptu do jednego pliku JavaScript
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY src ./src
COPY server ./server
RUN npx tsc --noEmit -p server && node server/build.mjs

# 2) Nakama (wersja przetestowana z tym modułem) + moduł i konfiguracja
FROM heroiclabs/nakama:3.30.0
COPY --from=build /app/server/build/index.js /nakama/data/modules/index.js
COPY server/nakama.yml /nakama/data/kuznia.yml
