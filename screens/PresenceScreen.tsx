/**
 * File Name: PresenceScreen.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 29/10/2025
 * Description: This is the PresenceScreen.tsx
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
    Platform,
    ScrollView,
    TouchableOpacity,
} from "react-native";

// import scanStore from "../services/scanStore";
// import office365Auth from "../services/office365Auth";

import intraApi from "../services/intraApi";
import { useState, useEffect } from "react";
import epitechApi from "../services/epitechApi";
import QRScanner from "../components/QRScanner";
import NFCScanner from "../components/NFCScanner";
import soundService from "../services/soundService";
import type { IIntraEvent } from "../types/IIntraEvent";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

interface Student {
    email: string;
    timestamp: string;
    status: "success" | "error";
}

type RootStackParamList = {
    Login: undefined;
    Activities: undefined;
    Presence: { event?: IIntraEvent };
    ManualAttendance: { event?: IIntraEvent };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PresenceScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();
    const [scanMode, setScanMode] = useState<"qr" | "nfc">("qr");
    const [scannedStudents, setScannedStudents] = useState<Student[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Get event from route params
    const event = (route.params as any)?.event as IIntraEvent | undefined;

    // Auto-select mode based on platform
    useEffect(() => {
        // Initialize sound service
        soundService.initialize();

        if (Platform.OS === "web") {
            setScanMode("qr");
        } else {
            // Default to NFC on mobile
            // setScanMode("nfc");
        }

        // Cleanup sound on unmount
        return () => {
            soundService.cleanup();
        };
    }, []);

    const handleScan = async (email: string) => {
        if (isProcessing) return;

        setIsProcessing(true);

        try {
            // Validate email format
            if (!email.includes("@")) {
                throw new Error("Invalid email format");
            }

            // Check if we have an event context
            if (!event) {
                throw new Error(
                    "No event selected. Please go back and select an activity first.",
                );
            }

            // Mark presence via API with event context
            await epitechApi.markPresence(email, event);

            // Play success sound
            soundService.playSuccessSound();

            // Add to scanned list
            const newStudent: Student = {
                email,
                timestamp: new Date().toLocaleTimeString(),
                status: "success",
            };

            setScannedStudents((prev) => [newStudent, ...prev]);
        } catch (error: any) {
            console.error("Error marking presence:", error);

            // Play error sound
            soundService.playErrorSound();

            // Add to scanned list with error status
            const newStudent: Student = {
                email,
                timestamp: new Date().toLocaleTimeString(),
                status: "error",
            };

            setScannedStudents((prev) => [newStudent, ...prev]);

            Alert.alert("Error", error.message || "Failed to mark presence");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                    // Only logout from Intranet (Office365 kept for later if needed)
                    await intraApi.logout();
                    epitechApi.logout();
                    // Reset navigation stack to Login
                    navigation.reset({
                        index: 0,
                        routes: [{ name: "Login" }],
                    });
                },
            },
        ]);
    };

    const clearHistory = () => {
        Alert.alert(
            "Clear History",
            "Are you sure you want to clear the scan history?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: () => setScannedStudents([]),
                },
            ],
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-epitech-gray">
            {/* Header */}
            <View className="bg-epitech-blue px-4 py-5">
                <View className="mb-4 flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center">
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="mr-3"
                        >
                            <Text className="text-2xl text-white">←</Text>
                        </TouchableOpacity>
                        <View className="flex-1">
                            <Text className="text-xl font-bold text-white">
                                {event ? event.acti_title : "Presence Scanner"}
                            </Text>
                            {event && (
                                <Text className="text-xs text-white/80">
                                    {event.type_code.toUpperCase()} •{" "}
                                    {new Date(event.start).toLocaleDateString()}
                                </Text>
                            )}
                            {!event && (
                                <Text className="text-xs text-yellow-300">
                                    ⚠️ No event selected
                                </Text>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={handleLogout}
                        className="rounded-lg border border-white/30 bg-white/20 px-4 py-2"
                    >
                        <Text className="text-sm font-semibold text-white">
                            Logout
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Mode Selector */}
                <View className="flex-row rounded-lg bg-white/20 p-1 backdrop-blur">
                    <TouchableOpacity
                        onPress={() => setScanMode("qr")}
                        className={`flex-1 rounded-md py-3 ${
                            scanMode === "qr" ? "bg-white" : "bg-transparent"
                        }`}
                    >
                        <Text
                            className={`text-center text-sm font-bold ${
                                scanMode === "qr"
                                    ? "text-epitech-blue"
                                    : "text-white"
                            }`}
                        >
                            📷 QR CODE
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setScanMode("nfc")}
                        className={`flex-1 rounded-md py-3 ${
                            scanMode === "nfc" ? "bg-white" : "bg-transparent"
                        }`}
                        disabled={Platform.OS === "web"}
                    >
                        <Text
                            className={`text-center text-sm font-bold ${
                                scanMode === "nfc"
                                    ? "text-epitech-blue"
                                    : "text-white/60"
                            }`}
                        >
                            📱 NFC CARD
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Manual Attendance Button */}
                <TouchableOpacity
                    onPress={() =>
                        navigation.navigate("ManualAttendance", { event })
                    }
                    className="mt-3 rounded-lg border-2 border-white/40 bg-white/10 py-3"
                >
                    <Text className="text-center text-sm font-bold text-white">
                        ✍️ MANUAL ATTENDANCE
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Scanner */}
            <View className="flex-1 bg-black">
                {scanMode === "qr" ? (
                    <QRScanner onScan={handleScan} isActive={!isProcessing} />
                ) : (
                    <NFCScanner onScan={handleScan} isActive={!isProcessing} />
                )}
            </View>

            {/* Scanned Students List */}
            <View
                className="border-t-2 border-epitech-blue bg-white"
                style={{ maxHeight: 250 }}
            >
                <View className="flex-row items-center justify-between border-b border-gray-300 bg-epitech-gray px-4 py-3">
                    <View>
                        <Text className="text-base font-bold text-epitech-navy">
                            Recent Scans
                        </Text>
                        <Text className="text-xs text-epitech-gray-dark">
                            {scannedStudents.length} student
                            {scannedStudents.length !== 1 ? "s" : ""} checked
                        </Text>
                    </View>
                    {scannedStudents.length > 0 && (
                        <TouchableOpacity
                            onPress={clearHistory}
                            className="rounded-md bg-red-50 px-3 py-1.5"
                        >
                            <Text className="text-sm font-semibold text-red-600">
                                Clear All
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView className="px-4 py-2">
                    {scannedStudents.length === 0 ? (
                        <View className="items-center py-8">
                            <Text className="text-center text-sm text-gray-400">
                                No scans yet
                            </Text>
                            <Text className="mt-1 text-center text-xs text-gray-400">
                                Start scanning student cards to mark presence
                            </Text>
                        </View>
                    ) : (
                        scannedStudents.map((student, index) => (
                            <View
                                key={index}
                                className={`mb-2 rounded-lg border p-3.5 ${
                                    student.status === "success"
                                        ? "border-green-200 bg-green-50"
                                        : "border-red-200 bg-red-50"
                                }`}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="mr-2 flex-1">
                                        <View className="flex-row items-center">
                                            <View
                                                className={`mr-2 h-2 w-2 rounded-full ${
                                                    student.status === "success"
                                                        ? "bg-green-500"
                                                        : "bg-red-500"
                                                }`}
                                            />
                                            <Text
                                                className={`text-sm font-semibold ${
                                                    student.status === "success"
                                                        ? "text-green-800"
                                                        : "text-red-800"
                                                }`}
                                                numberOfLines={1}
                                            >
                                                {student.email}
                                            </Text>
                                        </View>
                                        <Text className="ml-4 mt-0.5 text-xs text-gray-500">
                                            {student.status === "success"
                                                ? "Presence marked"
                                                : "Failed to mark"}
                                        </Text>
                                    </View>
                                    <Text className="text-xs font-medium text-gray-600">
                                        {student.timestamp}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}
