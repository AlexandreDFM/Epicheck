/**
 * File Name: secureStorage.ts
 * Description: Storage for secrets (Intranet cookie, Jenkins token, Office
 *              365 tokens), shared by the auth services.
 *
 * - iOS / Android: expo-secure-store (Keychain / Keystore).
 * - Web: sessionStorage, cleared when the tab closes, so that a stolen
 *   browser profile or a later XSS finds nothing. Values left in
 *   localStorage by older versions are moved over once, then removed.
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";

const secureStorage = {
    async getItem(key: string): Promise<string | null> {
        if (!isWeb) {
            return await SecureStore.getItemAsync(key);
        }
        const value = sessionStorage.getItem(key);
        if (value !== null) {
            return value;
        }
        const legacy = localStorage.getItem(key);
        if (legacy !== null) {
            sessionStorage.setItem(key, legacy);
            localStorage.removeItem(key);
        }
        return legacy;
    },

    async setItem(key: string, value: string): Promise<void> {
        if (!isWeb) {
            await SecureStore.setItemAsync(key, value);
            return;
        }
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
    },

    async removeItem(key: string): Promise<void> {
        if (!isWeb) {
            await SecureStore.deleteItemAsync(key);
            return;
        }
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    },
};

export default secureStorage;
