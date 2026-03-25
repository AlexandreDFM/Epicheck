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

import { useState, useEffect } from "react";
import Toast from "react-native-toast-message";
import epitechApi from "../services/epitechApi";
import QRScanner from "../components/QRScanner";
import NFCScanner from "../components/NFCScanner";
import { useTheme } from "../contexts/ThemeContext";
import soundService from "../services/soundService";
import type { IIntraEvent } from "../types/IIntraEvent";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useColoredUnderscore } from "../hooks/useColoredUnderscore";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

interface Student {
    email: string;
    timestamp: string;
    status: "success" | "error" | "pending";
}

type RootStackParamList = {
    Login: undefined;
    Activities: undefined;
    Presence: { event?: IIntraEvent };
    ManualAttendance: { event?: IIntraEvent };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PresenceScreen() {
    const route = useRoute();
    const { isDark } = useTheme();
    const navigation = useNavigation<NavigationProp>();
    const { underscore, color } = useColoredUnderscore();
    const [isBatchMode, setIsBatchMode] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [scanMode, setScanMode] = useState<"qr" | "nfc">("qr");
    const [scannedStudents, setScannedStudents] = useState<Student[]>([]);

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

    const handleRegisterModeToggle = () => {
        if (isRegisterMode) {
            setIsRegisterMode(!isRegisterMode);
            return;
        }
        Alert.alert(
            "Confirm Mode Switch",
            "Are you sure you want to switch to Register Mode? \n" +
                "In Register Mode, students not registered for the activity " +
                "will be automatically registered to the module and to the activity.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: () => setIsRegisterMode(!isRegisterMode),
                },
            ],
        );
    };

    const handleCameraToggle = () => {
        setIsCameraActive((prev) => !prev);
    };
    const pendingCount = scannedStudents.filter(
        (s) => s.status === "pending",
    ).length;

    const handleScan = async (email: string) => {
        // Validate email format
        if (!email.includes("@")) {
            soundService.playErrorSound();
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Invalid email format",
                position: "top",
            });
            return;
        }

        // Check if we have an event context
        if (!event) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No event selected. Please go back and select an activity first.",
                position: "top",
            });
            return;
        }

        // Prevent duplicate scans
        if (
            scannedStudents.some(
                (s) =>
                    s.email === email &&
                    (s.status === "pending" || s.status === "success"),
            )
        ) {
            soundService.playErrorSound();
            Toast.show({
                type: "info",
                text1: "Already scanned",
                text2: `${email} is already in the list`,
                position: "top",
            });
            return;
        }

        if (isBatchMode) {
            // Batch mode: just add to queue as pending, no API call yet
            soundService.playSuccessSound();
            const newStudent: Student = {
                email,
                timestamp: new Date().toLocaleTimeString(),
                status: "pending",
            };
            setScannedStudents((prev) => [newStudent, ...prev]);
        } else {
            // One-by-one mode: immediate API call (original behavior)
            if (isProcessing) return;
            setIsProcessing(true);

            try {
                // Register student via API if in register mode
                const checking = await epitechApi.isStudentRegisteredOnModule(
                    email,
                    event,
                );
                if (isRegisterMode && !checking) {
                    await epitechApi.forceRegisterStudentModule(email, event);
                    await epitechApi.forceRegisterStudentEvent(email, event);
                } else if (isRegisterMode && checking) {
                    await epitechApi.forceRegisterStudentEvent(email, event);
                }

                // Mark presence via API with event context
                await epitechApi.markPresence(email, event);

                soundService.playSuccessSound();
                const newStudent: Student = {
                    email,
                    timestamp: new Date().toLocaleTimeString(),
                    status: "success",
                };
                setScannedStudents((prev) => [newStudent, ...prev]);
            } catch (error: any) {
                console.error("Error marking presence:", error);
                soundService.playErrorSound();
                const newStudent: Student = {
                    email,
                    timestamp: new Date().toLocaleTimeString(),
                    status: "error",
                };
                setScannedStudents((prev) => [newStudent, ...prev]);
                Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: error.message || "Failed to mark presence",
                    position: "top",
                });
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleBatchSend = async () => {
        if (!event || isProcessing) return;

        const pendingEmails = scannedStudents
            .filter((s) => s.status === "pending")
            .map((s) => s.email);

        if (pendingEmails.length === 0) {
            Toast.show({
                type: "info",
                text1: "Nothing to send",
                text2: "No pending students to mark",
                position: "top",
            });
            return;
        }

        setIsProcessing(true);

        try {
            const results = await epitechApi.markPresenceBatch(
                pendingEmails,
                event,
                { registerMode: isRegisterMode },
            );

            // Update student statuses based on results
            setScannedStudents((prev) =>
                prev.map((student) => {
                    if (student.status !== "pending") return student;
                    const result = results.find(
                        (r) => r.email === student.email,
                    );
                    if (!result) return student;
                    return {
                        ...student,
                        status: result.success ? "success" : "error",
                        timestamp: new Date().toLocaleTimeString(),
                    };
                }),
            );

            const successCount = results.filter((r) => r.success).length;
            const errorCount = results.filter((r) => !r.success).length;

            if (errorCount === 0) {
                soundService.playSuccessSound();
                Toast.show({
                    type: "success",
                    text1: "Batch Complete",
                    text2: `${successCount} student${successCount !== 1 ? "s" : ""} marked present`,
                    position: "top",
                });
            } else {
                soundService.playErrorSound();
                Toast.show({
                    type: "error",
                    text1: "Batch Partial",
                    text2: `${successCount} success, ${errorCount} failed`,
                    position: "top",
                });
            }
        } catch (error: any) {
            console.error("Batch send error:", error);
            soundService.playErrorSound();
            Toast.show({
                type: "error",
                text1: "Batch Failed",
                text2: error.message || "Failed to send batch",
                position: "top",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const clearHistory = () => {
        setScannedStudents([]);
        Toast.show({
            type: "info",
            text1: "Scan history cleared",
            position: "top",
        });
    };

    return (
        <SafeAreaView className="flex-1">
            {/* Header */}
            <View className="bg-primary px-4 py-5">
                <View className="mb-4 flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center">
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="mr-3"
                        >
                            <Ionicons
                                name="arrow-back"
                                size={24}
                                color="white"
                            />
                        </TouchableOpacity>
                        <View className="flex-1">
                            <Text
                                className="text-lg text-white"
                                style={{ fontFamily: "Anton" }}
                            >
                                {event ? (
                                    event.acti_title.length > 35 ? (
                                        event.acti_title.substring(0, 32) +
                                        "..."
                                    ) : (
                                        event.acti_title
                                    )
                                ) : (
                                    <Text>
                                        PRESENCE SCANNER
                                        <Text style={{ color }}>
                                            {underscore}
                                        </Text>
                                    </Text>
                                )}
                            </Text>
                            {event && (
                                <Text
                                    className="text-xs text-white/80"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    {event.type_code.toUpperCase() +
                                        " - " +
                                        new Date(
                                            event.start,
                                        ).toLocaleDateString()}
                                </Text>
                            )}
                            {!event && (
                                <Text
                                    className="text-xs text-status-warning"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    <AntDesign name="warning" size={12} /> No
                                    event selected
                                </Text>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleRegisterModeToggle()}
                        className={`ml-2 border px-2 py-2 ${isRegisterMode ? "border-purple-400/50 bg-purple-500/30" : "border-yellow-500/50 bg-yellow-500/30"}`}
                    >
                        {isRegisterMode ? (
                            <Ionicons
                                name="person"
                                size={24}
                                color="rgba(192,132,252,0.75)"
                            />
                        ) : (
                            <Ionicons
                                name="people-circle-outline"
                                size={24}
                                color="rgba(234,179,8,0.76)"
                            />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleCameraToggle}
                        className={`ml-2 border px-2 py-2 ${isCameraActive ? "border-green-400/50 bg-green-500/30" : "border-red-400/50 bg-red-500/30"}`}
                    >
                        {isCameraActive ? (
                            <Ionicons
                                name="videocam"
                                size={24}
                                color="rgba(50,255,50,0.75)"
                            />
                        ) : (
                            <Ionicons
                                name="videocam-off"
                                size={24}
                                color="rgba(248,113,113,0.76)"
                            />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setIsBatchMode(!isBatchMode)}
                        className={`ml-2 border px-2 py-2 ${
                            isBatchMode
                                ? "border-green-400/50 bg-green-500/30"
                                : "border-white/30 bg-white/20"
                        }`}
                    >
                        <Ionicons
                            name={isBatchMode ? "layers" : "layers-outline"}
                            size={24}
                            color={
                                isBatchMode ? "rgba(50,255,50,0.85)" : "white"
                            }
                        />
                    </TouchableOpacity>
                </View>

                {/* Mode Selector */}
                <View className="flex-row border border-white/30 bg-white/20 p-1 backdrop-blur">
                    {/* <TouchableOpacity
                        onPress={() => setScanMode("qr")}
                        className={`flex-1 py-3 ${
                            scanMode === "qr"
                                ? isDark
                                    ? "bg-black"
                                    : "bg-white"
                                : "bg-transparent"
                        }`}
                    >
                        <Text
                            className={`text-center text-sm ${
                                scanMode === "qr"
                                    ? "text-primary"
                                    : isDark
                                      ? "text-black"
                                      : "text-white"
                            }`}
                            style={{ fontFamily: "Anton" }}
                        >
                            QR CODE
                        </Text>
                    </TouchableOpacity> */}

                    {/* <TouchableOpacity
                        onPress={() => setScanMode("nfc")}
                        className={`flex-1 py-3 ${
                            scanMode === "nfc"
                                ? isDark
                                    ? "bg-black"
                                    : "bg-white"
                                : "bg-transparent"
                        }`}
                        // disabled={Platform.OS === "web"}
                        disabled={true}
                    >
                        <Text
                            className={`text-center text-sm ${
                                scanMode === "nfc"
                                    ? "text-primary"
                                    : isDark
                                      ? "text-black/60"
                                      : "text-white/60"
                            }`}
                            style={{ fontFamily: "Anton" }}
                        >
                            NFC CARD
                        </Text>
                    </TouchableOpacity> */}
                    {/* Manual Attendance Button */}
                    <TouchableOpacity
                        onPress={() =>
                            navigation.navigate("ManualAttendance", { event })
                        }
                        className={`flex-1 py-3`}
                    >
                        <Text
                            className={`text-center text-sm text-white`}
                            style={{ fontFamily: "Anton" }}
                        >
                            MANUAL ATTENDANCE
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Scanner */}
            <View className="flex-1 bg-black">
                {scanMode === "qr" ? (
                    <QRScanner
                        onScan={handleScan}
                        isActive={isCameraActive && !isProcessing}
                    />
                ) : (
                    <NFCScanner
                        onScan={handleScan}
                        isActive={isCameraActive && !isProcessing}
                    />
                )}
            </View>

            {/* Scanned Students List */}
            <View
                className={`border-t-2 border-primary ${isDark ? "bg-surface-dark" : "bg-surface"}`}
            >
                <View className="flex-row items-center justify-between px-4 py-3">
                    <View>
                        <Text className="text-base text-primary">
                            {isBatchMode ? "Batch Queue" : "Recent Scans"}
                        </Text>
                        <Text
                            className="text-xs text-text-tertiary"
                            style={{ fontFamily: "IBMPlexSans" }}
                        >
                            {scannedStudents.length} student
                            {scannedStudents.length !== 1 ? "s" : ""}{" "}
                            {isBatchMode && pendingCount > 0
                                ? `(${pendingCount} pending)`
                                : "checked"}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                            disabled={isProcessing || !(isBatchMode && pendingCount > 0)}
                            onPress={handleBatchSend}
                            className={`border px-4 py-1.5 ${
                                isProcessing || !(isBatchMode && pendingCount > 0)
                                    ? "border-text-disabled bg-text-disabled"
                                    : "border-status-success bg-status-success"
                            }`}
                        >
                            <Text
                                className="text-sm text-white"
                                style={{
                                    fontFamily: "IBMPlexSansSemiBold",
                                }}
                            >
                                {isProcessing
                                    ? "Sending..."
                                    : `Send (${pendingCount})`}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={!(scannedStudents.length > 0)}
                            onPress={clearHistory}
                            className={`border ${scannedStudents.length > 0 ? "border-status-error" : "border-gray-500"} px-3 py-1.5`}
                        >
                            <Text
                                className={`text-sm ${scannedStudents.length > 0 ? "text-status-error" : "text-gray-500"}`}
                                style={{
                                    fontFamily: "IBMPlexSansSemiBold",
                                }}
                            >
                                Clear All
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View className="mx-12 border-b border-primary" />
                <ScrollView className="h-auto max-h-32 min-h-32 px-4 py-2">
                    {scannedStudents.length === 0 ? (
                        <View className="items-center py-8">
                            <Text
                                className="text-center text-sm text-text-tertiary"
                                style={{ fontFamily: "IBMPlexSans" }}
                            >
                                No scans yet
                            </Text>
                            <Text
                                className="mt-1 text-center text-xs text-text-tertiary"
                                style={{ fontFamily: "IBMPlexSans" }}
                            >
                                Start scanning student cards to mark presence
                            </Text>
                        </View>
                    ) : (
                        scannedStudents.map((student, index) => (
                            <View
                                key={`${student.email}-${student.timestamp}`}
                                className={`mb-2 border p-3.5 ${
                                    student.status === "success"
                                    ? "border-status-success"
                                    : student.status === "pending"
                                    ? "border-status-warning"
                                    : "border-status-error"
                                    }`}
                                    >
                                <View className="flex-row items-center justify-between">
                                    <View className="mr-2 flex-1">
                                        <View className="flex-row items-center">
                                            <View
                                                className={`mr-2 h-2 w-2 ${
                                                    student.status === "success"
                                                    ? "bg-status-success"
                                                    : student.status ===
                                                    "pending"
                                                    ? "bg-status-warning"
                                                    : "bg-status-error"
                                                    }`}
                                                    />
                                            <Text
                                                className={`text-sm ${
                                                    student.status === "success"
                                                    ? "text-status-success"
                                                    : student.status ===
                                                    "pending"
                                                    ? "text-status-warning"
                                                    : "text-status-error"
                                                    }`}
                                                    numberOfLines={1}
                                                    style={{
                                                        fontFamily:
                                                        "IBMPlexSansSemiBold",
                                                    }}
                                                    >
                                                {student.email}
                                            </Text>
                                        </View>
                                        <Text
                                            className="ml-4 mt-0.5 text-xs text-text-tertiary"
                                            style={{
                                                fontFamily: "IBMPlexSans",
                                            }}
                                        >
                                            {student.status === "success"
                                                ? "Presence marked"
                                                : student.status === "pending"
                                                  ? "Pending — waiting for batch send"
                                                  : "Failed to mark"}
                                        </Text>
                                    </View>
                                    <Text
                                        className="text-xs text-text-secondary"
                                        style={{ fontFamily: "IBMPlexSans" }}
                                    >
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
