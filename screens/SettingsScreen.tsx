/**
 * File Name: SettingsScreen.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 29/10/2025
 * Description: This is the SettingsScreen.tsx
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

import {
    View,
    Text,
    Alert,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from "react-native";

import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import intraAuth from "../services/intraAuth";
import Toast from "react-native-toast-message";
import soundService from "../services/soundService";
import { useTheme } from "../contexts/ThemeContext";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useColoredUnderscore } from "../hooks/useColoredUnderscore";

type RootStackParamList = {
    Login: undefined;
    Activities: undefined;
    Presence: undefined;
    Settings: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
    const { theme, isDark, setTheme } = useTheme();
    const navigation = useNavigation<NavigationProp>();
    const { underscore, color } = useColoredUnderscore();
    const [manualCookie, setManualCookie] = useState("");
    const [hasCustomError, setHasCustomError] = useState(false);
    const [hasCustomSuccess, setHasCustomSuccess] = useState(false);

    useEffect(() => {
        // Check if custom sounds are configured
        setHasCustomSuccess(soundService.hasCustomSuccessSound());
        setHasCustomError(soundService.hasCustomErrorSound());
    }, []);

    const handleImportSuccessSound = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["audio/*"],
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                return;
            }

            const file = result.assets[0];
            await soundService.importSuccessSound(file.uri);
            setHasCustomSuccess(true);
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error.message || "Failed to import sound",
                position: "top",
            });
        }
    };

    const handleImportErrorSound = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["audio/*"],
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                return;
            }

            const file = result.assets[0];
            await soundService.importErrorSound(file.uri);
            setHasCustomError(true);

            Toast.show({
                type: "success",
                text1: "Success",
                text2: "Custom error sound imported!",
                position: "top",
            });
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error.message || "Failed to import sound",
                position: "top",
            });
        }
    };

    const handleResetSuccessSound = () => {
        Alert.alert("Reset Success Sound", "Reset to default sound?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Reset",
                style: "destructive",
                onPress: async () => {
                    await soundService.resetSuccessSound();
                    setHasCustomSuccess(false);
                    Toast.show({
                        type: "success",
                        text1: "Success",
                        text2: "Sound reset to default",
                        position: "top",
                    });
                },
            },
        ]);
    };

    const handleResetErrorSound = () => {
        Alert.alert("Reset Error Sound", "Reset to default sound?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Reset",
                style: "destructive",
                onPress: async () => {
                    await soundService.resetErrorSound();
                    setHasCustomError(false);
                    Toast.show({
                        type: "success",
                        text1: "Success",
                        text2: "Sound reset to default",
                        position: "top",
                    });
                },
            },
        ]);
    };

    const handleTestSuccessSound = async () => {
        await soundService.playSuccessSound();
    };

    const handleTestErrorSound = async () => {
        await soundService.playErrorSound();
    };

    const handleSetManualCookie = async () => {
        if (!manualCookie.trim()) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Please enter a cookie value",
                position: "top",
            });
            return;
        }

        try {
            await intraAuth.setTestCookie(manualCookie.trim());
            Alert.alert(
                "Success",
                "Cookie set successfully! You can now use the app.",
                [
                    {
                        text: "OK",
                        onPress: () => navigation.navigate("Activities"),
                    },
                ],
            );
            setManualCookie("");
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error.message || "Failed to set cookie",
                position: "top",
            });
        }
    };

    const handleClearCookie = async () => {
        Alert.alert("Clear Cookie", "This will log you out. Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Clear",
                style: "destructive",
                onPress: async () => {
                    await intraAuth.clearIntraCookie();
                    Toast.show({
                        type: "success",
                        text1: "Success",
                        text2: "Cookie cleared",
                        position: "top",
                    });
                    navigation.navigate("Login");
                },
            },
        ]);
    };

    return (
        <SafeAreaView className="flex-1">
            {/* Header */}
            <View className="bg-primary px-4 py-5">
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="mr-3"
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text
                        className="text-2xl text-white"
                        style={{ fontFamily: "Anton" }}
                    >
                        SETTINGS
                        <Text style={{ color }}>{underscore}</Text>
                    </Text>
                </View>
            </View>

            <ScrollView className="flex-1">
                {/* Theme Section */}
                <View className="mx-4 mb-2 mt-4 border border-card-border">
                    <View className="border-b border-border p-4">
                        <Text
                            className="text-xl text-primary"
                            style={{ fontFamily: "Anton" }}
                        >
                            THEME
                            <Text style={{ color }}>{underscore}</Text>
                        </Text>
                        <Text
                            className="mt-1 text-xs text-text-tertiary"
                            style={{ fontFamily: "IBMPlexSans" }}
                        >
                            Choose your preferred theme
                        </Text>
                    </View>

                    <View className="p-4">
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={() => setTheme("light")}
                                className={`flex-1 border-2 px-4 py-3 ${
                                    theme === "light"
                                        ? "border-primary text-primary"
                                        : "border-border"
                                } `}
                            >
                                <Text
                                    className={`text-center text-sm ${theme === "light" ? "text-primary" : isDark ? "text-white" : "text-text-secondary"}`}
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    <Ionicons name="sunny" size={16} /> LIGHT
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setTheme("dark")}
                                className={`flex-1 border-2 px-4 py-3 ${
                                    theme === "dark"
                                        ? "border-primary text-primary"
                                        : "border-border"
                                }`}
                            >
                                <Text
                                    className={`text-center text-sm ${theme === "dark" ? "text-primary" : isDark ? "text-white" : "text-text-secondary"}`}
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    <Ionicons name="moon" size={16} /> DARK
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setTheme("system")}
                                className={`flex-1 border-2 px-4 py-3 ${
                                    theme === "system"
                                        ? "border-primary text-primary"
                                        : "border-border"
                                }`}
                            >
                                <Text
                                    className={`text-center text-sm ${theme === "system" ? "text-primary" : isDark ? "text-white" : "text-text-secondary"}`}
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    <Ionicons name="phone-portrait" size={16} />{" "}
                                    SYSTEM
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Sounds Section */}
                <View className="mx-4 my-2 border border-card-border">
                    <View className="border-b border-border p-4">
                        <Text
                            className="text-xl text-primary"
                            style={{ fontFamily: "Anton" }}
                        >
                            SOUND SETTINGS
                            <Text style={{ color }}>{underscore}</Text>
                        </Text>
                        <Text
                            className="text-xs text-text-tertiary"
                            style={{ fontFamily: "IBMPlexSans" }}
                        >
                            Customize sounds, supported formats: MP3, WAV, M4A
                        </Text>
                    </View>

                    {/* Success Sound */}
                    <View className="border-b border-border p-4">
                        <View className="mb-3 flex-row items-center justify-between">
                            <View className="flex-1">
                                <Text
                                    className="text-primary"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    SUCCESS SOUND
                                </Text>
                                <Text
                                    className="mt-0.5 text-xs text-text-tertiary"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    {hasCustomSuccess ? "Custom" : "Default"}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleTestSuccessSound}
                                className="bg-primary px-4 py-2"
                            >
                                <Text
                                    className="text-sm text-white"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    <Ionicons name="volume-high" size={16} />
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={handleImportSuccessSound}
                                className="flex-1 border border-status-success px-4 py-3"
                            >
                                <Text
                                    className="text-center text-sm text-status-success"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    <Ionicons name="folder-open" size={16} />{" "}
                                    IMPORT SOUND
                                </Text>
                            </TouchableOpacity>

                            {hasCustomSuccess && (
                                <TouchableOpacity
                                    onPress={handleResetSuccessSound}
                                    className="flex-1 border border-status-error px-4 py-3"
                                >
                                    <Text
                                        className="text-center text-sm text-status-error"
                                        style={{ fontFamily: "IBMPlexSans" }}
                                    >
                                        <Ionicons name="refresh" size={16} />{" "}
                                        RESET
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Error Sound */}
                    <View className="p-4">
                        <View className="mb-3 flex-row items-center justify-between">
                            <View className="flex-1">
                                <Text
                                    className="text-primary"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    ERROR SOUND
                                </Text>
                                <Text
                                    className="mt-0.5 text-xs text-text-tertiary"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    {hasCustomError ? "Custom" : "Default"}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleTestErrorSound}
                                className="bg-status-error px-4 py-2"
                            >
                                <Text
                                    className="text-sm text-white"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    <Ionicons name="volume-high" size={16} />
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={handleImportErrorSound}
                                className="flex-1 border border-status-success px-4 py-3"
                            >
                                <Text
                                    className="text-center text-sm text-status-success"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    <Ionicons name="folder-open" size={16} />{" "}
                                    IMPORT SOUND
                                </Text>
                            </TouchableOpacity>

                            {hasCustomError && (
                                <TouchableOpacity
                                    onPress={handleResetErrorSound}
                                    className="flex-1 border border-status-error px-4 py-3"
                                >
                                    <Text
                                        className="text-center text-sm text-status-error"
                                        style={{ fontFamily: "IBMPlexSans" }}
                                    >
                                        <Ionicons name="refresh" size={16} />{" "}
                                        RESET
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                <View className="mx-4 my-2 border border-card-border">
                    <View
                        // onPress={() => setShowDevSection(!showDevSection)}
                        className="border-b border-border p-4"
                    >
                        <Text
                            className="text-xl text-primary"
                            style={{ fontFamily: "Anton" }}
                        >
                            DEVELOPER OPTIONS
                            <Text style={{ color }}>{underscore}</Text>
                        </Text>
                    </View>

                    <View className="p-4">
                        <Text
                            className="mb-2 text-primary"
                            style={{ fontFamily: "IBMPlexSans" }}
                        >
                            MANUAL COOKIE INPUT
                        </Text>
                        <Text
                            className="mb-3 text-xs text-text-tertiary"
                            style={{ fontFamily: "IBMPlexSans" }}
                        >
                            If automatic cookie extraction fails, you can input
                            your cookie here.
                        </Text>

                        <Text
                            className="mb-2 text-xs text-text-tertiary"
                            style={{ fontFamily: "IBMPlexSans" }}
                        >
                            HOW TO GET YOUR COOKIE:
                        </Text>
                        <Text
                            className="mb-2 ml-2 text-xs leading-relaxed text-text-tertiary"
                            style={{ fontFamily: "IBMPlexSans" }}
                        >
                            1. Login to intra.epitech.eu in your browser
                            {"\n"}
                            2. Open DevTools (F12 or Cmd+Option+I){"\n"}
                            3. Go to Application → Cookies{"\n"}
                            4. Find &apos;intra.epitech.eu&apos; and copy the
                            &apos;user&apos; cookie value
                        </Text>

                        <TextInput
                            value={manualCookie}
                            onChangeText={setManualCookie}
                            placeholder="Paste your cookie value here..."
                            placeholderTextColor={isDark ? "#666" : "#999"}
                            multiline
                            numberOfLines={3}
                            className="mb-3 border border-border p-3 text-sm text-primary"
                        />
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={handleSetManualCookie}
                                disabled={!manualCookie.trim()}
                                className={`flex-1 border border-border px-4 py-3`}
                            >
                                <Text
                                    className={`text-center text-sm ${
                                        manualCookie.trim()
                                            ? "text-white"
                                            : "text-text-tertiary"
                                    }`}
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={16}
                                    />{" "}
                                    SET COOKIE
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleClearCookie}
                                className="flex-1 border border-status-error px-4 py-3"
                            >
                                <Text
                                    className="text-center text-sm text-status-error"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    <Ionicons name="trash" size={16} /> CLEAR
                                    COOKIE
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
