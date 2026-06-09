# web-app-raddningstjansten

Proof-of-concept web service for Räddningstjänsten Medelpad (fire & rescue),
centred on the **egensotning** (self-sweeping permit) flow. Mono-repo with an
**Express.js BFF** (`backend/`) and a **React frontend** (`frontend/`, Vite — not
Next.js).

Two entry points:

| Entry point        | URL       | Login (POC)                                              |
| ------------------ | --------- | ------------------------------------------------------- |
| Citizen            | `/`       | BankID — mock picker (demo/ad) or OneGate real BankID (prod) |
| Caseworker (admin) | `/admin`  | SAML (fake-idp / real IdP) and/or "Test SSO" (mock, demo/ad) |

Personal identity numbers (personnummer) are always masked in the BFF before they
reach the frontend, and a citizen never sees the caseworker's identity.

## Deployment modes (`APP_MODE`)

A single env variable sets the defaults for the whole stack, so going from a
VPN-free demo to production is a one-variable change. Full matrix and per-mode env
presets are in [`DEPLOY.md`](./DEPLOY.md).

|                          | `demo` (off-VPN)        | `ad` (on AD/VPN)            | `prod`                  |
| ------------------------ | ----------------------- | --------------------------- | ----------------------- |
| Citizen / Employee data  | standalone **mocks**    | WSO2 (Citizen 3.0 / Emp 2.0) | WSO2                    |
| Citizen login            | mock BankID             | mock BankID                 | OneGate **real BankID** |
| Caseworker login         | Test SSO + fake-idp     | fake-idp SAML               | real IdP SAML           |
| Test SSO                 | on                      | on                          | **off (forced)**        |
| Mock seeding at startup  | yes                     | no                          | no                      |

The mocks (`CITIZEN_MOCK_BASE_URL` / `EMPLOYEE_MOCK_BASE_URL`) are standalone
Dokploy services that mirror Citizen/Employee **without a WSO2 token**, so the POC
runs entirely off-VPN. In `demo` the BFF seeds test citizens (with valid
Sundsvall/Timrå addresses so submissions pass the area check) and the three
Test-SSO caseworkers into the mocks on startup. The mock URLs can stay in env for
all modes — they are ignored in `ad`/`prod`.

> **Test SSO** is a config-based shortcut: three caseworkers (admin/editor/viewer)
> are defined in code and log in with a shared `EMPLOYEE_LOGIN_PASSWORD`. There is
> **no database** (the previous MySQL store was removed). It is forced off in `prod`.

## Roles

Caseworker authorization is derived from AD groups — the same model for real SAML
and Test SSO logins:

- `ADMIN_GROUP` (CHEFER + EDITOR) → **editor**: full read + write.
- `VIEWER_GROUP` (VIEWER) → **viewer**: read-only (write endpoints and UI actions
  are blocked).

## Architecture

```
Browser ──▶ frontend (Vite/React, nginx)
                │  /api/*  (proxy)
                ▼
            backend (Express BFF)
                ├─▶ Citizen / Employee    (WSO2 gateway  *or*  standalone mocks)
                ├─▶ rtj-management         (errand API, no token)
                ├─▶ Templating 2.1 (WSO2)  (decision PDFs)
                └─▶ fake-idp / OneGate      (SAML)
```

The BFF pattern (api-service, in-memory token caching, routing-controllers) is
based on `web-app-dispatch-portal`. The errand backend is **rtj-management** (a
separate service, no WSO2 token); decision documents are rendered via
**Templating 2.1** over the WSO2 gateway.

## Key features

- Citizen egensotning application — single multipart submit (form + two typed
  attachments), plus edit, supplement, and notifications.
- Caseworker review — self-assign, approve/reject with a free-text decision,
  decision PDF (stored or rendered on demand), and revoke a granted permit.
- Permit validity window shown to the citizen, with an expiry warning configurable
  via `EGENSOTNING_VALIDITY_WARNING_DAYS`.

## Getting started locally

### Backend

```bash
cd backend
yarn
cp .env.example.local .env.development.local   # APP_MODE=demo, mock URLs, CLIENT_KEY/SECRET, person numbers
yarn dev                                        # http://localhost:3001
```

Smoke test: `GET http://localhost:3001/api/health` → `200`. In `demo` mode **no VPN
is needed** — the BFF talks to the standalone mocks and seeds test data on startup.

### Frontend

```bash
cd frontend
yarn
cp .env-example .env
yarn dev                                         # http://localhost:3000
```

Vite proxies `/api` → `http://localhost:3001` in dev.

### Fake SSO IdP (for the SAML caseworker login)

The SAML admin path uses
[`web-app-fake-sso-idp`](https://github.com/Sundsvallskommun/web-app-fake-sso-idp).
Run it separately on `:7000`:

1. Start the fake IdP per its README (generate certs in `lib/certs/`, copy
   `users.json`). Add the test user from `fixtures/fake-idp-users/`
   (**Tora Åström**, `tor10ast` / `KommunDraken42!`, group
   `Raddningstjansten-AVD-CHEFER`).
2. Point the IdP's `DESTINATION`/`METADATA` at the SP URLs:
   - `DESTINATION=http://localhost:3001/api/saml/login/callback`
   - `METADATA=http://localhost:3001/api/saml/metadata`
3. In backend `.env.development.local`: set `SAML_IDP_PUBLIC_CERT` to the contents
   of the IdP's `lib/certs/public.cer` and make sure `ADMIN_GROUP` matches the group.

Neither **Test SSO** nor **citizen login** requires the IdP — only the SAML admin
path does.

### With Docker (locally)

```bash
cp .env.example .env        # root vars (APP_MODE, mock URLs, CLIENT_KEY/SECRET, person numbers, …)
docker compose up --build
```

No database service is needed (Test SSO is config-based).

## Deploy (Dokploy)

`frontend/` and `backend/` each have a `Dockerfile` and are created as two separate
Applications in Dokploy (auto-deploy via webhook on push to `main`). Backend is
exposed internally (port `3000`); frontend is served by nginx (port `80`) and
proxies `/api` to the backend, so only the frontend needs a public domain. The
Citizen/Employee mocks are separate api-team services referenced via
`*_MOCK_BASE_URL` (not built from this repo).

Full step-by-step guide with the mode matrix, env variables and webhook setup is in
[`DEPLOY.md`](./DEPLOY.md). For the real-BankID (OneGate SAML) citizen federation,
see [`docs/BANKID-ONEGATE.md`](./docs/BANKID-ONEGATE.md).

## Status / scope

- Citizen BankID login: mock picker (format-compatible) by default; OneGate real
  BankID is wired and activates in `prod` once `SAML_CITIZEN_*` is configured.
- Caseworker login: SAML against the fake/real IdP **and** config-based Test SSO,
  both with the editor/viewer role model from AD groups.
- Citizen 3.0 / Employee 2.0 integrations run against the WSO2 gateway (`ad`/`prod`)
  or the standalone mocks (`demo`).
- rtj-management errand API and Templating 2.1 decision documents are integrated.
- MUI is the component library for now; to be swapped for Sundsvalls Kommun Shared
  Components later.
- No Redis yet; sessions are in-memory (single replica per service).
