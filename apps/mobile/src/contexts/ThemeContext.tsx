/**
 * File Name: ThemeContext.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 5/11/2025
 * Description: This is the ThemeContext.tsx
 * Copyright (c) 2025 Epitech
 * Version: 1.0.0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
    theme: ThemeMode;
    isDark: boolean;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@epicheck_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemColorScheme = useColorScheme();
    const { setColorScheme } = useNativeWindColorScheme();
    const [theme, setThemeState] = useState<ThemeMode>("system");
    const [isLoaded, setIsLoaded] = useState(false);

    // Calculate if dark mode is active
    const isDark =
        theme === "system" ? systemColorScheme === "dark" : theme === "dark";

    // Load saved theme preference on mount
    useEffect(() => {
        loadTheme();
    }, []);

    // Update NativeWind colorScheme when isDark changes
    useEffect(() => {
        if (isLoaded) {
            setColorScheme(isDark ? "dark" : "light");
        }
    }, [isDark, isLoaded, setColorScheme]);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (
                savedTheme &&
                ["light", "dark", "system"].includes(savedTheme)
            ) {
                setThemeState(savedTheme as ThemeMode);
            }
        } catch (error) {
            console.error("Failed to load theme:", error);
        } finally {
            setIsLoaded(true);
        }
    };

    const setTheme = async (newTheme: ThemeMode) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
            setThemeState(newTheme);
        } catch (error) {
            console.error("Failed to save theme:", error);
        }
    };

    const toggleTheme = () => {
        const newTheme = isDark ? "light" : "dark";
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
