# Threat model and limitations

SafeNest on phones is a parental-control tool used **openly**, with the child's knowledge. It aims to make bypassing hard and visible to the parent, not to be impossible to defeat. These are the limits parents are told.

## Assets

| Asset | Where | Protection |
| --- | --- | --- |
| Parent session | OS cookie store (httpOnly cookie from the API) | https only in release builds; revocable from the web dashboard's Sessions page |
| Device credential | `expo-secure-store` (Keychain / Keystore-backed, this device only, after first unlock) | never shown in the UI, sent only as a bearer token; the parent can revoke it at any time (periodic rotation, as the Windows app does, is still to come) |
| Enrollment code | shown to the parent, typed on the child's phone | single use, 15-minute expiry, server-side rate limits; the install ID is the Idempotency-Key |
| Website rules and blocked-site reports | API; in memory on the phone | family-scoped on the server; the phone keeps only the rules it needs and drains reports at each check-in |

## Threats and responses

| Threat | Response | Residual risk |
| --- | --- | --- |
| Child turns off the Android VPN, or starts another VPN | `onRevoke` stops the filter; the next check-in reports it as off (no applied version), so the dashboard stops saying "Rules up to date" | blocking stops until someone turns it back on; the parent sees it, but there's no instant alert yet (task 10) |
| Child uninstalls the app | device goes offline in the dashboard | Android can't prevent uninstalling without device-owner mode; on iOS, Family Sharing authorization lets a parent stop it |
| Private DNS (DNS over TLS) set to "strict" on Android | not filtered | documented; device-owner or managed-profile deployment would close it |
| Browser or app DNS over HTTPS | not covered yet: unlike the Windows app, the phone filter has no list of DoH providers to block | a browser using its own DoH resolver bypasses filtering; adding the provider list is planned |
| VPN, proxy or Tor apps | not covered: one VPN at a time on Android | documented limitation |
| Sites opened by IP address | not covered (DNS-based filtering) | documented limitation |
| Forged "blocked" reports | server accepts an event only if its own policy would block that domain for that device | none known |
| Stolen phone with a linked device credential | Keychain/Keystore storage, this device only; the parent removes the device and the credential is revoked at once | the attacker can read the rule list until then |
| Parent account phishing | the app signs in only to the configured API over https; no in-app browser for sign-in | standard password risks; 2FA is a future server feature |
| Overclaiming protection | heartbeat reports an applied version only while a filter is actually enforcing; UI copy says when phones can't block | none: unit-tested contract |

## iOS specifics

Screen Time filtering works only with Apple's Family Controls entitlement, for a child account in Family Sharing. Without it, iOS offers parent mode and linking only. Screen Time blocks domains in Safari and web views. It can't apply allow rules nested inside a blocked domain, and it doesn't report individual blocked visits.

## End-to-end test plan (on real devices)

Automated today: unit tests (API client, status wording, check-in contract, precedence vectors shared with the server and the Windows app) and a JS bundle check for Android and iOS in CI. Still to run on devices:

1. **Parent:** sign in, check that Home matches the web dashboard, add a block rule and see it on the web, generate a code, link a device, and watch the Add device screen switch to "Linked".
2. **Android child (development build):** link with a code, turn on website blocking (VPN consent), confirm blocked sites fail in Chrome, Firefox and an app's web view, and that allowed sites work. Check that the parent sees the blocked attempts and "Rules up to date"; turn the VPN off in settings and check that the dashboard stops saying up to date.
3. **Removal:** remove the device in the dashboard, then within a minute the phone shows it was removed and forgets its credential.
4. **Offline:** use airplane mode: the filter keeps blocking with the last rules, and lookups for allowed sites fail closed rather than bypassing.
5. **iOS (after the entitlement is granted):** request authorization with a child account, apply rules, and verify blocking in Safari.
