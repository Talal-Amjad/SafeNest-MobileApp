# Building and releasing

Builds run on [EAS](https://docs.expo.dev/build/introduction/), so no local Android SDK or Xcode is needed. The native modules (`modules/safenest-vpn`, `modules/safenest-screentime`) mean **Expo Go can't run the filters**. Use a development build.

## Profiles (`eas.json`)

| Profile | For | API | Output |
| --- | --- | --- | --- |
| `development` | testing on your own phone against a local SafeNest stack | `http://192.168.1.6:8000` (change to your PC's LAN IP) | dev client, Android APK |
| `preview` | testers | staging API | internal distribution, Android APK |
| `production` | the stores | `https://api.safenest.app` | store builds, version auto-incremented |

Plain `http` is accepted only in development builds (`src/api/config.ts`).

```bash
npm i -g eas-cli && eas login
eas build --profile development --platform android     # install the APK, then: npx expo start --dev-client
eas build --profile production --platform all
eas submit --profile production --platform all
```

## iOS: Family Controls entitlement

Website filtering on iOS needs Apple's **Family Controls** entitlement. Request it from Apple for the bundle ID `app.safenest.mobile`. Once it's granted, add `"./modules/safenest-screentime/app.plugin.js"` to `plugins` in `app.json`. Until then, iOS builds offer parent mode and linking only, and the app says phones can't block yet.

## Store declarations

What the app handles, for Google Play's Data safety form and Apple's privacy labels:

| Data | Parent mode | Child mode | Purpose |
| --- | --- | --- | --- |
| Email, name | sign-in (sent to the SafeNest API) | — | account |
| Website names that were blocked | shown | sent to the parent's account (Android) | app functionality |
| Device name, platform, app version | — | sent at linking and check-in | app functionality |

Not collected: browsing history of allowed sites, full URLs, messages, contacts, photos, location, audio or video. No advertising or tracking SDKs. Everything is encrypted in transit (https).

**Google Play VpnService policy:** the Android filter is a VPN used only for on-device DNS filtering for parental control. In the Play Console, declare the VpnService use as "parental control / content filtering" and link the privacy policy. The persistent notification and the in-app explanation keep it visible.

## Release checklist

1. CI is green: typecheck, lint, tests, and Android and iOS bundles.
2. On a real Android phone with a production build: link with a code, turn on website blocking, check that blocked sites fail in Chrome and in apps, that the parent sees the blocked attempts, and that removing the device in the dashboard unlinks the phone.
3. Bump `version` in `app.json` for user-visible releases (build numbers auto-increment).
