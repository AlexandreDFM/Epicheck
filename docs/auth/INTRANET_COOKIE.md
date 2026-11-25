# Intranet cookie

EpiCheck talks to the Epitech Intranet with the user's Intranet session cookie. This guide replaces the former `COOKIE_EXTRACTION_SOLUTIONS.md` and `COOKIE_WORKAROUND.md` (see the Git history for the exploration that led to the current approach).

## The cookie

| Property | Value                               |
| -------- | ----------------------------------- |
| Name     | `user`                              |
| Domain   | `intra.epitech.eu`                  |
| HttpOnly | yes: page JavaScript cannot read it |
| Secure   | yes: HTTPS only                     |

## How the app gets it

| Platform                | Method                                                                                                                                                                                                              | Code                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Android, iOS            | Office 365 login in a WebView (`IntraWebViewAuth`), then extraction in two steps: JavaScript (`document.cookie`, usually empty because of HttpOnly), then the native cookie store (`@react-native-cookies/cookies`) | `src/screens/IntraWebViewAuth.tsx`                      |
| Android, iOS (fallback) | Paste the cookie in Settings → manual cookie                                                                                                                                                                        | `src/screens/SettingsScreen.tsx`                        |
| Web                     | No WebView: the login opens the Intranet in a new tab, then the user pastes the cookie (below)                                                                                                                      | `src/screens/IntraWebViewAuth.tsx` (`WebAuthComponent`) |

Paths are relative to `apps/mobile/`.

## Copy the cookie from a browser (web version, or fallback)

1. Log in to https://intra.epitech.eu with Office 365.
2. Open the developer tools (F12) → **Application** (Chrome) or **Storage** (Firefox) → **Cookies** → `https://intra.epitech.eu`.
3. Copy the whole value of the `user` cookie (a few hundred characters).
4. Paste it in EpiCheck and validate.

## Where it is stored

| Platform     | Storage                                             |
| ------------ | --------------------------------------------------- |
| Android, iOS | `expo-secure-store` (Keystore / Keychain)           |
| Web          | `sessionStorage`, cleared when the tab closes (#23) |

Both go through `src/services/secureStorage.ts`. The cookie is never written to the logs of release builds (`src/utils/productionLogs.ts`).

## When it stops working

The Intranet answers `401`/`403` or an anti-DDoS page when the cookie has expired: log in again. On the web version, the request goes through the CORS proxy, which the Intranet may refuse outside the Epitech network ([web/README.md](../web/README.md)).
