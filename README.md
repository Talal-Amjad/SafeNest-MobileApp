# SafeNest Mobile

The SafeNest app for Android and iOS, built with React Native (Expo). One app, two roles:

- **Parent:** sign in to your SafeNest account, see each child's devices and whether they have your latest rules, review blocked attempts, change rules and link new devices.
- **Child device:** link the phone to a child's profile with a one-time code from the dashboard, show the rules that apply and what SafeNest does and doesn't see, and (where the platform allows) enforce website rules.

It talks to the [SafeNest API](https://github.com/Talal-Amjad/SafeNest). The Windows app lives in [SafeNest-DesktopApp](https://github.com/Talal-Amjad/SafeNest-DesktopApp).

> **Status:** in development. Not yet ready to protect a real device.

## Platform reality

| Platform | Website enforcement | Notes |
| --- | --- | --- |
| Android | Local VPN DNS filter (`VpnService`), task 8 | Needs a native module and a development build; one VPN at a time on Android, so it conflicts with other VPN apps. |
| iOS / iPadOS | Screen Time APIs (FamilyControls, ManagedSettings), task 9 | Requires Apple's Family Controls entitlement approval. Until then, iOS supports parent mode and linking only. |

The app only claims enforcement on a platform once it has shipped and been tested on real devices.

## Development

Requires Node 22.13+ (Expo SDK 58), see `.nvmrc`.

```bash
npm install
npm run typecheck && npm run lint && npm test
npm start            # Expo dev server: press a (Android), i (iOS) or w (web preview)
```

The API URL comes from `app.json` → `expo.extra.apiUrl`, overridable with `EXPO_PUBLIC_API_URL` (for example `http://192.168.1.6:8000` to use a local SafeNest stack from a phone on the same Wi-Fi).

## Roadmap

| # | Task | Status |
| --- | --- | --- |
| 1 | Bootstrap: Expo + TypeScript, theme tokens, lint, tests, CI | ✅ |
| 2 | API client, typed errors, secure storage | ✅ |
| 3 | Parent sign-in and app shell | ✅ |
| 4 | Parent home: children, devices, honest status | ✅ |
| 5 | Activity feed and rules (block/allow per child) | ✅ |
| 6 | Add device: one-time code with countdown and live "linked" | |
| 7 | Child mode: link this phone, status, transparency page | |
| 8 | Android enforcement: VPN-based DNS filter (native module) | |
| 9 | iOS enforcement: Screen Time APIs (entitlement-gated) | |
| 10 | Push notifications for blocked-site alerts | |
| 11 | Release: EAS build profiles, store listings, privacy labels | |
| 12 | End-to-end test and threat model | |
