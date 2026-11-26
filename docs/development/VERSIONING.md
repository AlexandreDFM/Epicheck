# Versions

## Source unique

La version ne se règle plus à la main dans `app.json` ni dans les projets natifs : **seul le champ `version` de `apps/mobile/package.json` compte**. `app.config.ts` en dérive le reste à chaque `expo prebuild` / `expo run` :

| Valeur                                                                            | Calcul                            | Exemple pour `1.2.1` |
| --------------------------------------------------------------------------------- | --------------------------------- | -------------------- |
| `expo.version` → `CFBundleShortVersionString`, `MARKETING_VERSION`, `versionName` | la version                        | `1.2.1`              |
| `ios.buildNumber` → `CFBundleVersion`, `CURRENT_PROJECT_VERSION`                  | `MAJ × 10000 + MIN × 100 + PATCH` | `10201`              |
| `android.versionCode`                                                             | idem                              | `10201`              |

Le plugin `withXcodeVersion` (dans `apps/mobile/app.config.ts`) écrit aussi `MARKETING_VERSION` et `CURRENT_PROJECT_VERSION` dans `project.pbxproj` : la correction au `sed` n'est plus nécessaire.

### Vérifier

```bash
pnpm run version:show                      # 1.2.1 (build 10201)
(cd apps/mobile && pnpm exec expo config --type public | grep -E "version|buildNumber|versionCode")

# Projets natifs, après prebuild (depuis apps/mobile)
plutil -p ios/EpiCheck/Info.plist | grep -E "CFBundleShortVersionString|CFBundleVersion"
grep -E "MARKETING_VERSION|CURRENT_PROJECT_VERSION" ios/EpiCheck.xcodeproj/project.pbxproj | sort -u
grep -E "versionName|versionCode" android/app/build.gradle
```

---

## Bump

```bash
pnpm run version:bump patch     # ou minor / major : met à jour apps/mobile et apps/proxy
# déplacer les notes [Unreleased] du CHANGELOG.md sous la nouvelle version
cd apps/mobile
pnpm exec expo prebuild         # propage la version dans ios/ et android/ (sans --clean : garde le Signing)
cd ios && pod install && cd ..  # seulement si des dépendances natives ont changé
git commit -am "chore(release): vX.Y.Z"
# après fusion sur main : git tag vX.Y.Z && git push origin vX.Y.Z  (déclenche la release APK)
```

> `expo prebuild --clean` reste utile quand `ios/` ou `android/` sont incohérents, mais il supprime la Team de signature choisie dans Xcode : la resélectionner ensuite (Signing & Capabilities).

### Convention

| Type de changement                                             | Version           | Exemple       |
| -------------------------------------------------------------- | ----------------- | ------------- |
| Corrections de bugs                                            | Patch (x.y.**Z**) | 1.2.0 → 1.2.1 |
| Nouvelles fonctionnalités, changement d'infrastructure visible | Minor (x.**Y**.0) | 1.2.1 → 1.3.0 |
| Rupture (abandon d'une plateforme, changement d'API)           | Major (**X**.0.0) | 1.3.0 → 2.0.0 |

Le numéro de build suit la version : toute nouvelle soumission sur un store (ou nouvel APK) demande donc au moins un bump **patch**. Les tags Git s'écrivent `vX.Y.Z` (sans point après le `v`). Mineur et patch restent sous 100.
