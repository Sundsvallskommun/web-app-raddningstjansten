# web-app-raddningstjansten

POC för en webbtjänst för Räddningstjänsten. Mono-repo med en **Express.js BFF**
(`backend/`) och en **React-frontend** (`frontend/`, Vite – inte Next.js).

Tjänsten har två ingångar:

| Ingång        | URL              | Inloggning (i POC)                          |
| ------------- | ---------------- | ------------------------------------------- |
| Medborgare    | `/`              | BankID (mock, format-kompatibel)            |
| Administratör | `/admin`         | SAML mot fejk-SSO-IdP (samma som dispatch)  |

Medborgar-dashboarden hämtar data om den inloggade från **Citizen 3.0** via WSO2.
Admin-dashboarden visar SAML-grupperna plus den inloggades **Employee 2.0**-post
(`portalpersondata`). Personnummer maskas alltid i BFF:n innan det når frontend.

Admin-inloggningen sker via SAML mot [`web-app-fake-sso-idp`](https://github.com/Sundsvallskommun/web-app-fake-sso-idp)
och behörighet styrs av AD-gruppmedlemskap (`ADMIN_GROUP`).

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

### Fejk-SSO-IdP (för admin-inloggning)

Admin-inloggningen använder SAML mot
[`web-app-fake-sso-idp`](https://github.com/Sundsvallskommun/web-app-fake-sso-idp).
Kör den separat på `:7000`:

1. Starta fejk-IdP:n enligt dess README (generera cert i `lib/certs/`, kopiera
   `users.json`). Lägg in testanvändaren från `fixtures/fake-idp-users/`
   (**Tora Åström**, `tor10ast` / `KommunDraken42!`, grupp
   `Raddningstjansten-AVD-CHEFER`).
2. Sätt IdP:ns `DESTINATION`/`METADATA` till SP:ns URL:er:
   - `DESTINATION=http://localhost:3001/api/saml/login/callback`
   - `METADATA=http://localhost:3001/api/saml/metadata`
3. I backend `.env.development.local`: sätt `SAML_IDP_PUBLIC_CERT` till innehållet
   i IdP:ns `lib/certs/public.cer` och se till att `ADMIN_GROUP` matchar gruppen.

Inloggning som medborgare kräver **inte** IdP:n.

### Med Docker (lokalt)

```bash
cp .env.example .env        # rot-vars (CLIENT_KEY/SECRET, person-id m.m.)
docker compose up --build
```

## Deploy (Dokploy)

`frontend/` och `backend/` har var sin `Dockerfile` och skapas som två separata
Applications i Dokploy (auto-deploy via webhook vid push till `main`). Backend
exponeras internt (port `3000`); frontend serveras av nginx (port `80`) och
proxar `/api` vidare till backend, så bara frontend behöver publik domän.

Fullständig steg-för-steg-guide med env-variabler och webhook-setup finns i
[`DEPLOY.md`](./DEPLOY.md).

## Status / avgränsningar (steg 1: grundplåt)

- Mockad BankID-inloggning (medborgare) – förberedd för skarp migrering.
- Admin-inloggning via SAML mot fejk-SSO-IdP, med AD-gruppkontroll (`ADMIN_GROUP`).
- Skarp Citizen 3.0-integration (medborgare, personId ur `.env`).
- Skarp Employee 2.0-integration (admin, `portalpersondata`).
- MUI som komponentbibliotek tills vidare; byts senare mot Sundsvalls Kommuns
  Shared Components.
- Ingen DB, Redis, SAML eller CI/CD ännu.

Se planen i `C:\Users\SUKMTobNor\.claude\plans\staged-skipping-candy.md`.
