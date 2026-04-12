#!/bin/bash

# EpiCheck Android Installation Helper
# Résout les problèmes courants d'installation APK

set -e

RESET='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'

log_info() { echo -e "${BLUE} $1${RESET}"; }
log_success() { echo -e "${GREEN} $1${RESET}"; }
log_warning() { echo -e "${YELLOW} $1${RESET}"; }
log_error() { echo -e "${RED} $1${RESET}"; }

# Check prerequisites
check_requirements() {
    log_info "Vérification des prérequis..."

    if ! command -v adb &> /dev/null; then
        log_error "adb non trouvé. Installez Android SDK."
        exit 1
    fi

    if ! command -v node &> /dev/null; then
        log_error "Node.js non trouvé."
        exit 1
    fi

    if ! command -v pnpm &> /dev/null && ! command -v npm &> /dev/null; then
        log_error "npm/pnpm non trouvé."
        exit 1
    fi

    log_success "Prérequis OK"
}

# Check emulator/device
check_devices() {
    log_info "Vérification des appareils..."

    DEVICES=$(adb devices | grep -v "^List" | grep -v "^$" | grep -v "adb")

    if [ -z "$DEVICES" ]; then
        log_error "Aucun émulateur ou appareil trouvé!"
        log_info "Lancez un émulateur via Android Studio ou:"
        log_info "  emulator -avd <NOM_AVD>"
        exit 1
    fi

    log_success "Appareils trouvés:"
    adb devices
}

# Check disk space
check_disk_space() {
    log_info "Vérification de l'espace disque..."

    SPACE=$(adb shell df -h /data | tail -1)

    if echo "$SPACE" | grep -q "100%"; then
        log_error "Espace disque plein sur l'appareil!"
        log_info "Solution: emulator -avd <NOM_AVD> -wipe-data"
        exit 1
    fi

    log_success "Espace disponible OK: $SPACE"
}

# Clean build artifacts
clean_build() {
    log_info "Nettoyage des artefacts de build..."

    rm -rf android/build 2>/dev/null || true
    rm -rf android/app/build 2>/dev/null || true
    rm -rf node_modules/.expo 2>/dev/null || true

    log_success "Nettoyage terminé"
}

# Install dependencies
install_deps() {
    log_info "Installation des dépendances..."

    if [ -f "pnpm-lock.yaml" ]; then
        pnpm install
    else
        npm install
    fi

    log_success "Dépendances installées"
}

# Prebuild Android
prebuild_android() {
    log_info "Reconstruction du projet Android..."

    # Determine package manager
    if [ -f "pnpm-lock.yaml" ]; then
        pnpm exec -- expo prebuild --platform android --clean
    else
        npm exec -- expo prebuild --platform android --clean
    fi

    log_success "Projet Android prêt"
}

# Apply gradle optimizations
apply_optimizations() {
    log_info "Application des optimisations Gradle..."

    local template_file="android.gradle.properties.template"
    local target_file="android/gradle.properties"
    local marker_begin="# BEGIN EPICHECK GRADLE OPTIMIZATIONS"
    local marker_end="# END EPICHECK GRADLE OPTIMIZATIONS"

    if [ -f "$template_file" ]; then
        touch "$target_file"

        if grep -Fq "$marker_begin" "$target_file"; then
            log_info "Optimisations Gradle déjà présentes, aucune duplication ajoutée"
        else
            {
                echo ""
                echo "$marker_begin"
                cat "$template_file"
                echo "$marker_end"
            } >> "$target_file"
            log_success "Optimisations appliquées"
        fi
    else
        log_warning "Template gradle.properties non trouvé"
    fi
}

# Build and install
build_and_install() {
    log_info "Compilation et installation..."

    # Determine package manager and use it to run expo
    if [ -f "pnpm-lock.yaml" ]; then
        if pnpm exec -- expo run:android --variant debug; then
            log_success "Installation réussie!"
        else
            log_error "L'installation a échoué"
            exit 1
        fi
    else
        if npm exec -- expo run:android --variant debug; then
            log_success "Installation réussie!"
        else
            log_error "L'installation a échoué"
            exit 1
        fi
    fi
}

# Main flow
main() {
    echo ""
    echo "🚀 EpiCheck Android Installation Helper"
    echo "========================================"
    echo ""

    check_requirements
    check_devices
    check_disk_space

    read -p "Continuer avec le nettoyage complet? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Annulé"
        exit 0
    fi

    clean_build
    install_deps
    prebuild_android
    apply_optimizations
    build_and_install

    echo ""
    log_success "Tout est prêt! L'app est installée sur l'appareil."
    echo ""
}

main "$@"
