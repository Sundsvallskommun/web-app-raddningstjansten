# Deploy till Dokploy

Två separata Dokploy-**Applications** byggs ur det här mono-repot:

| Service    | Context     | Dockerfile            | Container-port |
| ---------- | ----------- | --------------------- | -------------- |
| `backend`  | `backend`   | `backend/Dockerfile`  | `3000`         |
| `frontend` | `frontend`  | `frontend/Dockerfile` | `80`           |

## Arkitektur i drift

Endast **frontend** behöver en publik domän. Frontendens nginx serverar SPA:n och
**proxar `/api` vidare till backend internt**, så att webbläsaren bara pratar med
en origin (krävs för session-cookien som SAML-inloggningen använder).

```
Browser ──https──▶ Traefik ──▶ frontend (nginx :80)
                                   │  /api/*  (proxy, internt nätverk)
                                   ▼
                               backend (BFF :3000) ──▶ WSO2 (Citizen/Employee)
                                                    └─▶ fejk-SSO-IdP (SAML)
```

Backend exponeras alltså **inte** publikt (nås bara via frontendens `/api`-proxy
på Dokploys interna nätverk).

## 1. Skapa backend-servicen

1. Dokploy → projekt → **Create Service → Application**. Namnge t.ex.
   `raddningstjansten-backend`.
2. **Provider:** GitHub → repo `Sundsvallskommun/web-app-raddningstjansten`,
   branch `main`.
3. **Build Type:** Dockerfile.
   - Docker File: `backend/Dockerfile`
   - Docker Context Path: `backend`
4. **Environment** (Advanced → Environment):

   ```
   NODE_ENV=production
   PORT=3000
   BASE_URL_PREFIX=/api
   SECRET_KEY=<lång slumpsträng>
   ORIGIN=https://<frontend-domän>
   CREDENTIALS=true
   API_BASE_URL=https://api-test.sundsvall.se
   CLIENT_KEY=<wso2 key>
   CLIENT_SECRET=<wso2 secret>
   MUNICIPALITY_ID=2281
   # Medborgare (BankID-mock)
   CITIZEN_PERSON_ID=<uuid>
   CITIZEN_PERSON_NUMBER=<personnummer>
   CITIZEN_NAME=Test Testsson
   # Admin (SAML mot fejk-IdP) – publika frontend-URL:er, inte localhost
   SAML_ENTRY_SSO=https://<fejk-idp>/sso
   SAML_CALLBACK_URL=https://<frontend-domän>/api/saml/login/callback
   SAML_LOGOUT_CALLBACK_URL=https://<frontend-domän>/api/saml/logout/callback
   SAML_SUCCESS_REDIRECT=https://<frontend-domän>/admin/dashboard
   SAML_FAILURE_REDIRECT=https://<frontend-domän>/admin
   SAML_ISSUER=web-app-raddningstjansten
   SAML_IDP_PUBLIC_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
   ADMIN_GROUP=Raddningstjansten-AVD-CHEFER
   ```

   > Ingen publik domän behövs för backend. Notera **service-namnet** (t.ex.
   > `raddningstjansten-backend`) – frontend använder det för intern proxy.

5. **Deploy.**

## 2. Skapa frontend-servicen

1. **Create Service → Application**, t.ex. `raddningstjansten-frontend`.
2. **Provider:** samma repo/branch `main`.
3. **Build Type:** Dockerfile.
   - Docker File: `frontend/Dockerfile`
   - Docker Context Path: `frontend`
4. **Domains:** lägg till den publika domänen, **Container Port `80`**, slå på HTTPS
   (Let's Encrypt).
5. **Environment:**

   ```
   # Intern adress till backend-servicen.
   # OBS: värdnamnet är backendens GENERERADE app-namn i Dokploy
   # (format <projekt>-<service>-<slump>, t.ex. rtj-rtjbackend-pw9bi0),
   # INTE det "snälla" namn du skrev. Hittas i backend-appens inställningar.
   BACKEND_URL=http://rtj-rtjbackend-pw9bi0:3000
   ```

6. **Deploy.** (Ändrar du env senare måste frontend deployas om så nginx läser
   in det nya `BACKEND_URL`.)

> Både frontend och backend måste ligga på samma nätverk (`dokploy-network`) för
> att namnuppslaget ska fungera – två Applications gör det normalt automatiskt.
> Om intern DNS strular kan du istället ge backend en egen publik domän och sätta
> `BACKEND_URL=https://<backend-domän>` – nginx är förberedd för https-upstream.

## 3. Webhooks – auto-bygg vid push till `main`

Gör detta **per service** (två webhooks totalt):

1. I Dokploy-applikationen: slå på **Auto Deploy**, och kopiera **Webhook URL**
   (under Deployments).
2. GitHub → repo **Settings → Webhooks → Add webhook**:
   - **Payload URL:** Dokploy-applikationens Webhook URL
   - **Content type:** `application/json`
   - **Events:** *Just the push event*
3. Upprepa för den andra applikationen.

Vid push till `main` triggas båda webhookarna och Dokploy bygger om respektive
service. Pushar till andra brancher ignoreras (Dokploy bygger bara `main`).

> Alternativ: är repot kopplat via Dokploys **GitHub App** räcker det att slå på
> *Auto Deploy* per application – då behövs inga manuella webhooks.

## Att tänka på (POC)

- **Sessioner** lagras i minnet (MemoryStore). De nollställs vid omdeploy och
  delas inte mellan repliker – kör en replik per service tills vidare.
- **HTTPS krävs** för admin-login: session-cookien sätts med `Secure`. Dokploys
  Traefik terminerar TLS och nginx vidarebefordrar `X-Forwarded-Proto`.
- **Fejk-IdP:n** (`web-app-fake-sso-idp`) måste vara nåbar från användarens
  webbläsare, och dess `DESTINATION` måste vara exakt `SAML_CALLBACK_URL` ovan.
- Byt `SECRET_KEY` till en riktig slumpsträng och lägg aldrig in skarpa
  `CLIENT_SECRET`/SAML-nycklar i git – bara i Dokploys env.
