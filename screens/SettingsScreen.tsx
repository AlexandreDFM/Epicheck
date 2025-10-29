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
} from "react-native";

import { useState, useEffect } from "react";
import soundService from "../services/soundService";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
    Login: undefined;
    Activities: undefined;
    Presence: undefined;
    Settings: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [hasCustomSuccess, setHasCustomSuccess] = useState(false);
    const [hasCustomError, setHasCustomError] = useState(false);

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

            Alert.alert("Success", "Custom success sound imported!");
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to import sound");
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

            Alert.alert("Success", "Custom error sound imported!");
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to import sound");
        }
    };

    const handleResetSuccessSound = () => {
        Alert.alert(
            "Reset Success Sound",
            "Reset to default sound?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        await soundService.resetSuccessSound();
                        setHasCustomSuccess(false);
                        Alert.alert("Success", "Sound reset to default");
                    },
                },
            ]
        );
    };

    const handleResetErrorSound = () => {
        Alert.alert(
            "Reset Error Sound",
            "Reset to default sound?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        await soundService.resetErrorSound();
                        setHasCustomError(false);
                        Alert.alert("Success", "Sound reset to default");
                    },
                },
            ]
        );
    };

    const handleTestSuccessSound = async () => {
        await soundService.playSuccessSound();
    };

    const handleTestErrorSound = async () => {
        await soundService.playErrorSound();
    };

    return (
        <SafeAreaView className="flex-1 bg-epitech-gray">
            {/* Header */}
            <View className="bg-epitech-blue px-4 py-5">
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="mr-3"
                    >
                        <Text className="text-white text-2xl">←</Text>
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold">
                        Settings
                    </Text>
                </View>
            </View>

            <ScrollView className="flex-1">
                {/* Sounds Section */}
                <View className="bg-white m-4 rounded-lg shadow-sm">
                    <View className="p-4 border-b border-gray-200">
                        <Text className="text-epitech-navy text-lg font-bold">
                            🔊 Sound Settings
                        </Text>
                        <Text className="text-gray-600 text-xs mt-1">
                            Customize success and error sounds
                        </Text>
                    </View>

                    {/* Success Sound */}
                    <View className="p-4 border-b border-gray-200">
                        <View className="flex-row justify-between items-center mb-3">
                            <View className="flex-1">
                                <Text className="text-epitech-navy font-semibold">
                                    Success Sound
                                </Text>
                                <Text className="text-gray-500 text-xs mt-0.5">
                                    {hasCustomSuccess ? "Custom" : "Default"}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleTestSuccessSound}
                                className="bg-epitech-blue px-4 py-2 rounded-lg"
                            >
                                <Text className="text-white font-semibold text-sm">
                                    🔊 Test
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={handleImportSuccessSound}
                                className="flex-1 bg-green-50 border border-green-200 px-4 py-3 rounded-lg"
                            >
                                <Text className="text-green-700 font-semibold text-center text-sm">
                                    📁 Import Sound
                                </Text>
                            </TouchableOpacity>

                            {hasCustomSuccess && (
                                <TouchableOpacity
                                    onPress={handleResetSuccessSound}
                                    className="flex-1 bg-red-50 border border-red-200 px-4 py-3 rounded-lg"
                                >
                                    <Text className="text-red-700 font-semibold text-center text-sm">
                                        ↺ Reset
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Error Sound */}
                    <View className="p-4">
                        <View className="flex-row justify-between items-center mb-3">
                            <View className="flex-1">
                                <Text className="text-epitech-navy font-semibold">
                                    Error Sound
                                </Text>
                                <Text className="text-gray-500 text-xs mt-0.5">
                                    {hasCustomError ? "Custom" : "Default"}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleTestErrorSound}
                                className="bg-red-500 px-4 py-2 rounded-lg"
                            >
                                <Text className="text-white font-semibold text-sm">
                                    🔊 Test
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={handleImportErrorSound}
                                className="flex-1 bg-green-50 border border-green-200 px-4 py-3 rounded-lg"
                            >
                                <Text className="text-green-700 font-semibold text-center text-sm">
                                    📁 Import Sound
                                </Text>
                            </TouchableOpacity>

                            {hasCustomError && (
                                <TouchableOpacity
                                    onPress={handleResetErrorSound}
                                    className="flex-1 bg-red-50 border border-red-200 px-4 py-3 rounded-lg"
                                >
                                    <Text className="text-red-700 font-semibold text-center text-sm">
                                        ↺ Reset
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                {/* Info Card */}
                <View className="bg-blue-50 border border-blue-200 m-4 p-4 rounded-lg">
                    <Text className="text-blue-900 font-semibold mb-2">
                        💡 Tips
                    </Text>
                    <Text className="text-blue-800 text-xs leading-relaxed">
                        • Supported formats: MP3, WAV, M4A{"\n"}
                        • Custom sounds are stored locally{"\n"}
                        • Test sounds before using in production{"\n"}
                        • Reset to default anytime
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
