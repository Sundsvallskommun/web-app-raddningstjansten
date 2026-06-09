# Deploy till Dokploy

Två separata Dokploy-**Applications** byggs ur det här mono-repot:

| Service       | Context     | Dockerfile            | Container-port |
| ------------- | ----------- | --------------------- | -------------- |
| `backend`     | `backend`   | `backend/Dockerfile`  | `3000`         |
| `frontend`    | `frontend`  | `frontend/Dockerfile` | `80`           |

> **Test SSO** behöver ingen databas längre — de tre handläggarna är definierade i
> kod och seedas in i employee-mocken vid uppstart. Citizen/Employee-mockarna är
> egna api-team-tjänster (anges via `*_MOCK_BASE_URL`), inte byggda härifrån.

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

## Lägen (`APP_MODE`)

En enda variabel, `APP_MODE`, sätter förvalen för hela stacken. Att gå från demo
till produktion är alltså ett env-byte + omdeploy — ingen kodändring. De
per-concern-variablerna nedan är *data* (URL:er, cert); `APP_MODE` avgör vilken
väg som används.

| Concern | `demo` (utanför VPN) | `ad` (inom AD/VPN) | `prod` |
| --- | --- | --- | --- |
| Handläggar-login | Test SSO + fake-idp | fake-idp SAML (+ Test SSO) | riktig IdP (OneGate) SAML |
| Handläggar-data | employee-mock | WSO2 Employee | WSO2 Employee |
| Medborgar-login | mock-BankID | mock-BankID | OneGate **riktig BankID** |
| Medborgar-data | citizen-mock | WSO2 Citizen | WSO2 Citizen |
| Mock-seedning vid start | ja | nej | nej |
| Test SSO-knapp | på | på | **av** (tvingat) |

Vad varje läge förväntar sig i env (utöver bas-variablerna):

```
# demo — lokal/POC utan VPN
APP_MODE=demo
CITIZEN_MOCK_BASE_URL=http://<rtj-citizen>      EMPLOYEE_MOCK_BASE_URL=http://<rtj-employee>
EMPLOYEE_LOGIN_PASSWORD=<delat>                 EMPLOYEE_PERSON_NUMBER=<pnr1,pnr2,pnr3>

# ad — inom kommunnät/VPN, riktiga test-API:er
APP_MODE=ad
# mock-URL:erna ignoreras (kan lämnas kvar); Citizen/Employee går mot API_BASE_URL (WSO2)
CITIZEN_PERSON_ID=<uuid1,uuid2>                 CITIZEN_PERSON_NUMBER=<pnr1,pnr2>
SAML_ENTRY_SSO=<fejk-idp>/sso                   EMPLOYEE_LOGIN_PASSWORD=<delat>   # Test SSO valfritt

# prod — skarp drift
APP_MODE=prod
# Test SSO av automatiskt; medborgarlogin → OneGate BankID
CITIZEN_AUTH_MODE=saml                          SAML_CITIZEN_*=<OneGate-federation, se docs/BANKID-ONEGATE.md>
SAML_ENTRY_SSO=<riktig IdP>/sso                 # admin mot riktig IdP i stället för fejk-idp
```

> `APP_MODE` byter aldrig `SAML_ENTRY_SSO`/`API_BASE_URL` åt dig — peka dem på
> fejk-idp/test-WSO2 i demo/ad och på de skarpa motsvarigheterna i prod.
> Templating (beslut-PDF) och legalentity (engagemang) saknar mock och går alltid
> mot WSO2; i `demo` utan VPN degraderar de tyst (beslut-PDF renderas inte).

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
   # Medborgare (BankID-mock). Kommaseparerade, parallella listor (en eller flera).
   # Namnet hämtas från Citizen, så CITIZEN_NAME behövs inte längre.
   CITIZEN_PERSON_ID=<uuid1>,<uuid2>
   CITIZEN_PERSON_NUMBER=<personnummer1>,<personnummer2>
   # Lösenord som medborgaren anger i inloggningsdialogen
   CITIZEN_LOGIN_PASSWORD=<lösenord>
   # Admin (SAML mot fejk-IdP) – publika frontend-URL:er, inte localhost
   SAML_ENTRY_SSO=https://<fejk-idp>/sso
   SAML_CALLBACK_URL=https://<frontend-domän>/api/saml/login/callback
   SAML_LOGOUT_CALLBACK_URL=https://<frontend-domän>/api/saml/logout/callback
   SAML_SUCCESS_REDIRECT=https://<frontend-domän>/admin/dashboard
   SAML_FAILURE_REDIRECT=https://<frontend-domän>/admin
   SAML_ISSUER=web-app-raddningstjansten
   SAML_IDP_PUBLIC_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
   # Editor (full) grupper + read-only viewer-grupp
   ADMIN_GROUP=Raddningstjansten-AVD-CHEFER,Raddningstjansten-AVD-EDITOR
   VIEWER_GROUP=Raddningstjansten-AVD-VIEWER
   # Test SSO (valfritt – 3 mockade handläggare i kod). Tom = avstängt.
   EMPLOYEE_LOGIN_PASSWORD=<delat lösenord>
   EMPLOYEE_PERSON_NUMBER=<pnr1>,<pnr2>,<pnr3>   # endast för att seeda employee-mocken
   # Citizen/Employee-mockar (api-team-tjänster, utan WSO2/VPN). Tom = WSO2-gatewayen.
   CITIZEN_MOCK_BASE_URL=http://<rtj-citizen-appnamn>
   EMPLOYEE_MOCK_BASE_URL=http://<rtj-employee-appnamn>
   ```

   > Ingen publik domän behövs för backend. Notera **service-namnet** (t.ex.
   > `raddningstjansten-backend`) – frontend använder det för intern proxy.

5. **Deploy.**

### Citizen/Employee-mockar (VPN-fritt)

api-teamet driver två fristående mock-tjänster i Dokploy (`api-service-citizen`,
`api-service-employee`) som speglar Citizen/Employee utan WSO2-token. Sätt
`CITIZEN_MOCK_BASE_URL` / `EMPLOYEE_MOCK_BASE_URL` till deras interna app-namn så
slipper POC:en VPN för medborgar-/handläggardata. Vid uppstart **seedar** backenden
(idempotent) test-medborgare med giltiga Sundsvalls-/Timrå-adresser + de tre
Test-SSO-handläggarna. Lämnas URL:erna tomma används riktiga WSO2-gatewayen (kräver
VPN). Templating (beslut-PDF) och legalentity (engagemang) saknar mock och går
fortfarande via WSO2.

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
- **Test SSO** är en POC-genväg (delat lösenord, mockade användare) – stäng av den
  i skarp drift genom att lämna `EMPLOYEE_LOGIN_PASSWORD` tom. Behörighetsrollerna
  (editor = skriv, viewer = läs) gäller även riktiga SAML-inloggningar via grupp.
