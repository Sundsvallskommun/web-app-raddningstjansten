# web-app-raddningstjansten

POC för en webbtjänst för Räddningstjänsten. Mono-repo med en **Express.js BFF**
(`backend/`) och en **React-frontend** (`frontend/`, Vite – inte Next.js).

Tjänsten har två ingångar:

| Ingång        | URL              | Inloggning (mockad i POC)        |
| ------------- | ---------------- | -------------------------------- |
| Medborgare    | `/`              | BankID (mock, format-kompatibel) |
| Administratör | `/admin`         | Entra-ID / AD (mock)             |

Efter inloggning visas en dashboard som hämtar data om den inloggade från
**Citizen 3.0** via WSO2 (test-miljö). Personnummer maskas alltid i BFF:n innan
det når frontend.

## Arkitektur

```
Browser ──▶ frontend (Vite/React, nginx)
                │  /api/*  (proxy)
                ▼
            backend (Express BFF) ──▶ WSO2 ──▶ Citizen 3.0
                │  client-credentials token (cachat i minne)
```

BFF-mönstret (api-service, token-hämtning, routing-controllers) är hämtat från
`web-app-dispatch-portal`.

## Kom igång lokalt

### Backend

```bash
cd backend
yarn
cp .env.example.local .env.development.local   # fyll i CLIENT_KEY/SECRET + person-id
yarn dev                                        # http://localhost:3001
```

Smoke-test: `GET http://localhost:3001/api/health` → `200`.

### Frontend

```bash
cd frontend
yarn
cp .env-example .env
yarn dev                                         # http://localhost:3000
```

Vite proxar `/api` → `http://localhost:3001` i dev.

### Med Docker (lokalt)

```bash
cp .env.example .env        # rot-vars (CLIENT_KEY/SECRET, person-id m.m.)
docker compose up --build
```

## Deploy (Dokploy)

`frontend/` och `backend/` har var sin `Dockerfile` och skapas som separata
services i Dokploy. Backend exponerar port `3000` i containern; frontend
serveras av nginx (port `80`) och proxar `/api` vidare till backend-servicen.

## Status / avgränsningar (steg 1: grundplåt)

- Mockad BankID- och Entra-inloggning – förberedd för skarp migrering.
- Skarp Citizen 3.0-integration (personId ur `.env`).
- MUI som komponentbibliotek tills vidare; byts senare mot Sundsvalls Kommuns
  Shared Components.
- Ingen DB, Redis, SAML eller CI/CD ännu.

Se planen i `C:\Users\SUKMTobNor\.claude\plans\staged-skipping-candy.md`.
