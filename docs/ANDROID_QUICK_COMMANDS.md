# Installation Android - Commandes Pratiques

## 🚀 Installation standard (recommandée)

```bash
# Installation automatisée avec vérifications
npm run android:clean
```

## 🆘 Situations problématiques

### ❌ "INSTALL_FAILED_INSUFFICIENT_STORAGE"
**Cause:** Espace disque insuffisant sur l'émulateur

```bash
# Solution 1: Nettoyer l'émulateur
emulator -avd <NOM_AVD> -wipe-data

# Solution 2: Augmenter l'espace disque
emulator -avd <NOM_AVD> -partition-size 2048
```

### ❌ "INSTALL_FAILED_VERSION_DOWNGRADE"
**Cause:** Version d'app plus ancienne que celle installée

```bash
# Désinstaller l'app
adb uninstall com.hownee.epicheck.app

# Réinstaller
npm run android
```

### ❌ "Protocol failure"
**Cause:** Connexion ADB instable

```bash
# Redémarrer ADB
adb kill-server
adb server
adb devices
```

### ❌ "Build fails with OOM"
**Cause:** Mémoire insuffisante pour Gradle

```bash
# Augmenter la mémoire JVM dans android/gradle.properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

### ❌ "APK too large"
**Cause:** APK dépasse les 100 MB

```bash
# Réduire l'APK:
# 1. Vérifier la taille
du -h android/app/build/outputs/apk/debug/app-debug.apk

# 2. Analyser le contenu
unzip -l android/app/build/outputs/apk/debug/app-debug.apk | tail -20

# 3. Nettoyer et rebuild
npm run android:wipe
```

---

## 📝 Commandes utiles

### Vérifier l'état
```bash
# Lister les appareils
adb devices

# Voir les apps installées
adb shell pm list packages | grep epicheck

# Vérifier l'espace
adb shell df -h /data

# Voir les logs
adb logcat | grep -i epicheck
```

### Installer/Désinstaller manuellement
```bash
# Installer
adb install -r -d android/app/build/outputs/apk/debug/app-debug.apk

# Désinstaller
adb uninstall com.hownee.epicheck.app

# Lancer l'app
adb shell am start -n com.hownee.epicheck.app/.MainActivity
```

### Debugging
```bash
# Logs détaillés
adb logcat

# Logs filtrés par app
adb logcat | grep $(adb shell ps | grep epicheck | awk '{print $2}')

# Sauvegarder les logs
adb logcat > logs.txt

# Voir les erreurs de build
cd android && ./gradlew build --stacktrace
```

---

## ⚡ Flux de développement optimal

```bash
# 1. Première installation (complète)
npm run android:clean

# 2. Itérations rapides
npm run android

# 3. Si problèmes persistants
npm run android:wipe  # Wipe données, rebuild complet

# 4. Production
npm run build:apk     # Build release APK
```

---

## 📋 Checklist avant de commit

- [ ] `npm run android` fonctionne
- [ ] Aucun warning dans la compilation Gradle
- [ ] Taille APK raisonnable (<50 MB debug)
- [ ] `npm run lint` passe
- [ ] Tests passent
