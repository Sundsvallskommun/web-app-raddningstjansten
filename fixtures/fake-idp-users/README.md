# Fake SSO IdP test users

Test users for the admin SAML login, to be loaded into
[`web-app-fake-sso-idp`](https://github.com/Sundsvallskommun/web-app-fake-sso-idp).

`raddningstjansten-users.json` contains **Tora Åström** (`tor10ast` /
`KommunDraken42!`), a member of `Raddningstjansten-AVD-CHEFER` — the group this
app allows to log in as admin (`ADMIN_GROUP`).

## Loading the user

In the fake IdP repo, either:

- Add the entry to its `users.json` (merge into the array), **or**
- Create the user via the IdP admin UI at <http://localhost:7000/admin> and set
  the same SAML attributes, **or**
- `require()` the file from the IdP's `users.js` `imported` array.

> The `citizenIdentifier` (`198101012386`) is a personal number. This app masks
> it before sending it to the browser.
