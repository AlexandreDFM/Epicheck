# Releases, signing keys and stores

How a version reaches users, and which secrets that needs. Version numbers themselves: [VERSIONING.md](VERSIONING.md). Web deployment secrets (`KUBE_CONFIG`, `GHCR_PULL_TOKEN`...): [../DEPLOYMENT.md](../DEPLOYMENT.md).

## What the CI does, and does not do

| Target                    | Automated             | How                                                                                                                                                                             |
| ------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web (preprod, production) | Yes                   | Merge into `develop` / `main` ([DEPLOYMENT.md](../DEPLOYMENT.md))                                                                                                               |
| Android APK and AAB       | Yes, built and signed | Tag `vX.Y.Z` on `main` → `.github/workflows/android.yaml` attaches the signed APK, AAB and SHA-256 sums to a GitHub release, with the notes of that version from `CHANGELOG.md` |
| Google Play upload        | **No**                | Upload the AAB by hand (below)                                                                                                                                                  |
| iOS / App Store           | **No**                | No iOS workflow; build with Xcode ([../ios/BUILD.md](../ios/BUILD.md))                                                                                                          |

The CI produces signed files; publishing to a store is a manual step. This is deliberate: the project ends with the Epitech Intranet, so automating store uploads would not pay off (see [Possible additions](#possible-additions)).

## Android signing key

### Secrets

Repository secrets of `epitech-nice/EpiCheck` (Settings → Secrets and variables → Actions → **Repository secrets**; not environment secrets, because the Android workflow runs on tags and pull requests, outside the deploy environments):

| Secret                      | Content                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | The keystore file (`.jks` / `.keystore`), base64-encoded on one line |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password                                                    |
| `ANDROID_KEY_ALIAS`         | Alias of the key inside the keystore                                 |
| `ANDROID_KEY_PASSWORD`      | Key password (often the same as the keystore password)               |

Without `ANDROID_KEYSTORE_BASE64`, the workflow still builds, with the public debug key, and publishes **no** release.

### 1. Check the key before storing it

```bash
keytool -list -v -keystore /path/to/epicheck.jks
```

`keytool` asks for the keystore password. If it is right, the output shows:

- `Alias name:`, the value of `ANDROID_KEY_ALIAS`;
- the `SHA-256` fingerprint of the certificate. Compare it with the **upload key certificate** in Play Console → Test and release → App integrity → App signing: when they match, this keystore is the app's upload key.

Forgotten password? Look in the macOS Keychain (Keychain Access, search "Android" or "keystore"): Android Studio stores it there when "Remember passwords" was checked while signing. A password manager or the old `android/gradle.properties` of a former checkout (`epicheck_UPLOAD_*` lines) are the other usual places. A keystore password cannot be recovered otherwise: see [Lost key or password](#lost-key-or-password).

### 2. Store the secrets

Values are read from the file or typed at a hidden prompt, never shown:

```bash
R=epitech-nice/EpiCheck
base64 -i /path/to/epicheck.jks | tr -d '\n' | gh secret set ANDROID_KEYSTORE_BASE64 --repo $R
gh secret set ANDROID_KEYSTORE_PASSWORD --repo $R   # hidden prompt
gh secret set ANDROID_KEY_ALIAS --repo $R
gh secret set ANDROID_KEY_PASSWORD --repo $R
gh secret list --repo $R                            # names and dates only
```

### 3. Check the CI signature

Actions → **Android** → Run workflow (on `develop` or `main`) builds an artifact without publishing anything. Download it and check the certificate:

```bash
apksigner verify --print-certs EpiCheck-X.Y.Z.apk   # from $ANDROID_HOME/build-tools/<version>/
```

The `SHA-256 digest` must be the fingerprint seen in step 1, not the debug one (`CN=Android Debug`).

### Rotating or replacing the key

Run step 2 again with the new keystore: the next tag uses it. Keep the keystore file and its passwords in a password manager, outside the repository (`*.jks`, `*.keystore`, `*.p12` are ignored by Git).

### Lost key or password

With **Play App Signing** (mandatory for new apps since 2021; check in Play Console → App integrity → App signing), the key you hold is only the **upload key**; Google keeps the real signing key and can accept a new upload key:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore epicheck-upload-new.jks \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000
keytool -export -rfc -keystore epicheck-upload-new.jks -alias upload -file upload_certificate.pem
```

Then Play Console → App signing → **Request upload key reset**, with `upload_certificate.pem`. Google usually answers within 48 hours; then store the new keystore as in step 2. Users see no change: the app stays signed by Google's key.

Without Play App Signing, a lost key means no further update of that app on the store: a new application id would be needed.

## Publishing on Google Play

1. Merge `develop` into `main`, then tag: `git tag vX.Y.Z && git push origin vX.Y.Z` (the tag must equal `apps/mobile/package.json`).
2. When the Android workflow is done, download `EpiCheck-X.Y.Z.aab` from the GitHub release.
3. Play Console → the testing track (closed testing for the private beta) → Create release → upload the AAB, paste the notes of that version from `CHANGELOG.md`, roll out.

Points to know:

- The `versionCode` (`MAJOR*10000 + MINOR*100 + PATCH`, e.g. `10300` for 1.3.0) must be higher than every build already uploaded; a store submission therefore needs at least a patch bump.
- Google re-signs Play builds with its own key: an app installed from the Play Store and an APK from a GitHub release cannot update each other. Uninstall one before installing the other (this erases the app's local data).
- If a build was ever made with **EAS**, its upload key may be stored at Expo: `eas credentials` downloads it. This repository has no `eas.json`; the key used so far is a local keystore.

## Possible additions

Not set up; what each would need:

| Addition                  | Secrets                                                                                                                                                                                         | Work                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Automatic Play upload     | `PLAY_SERVICE_ACCOUNT_JSON` (Google Cloud service account with release rights in Play Console)                                                                                                  | One step after the build in `android.yaml` (upload the AAB to a track) |
| iOS builds and TestFlight | `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (App Store Connect API key), plus a distribution certificate (`.p12` + password) and a provisioning profile; or `EXPO_TOKEN` when building with EAS | A macOS workflow (or EAS) building, signing and uploading the `.ipa`   |
