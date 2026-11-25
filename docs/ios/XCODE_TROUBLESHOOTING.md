# iOS / Xcode — Troubleshooting & Version Syncing

Ce guide couvre les problèmes courants rencontrés lors du build iOS avec Xcode, en particulier sur **macOS 26 (Tahoe)**, ainsi que la synchronisation des versions entre `app.json` et les projets natifs.

---

## Table des matières

- [1. macOS 26 — Full Disk Access & TCC](#1-macos-26--full-disk-access--tcc)
- [2. com.apple.provenance & pnpm](#2-comappleprovenance--pnpm)
- [3. Developer Mode](#3-developer-mode)
- [4. Synchronisation des versions](#4-synchronisation-des-versions)
- [5. Workflow de version bump](#5-workflow-de-version-bump)
- [6. Problèmes courants Xcode](#6-problèmes-courants-xcode)

---

## 1. macOS 26 — Full Disk Access & TCC

### Le problème

macOS 26 (Tahoe) renforce les protections **TCC** (Transparency, Consent, and Control) sur les dossiers utilisateur protégés :

- `~/Documents/`
- `~/Desktop/`
- `~/Downloads/`

Si votre projet se trouve dans l'un de ces dossiers, **Xcode et ses processus fils** (node, shell scripts, CocoaPods) ne pourront **pas accéder aux fichiers** de `node_modules/`, provoquant des erreurs comme :

```
Error: EPERM: operation not permitted, open '.../node_modules/.pnpm/.../replace_hermes_version.js'
```

```
with-environment.sh: Operation not permitted
Command PhaseScriptExecution failed with a nonzero exit code
```

### Solution 1 (recommandée) — Déplacer le projet hors des dossiers protégés

```bash
# Créer un dossier de développement à la racine du home
mkdir -p ~/Developer
mv ~/Documents/MonProjet ~/Developer/MonProjet
```

Les dossiers suivants ne sont **pas** protégés par TCC :

- `~/Developer/`
- `~/Projects/`
- `~/<tout dossier personnalisé>/`

### Solution 2 — Accorder Full Disk Access à Xcode

1. Ouvrir **Réglages Système** → **Confidentialité et sécurité** → **Accès complet au disque**
2. Cliquer sur **+** et ajouter :
    - `/Applications/Xcode.app`
    - `/Applications/Utilities/Terminal.app` (ou iTerm2)
3. Redémarrer Xcode

> **⚠️ Note :** Cette solution fonctionne mais est moins pérenne. Un futur update de macOS pourrait révoquer ces permissions. Déplacer le projet hors de `~/Documents/` reste la meilleure pratique.

---

## 2. com.apple.provenance & pnpm

### Le problème

**pnpm** utilise un store global (`~/Library/pnpm/store/v10/`) et crée des **hard-links** vers `node_modules/`. Sur macOS 26, les fichiers téléchargés depuis le registre npm portent l'attribut étendu `com.apple.provenance` (quarantaine Gatekeeper).

Les hard-links héritent de cet attribut → Xcode refuse de lire ou d'exécuter ces fichiers.

### Diagnostic

```bash
# Vérifier si un fichier a la provenance
xattr node_modules/.pnpm/react-native@*/node_modules/react-native/scripts/xcode/with-environment.sh
# Si le résultat affiche "com.apple.provenance" → le fichier est bloqué
```

### Solution : package-import-method=copy

Créer un fichier `.npmrc` à la racine du projet :

```ini
package-import-method=copy
```

Puis réinstaller :

```bash
rm -rf node_modules
pnpm install
```

Cela force pnpm à **copier** les fichiers au lieu de créer des hard-links, ce qui peut atténuer le problème dans certains cas.

### Nettoyer le store pnpm (si nécessaire)

```bash
# Supprimer la provenance du store (nécessite sudo)
sudo xattr -r -d com.apple.provenance ~/Library/pnpm/store/v10/

# Réinstaller
rm -rf node_modules
pnpm install
```

### Vérification

```bash
# Doit retourner vide (aucun attribut)
xattr node_modules/.pnpm/react-native@*/node_modules/react-native/scripts/xcode/with-environment.sh
```

> **Note :** Si `com.apple.provenance` persiste malgré tout, c'est probablement le problème TCC décrit en section 1. Accordez **Full Disk Access** à Xcode ou déplacez le projet.

---

## 3. Developer Mode

### Le problème

macOS peut bloquer l'exécution de scripts non signés si Developer Mode est désactivé.

### Diagnostic

```bash
DevToolsSecurity -status
# Doit afficher: "Developer mode is currently enabled."
```

### Solution

```bash
sudo DevToolsSecurity -enable
```

Ensuite, vérifiez dans **Réglages Système → Confidentialité et sécurité → Mode développeur** que le toggle est bien activé.

---

## 4. Synchronisation des versions

La version vient de `apps/mobile/package.json` et se propage à Xcode lors d'`expo prebuild` : voir [development/VERSIONING.md](../development/VERSIONING.md). Après un bump : `pnpm exec expo prebuild` dans `apps/mobile` (sans `--clean`, pour garder la Team de signature), puis `cd ios && pod install` si des dépendances natives ont changé.

---

## 5. Workflow de version bump

Voir [development/VERSIONING.md](../development/VERSIONING.md#bump).

---

## 6. Problèmes courants Xcode

### "Command PhaseScriptExecution failed"

**Causes possibles (par ordre de probabilité) :**

1. **TCC / Full Disk Access** — Voir [section 1](#1-macos-26--full-disk-access--tcc)
2. **com.apple.provenance** — Voir [section 2](#2-comappleprovenance--pnpm)
3. **Developer Mode désactivé** — Voir [section 3](#3-developer-mode)
4. **Node introuvable** — Vérifier `.xcode.env.local` :
    ```bash
    cat ios/.xcode.env.local
    # Doit contenir : export NODE_BINARY=/chemin/vers/node
    ```
5. **Pods désynchronisés** :
    ```bash
    cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
    ```

### "Signing requires a development team"

```bash
open ios/EpiCheck.xcworkspace
# Xcode → Projet → Signing & Capabilities → sélectionner votre Team
```

### Node introuvable par Xcode

Xcode ne charge pas votre `~/.zshrc` / `~/.bashrc`. Il utilise `.xcode.env` et `.xcode.env.local` :

```bash
# Créer/mettre à jour le fichier
echo "export NODE_BINARY=$(which node)" > ios/.xcode.env.local
```

Vérifier :

```bash
cat ios/.xcode.env.local
# export NODE_BINARY=/Users/you/.nvm/versions/node/v22.21.0/bin/node
```

### Lancer Xcode depuis le terminal

Pour qu'Xcode hérite de votre environnement (PATH, nvm, etc.) — même pattern que pour Android Studio :

```bash
# Ouvrir le workspace depuis le terminal
open ios/EpiCheck.xcworkspace
```

### DerivedData corrompu

Si les builds échouent de manière inexplicable :

```bash
# Supprimer le DerivedData du projet
rm -rf ~/Library/Developer/Xcode/DerivedData/EpiCheck-*

# Ou tout le DerivedData (plus radical)
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### Clean complet (dernier recours)

```bash
# 1. Nettoyer tout
rm -rf ios/Pods ios/Podfile.lock ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData/EpiCheck-*

# 2. Régénérer
npx expo prebuild --platform ios --clean

# 3. Corriger pbxproj si besoin (adapter les valeurs)
sed -i '' 's/MARKETING_VERSION = [^;]*/MARKETING_VERSION = 1.2.0/g' ios/EpiCheck.xcodeproj/project.pbxproj
sed -i '' 's/CURRENT_PROJECT_VERSION = [^;]*/CURRENT_PROJECT_VERSION = 4/g' ios/EpiCheck.xcodeproj/project.pbxproj

# 4. Vérifier
plutil -p ios/EpiCheck/Info.plist | grep -E "CFBundleShortVersionString|CFBundleVersion"
grep -E "MARKETING_VERSION|CURRENT_PROJECT_VERSION" ios/EpiCheck.xcodeproj/project.pbxproj | sort -u
```

---

## Résumé des commandes utiles

```bash
# Vérifier Developer Mode
DevToolsSecurity -status

# Vérifier la provenance d'un fichier
xattr <chemin_du_fichier>

# Activer Developer Mode
sudo DevToolsSecurity -enable

# Version (package.json -> projets natifs)
pnpm run version:bump patch
pnpm exec expo prebuild

# Réinstaller les Pods
cd ios && pod install && cd ..

# Nettoyer DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/EpiCheck-*

# Ouvrir Xcode depuis le terminal
open ios/EpiCheck.xcworkspace
```
