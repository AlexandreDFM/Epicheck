/**
 * File Name: App.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 29/10/2025
 * Description: This is the App.tsx
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

import "./global.css";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import AppText from "./components/AppText";
import { StatusBar } from "expo-status-bar";
import LoginScreen from "./screens/LoginScreen";
import * as SplashScreen from "expo-splash-screen";
import PresenceScreen from "./screens/PresenceScreen";
import SettingsScreen from "./screens/SettingsScreen";
import type { IIntraEvent } from "./types/IIntraEvent";
import ActivitiesScreen from "./screens/ActivitiesScreen";
import { NavigationContainer } from "@react-navigation/native";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setDefaultFontFamily } from "./utils/setDefaultFontFamily";
import ManualAttendanceScreen from "./screens/ManualAttendanceScreen";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

type RootStackParamList = {
    Login: undefined;
    Activities: undefined;
    Presence: { event?: IIntraEvent };
    ManualAttendance: { event?: IIntraEvent };
    Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
    const { isDark } = useTheme();

    // Custom Toast configuration
    const toastConfig = {
        success: (props: any) => (
            <BaseToast
                {...props}
                style={{
                    borderLeftColor: '#10b981',
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                }}
                contentContainerStyle={{ paddingHorizontal: 15 }}
                text1Style={{
                    fontSize: 15,
                    fontWeight: '600',
                    fontFamily: 'IBMPlexSansBold',
                    color: isDark ? '#ffffff' : '#111827',
                }}
                text2Style={{
                    fontSize: 13,
                    fontFamily: 'IBMPlexSans',
                    color: isDark ? '#d1d5db' : '#6b7280',
                }}
            />
        ),
        error: (props: any) => (
            <ErrorToast
                {...props}
                style={{
                    borderLeftColor: '#ef4444',
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                }}
                text1Style={{
                    fontSize: 15,
                    fontWeight: '600',
                    fontFamily: 'IBMPlexSansBold',
                    color: isDark ? '#ffffff' : '#111827',
                }}
                text2Style={{
                    fontSize: 13,
                    fontFamily: 'IBMPlexSans',
                    color: isDark ? '#d1d5db' : '#6b7280',
                }}
            />
        ),
        info: (props: any) => (
            <BaseToast
                {...props}
                style={{
                    borderLeftColor: '#3b82f6',
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                }}
                contentContainerStyle={{ paddingHorizontal: 15 }}
                text1Style={{
                    fontSize: 15,
                    fontWeight: '600',
                    fontFamily: 'IBMPlexSansBold',
                    color: isDark ? '#ffffff' : '#111827',
                }}
                text2Style={{
                    fontSize: 13,
                    fontFamily: 'IBMPlexSans',
                    color: isDark ? '#d1d5db' : '#6b7280',
                }}
            />
        ),
    };

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Login"
                screenOptions={{
                    headerShown: false,
                    contentStyle: {
                        backgroundColor: isDark ? "#242424" : "#FFFFFF",
                    },
                }}
            >
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Activities" component={ActivitiesScreen} />
                <Stack.Screen name="Presence" component={PresenceScreen} />
                <Stack.Screen
                    name="ManualAttendance"
                    component={ManualAttendanceScreen}
                />
                <Stack.Screen name="Settings" component={SettingsScreen} />
            </Stack.Navigator>
            <StatusBar style={isDark ? "light" : "dark"} />
            <Toast config={toastConfig} />
        </NavigationContainer>
    );
}
export default function App() {
    const [fontsLoaded, fontError] = useFonts({
        Anton: require("./assets/fonts/Anton-Regular.ttf"),
        IBMPlexSans: require("./assets/fonts/IBMPlexSans-Regular.ttf"),
        IBMPlexSansBold: require("./assets/fonts/IBMPlexSans-Bold.ttf"),
        IBMPlexSansItalic: require("./assets/fonts/IBMPlexSans-Italic.ttf"),
        IBMPlexSansSemiBold: require("./assets/fonts/IBMPlexSans-SemiBold.ttf"),
    });
    useEffect(() => {
        if (fontsLoaded || fontError) {
            // Hide the splash screen after the fonts have loaded (or an error was returned)
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    useEffect(() => {
        // Set default font family after fonts are loaded
        if (fontsLoaded) {
            setDefaultFontFamily();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded && !fontError) {
        return (
            <SafeAreaProvider>
                <AppText>Loading fonts... Maybe an error occurred.</AppText>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <AppNavigator />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
