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
