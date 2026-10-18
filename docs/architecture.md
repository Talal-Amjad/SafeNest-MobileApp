# SafeNest Mobile: architecture

## Roles

One app, chosen at first launch and changeable later:

| Role | Who | Talks to | Auth |
| --- | --- | --- | --- |
| Parent | the parent's own phone | parent API (`/api/v1/auth`, `/children`, `/devices`, `/rules`, `/events`) | session cookie from `/auth/login`, held by the OS cookie store |
| Child device | the child's phone | device API (`/api/v1/device-enrollments/complete`, `/devices/{id}/policy`, `/heartbeat`, `/events`) | per-device credential, stored with `expo-secure-store` (Keychain / Android Keystore) |

The server's CSRF origin check only applies to requests that carry a browser `Origin` header, so native requests with the session cookie work without changes.

## Layers

```
src/app/          screens (expo-router, file-based routes)
src/components/   UI building blocks on the theme tokens
src/api/          typed client, error envelope, endpoint functions
src/lib/          pure logic: status wording, code formatting, precedence
src/storage/      secure storage for the device credential and role
src/theme/        semantic colour tokens shared with the web app
```

Pure logic lives outside React so it is unit-tested with Jest. Enforcement (tasks 8 and 9) lives in native modules, because neither platform exposes it to JavaScript.

## Design rules

- **Honest status:** a device is "up to date" only when it has confirmed the latest rules; offline means offline.
- **Privacy:** the child mode only ever handles domain names, and the app explains this on its transparency page. No passwords, messages, screenshots, keystrokes, audio or video.
- **No covert mode:** the child app is visible and says what it does.
- **Same precedence everywhere:** most specific domain wins, verified against the shared vectors in `src/lib/__tests__/precedence_vectors.json` (identical to the server's copy).

## Android website filter (task 8)

`modules/safenest-vpn` is a local Expo module (Kotlin). It starts an Android `VpnService` whose tunnel advertises a virtual DNS server (`10.111.222.2`) and routes only that address, so app traffic is untouched and only DNS lookups pass through SafeNest:

- Blocked names get `0.0.0.0` / `::`; allowed ones go to 1.1.1.1 / 9.9.9.9 through sockets excluded from the VPN (`protect`). If no upstream answers, the lookup fails (fail closed).
- Precedence is the same walk as `src/lib/policy.ts`, which is tested against the shared vectors.
- A foreground notification keeps the filter visible. `onRevoke` stops it if the user turns the VPN off or another VPN starts, and the next check-in then reports it as off.
- Blocked lookups (one per domain per minute) are drained by the JS check-in and sent to the API as events. The heartbeat reports the applied policy version only while the filter runs.

Known gaps, to be covered by on-device testing and the threat model (task 12): IPv6-only DNS, Private DNS in strict mode, other VPN apps, and a child turning the VPN off in system settings (visible to the parent as "Rules not confirmed").

## iOS website filter (task 9)

`modules/safenest-screentime` (Swift) asks for Screen Time authorization for a child in Family Sharing, so a parent approves it on their own device. It then sets `ManagedSettingsStore.webContent.blockedByFilter = .specific(domains)`.

- It is linked into every iOS build but used only when `extra.familyControls` is set by `app.plugin.js`, which also adds the entitlement. Enable the plugin only after Apple grants the entitlement, or signing fails.
- Screen Time can only block domains, with their subdomains. `blockedDomainsForScreenTime` sends each blocked domain unless an allow rule at the same level overrides it. An allow nested inside a blocked domain (music.youtube.com inside youtube.com) can't be expressed, so it stays blocked on iOS.
- iOS doesn't report individual blocked visits, so iPhones send no activity events. The heartbeat still reports the applied version while the filter is active.

`src/lib/filter.ts` puts Android and iOS behind one interface, so check-ins and the child screen don't care which platform they run on.
