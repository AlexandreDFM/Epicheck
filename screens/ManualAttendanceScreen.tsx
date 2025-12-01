/**
 * File Name: ManualAttendanceScreen.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 04/11/2025
 * Description: Manual attendance screen with student list, search, and manual marking
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
    TextInput,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from "react-native";

import intraApi from "../services/intraApi";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import epitechApi from "../services/epitechApi";
import { useTheme } from "../contexts/ThemeContext";
import soundService from "../services/soundService";
import type { IIntraEvent } from "../types/IIntraEvent";
import type { IIntraStudent } from "../types/IIntraStudent";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";

type RootStackParamList = {
    Login: undefined;
    Activities: undefined;
    Presence: { event?: IIntraEvent };
    ManualAttendance: { event?: IIntraEvent };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface StudentWithPresence extends IIntraStudent {
    presenceStatus?: "present" | "absent" | "n/a";
}

export default function ManualAttendanceScreen() {
    const [filteredStudents, setFilteredStudents] = useState<
        StudentWithPresence[]
    >([]);
    const route = useRoute();
    const { isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [manualEmail, setManualEmail] = useState("");
    const navigation = useNavigation<NavigationProp>();
    const [isProcessing, setIsProcessing] = useState(false);
    const [students, setStudents] = useState<StudentWithPresence[]>([]);
    const event = (route.params as any)?.event as IIntraEvent | undefined;
    const [selectedTab, setSelectedTab] = useState<"list" | "manual">("list");

    useEffect(() => {
        soundService.initialize();
        loadStudents();
        return () => {
            soundService.cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // Filter students based on search query
        if (searchQuery.trim() === "") {
            setFilteredStudents(students);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = students.filter(
                (s) =>
                    s.login?.toLowerCase().includes(query) ||
                    s.email?.toLowerCase().includes(query) ||
                    s.title?.toLowerCase().includes(query),
            );
            setFilteredStudents(filtered);
        }
    }, [searchQuery, students]);

    const loadStudents = async () => {
        if (!event) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No event selected",
                position: "top",
            });
            navigation.goBack();
            return;
        }

        setIsLoading(true);
        try {
            const registeredStudents =
                await intraApi.getRegisteredStudents(event);

            // Map students with their current presence status
            const studentsWithPresence = registeredStudents.map((s) => ({
                ...s,
                presenceStatus: (s.present || "n/a") as
                    | "present"
                    | "absent"
                    | "n/a",
            }));

            setStudents(studentsWithPresence);
            setFilteredStudents(studentsWithPresence);
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to load student list: " + error.message,
                position: "top",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const markPresence = async (
        studentLogin: string,
        status: "present" | "absent",
    ) => {
        if (!event) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No event selected",
                position: "top",
            });
            return;
        }

        setIsProcessing(true);
        try {
            if (status === "present") {
                await intraApi.markStudentPresent(event, studentLogin);
                soundService.playSuccessSound();
            } else {
                await intraApi.markStudentAbsent(event, studentLogin);
                soundService.playSuccessSound();
            }

            // Update local state
            setStudents((prev) =>
                prev.map((s) =>
                    s.login === studentLogin
                        ? { ...s, presenceStatus: status }
                        : s,
                ),
            );

            Toast.show({
                type: "success",
                text1: "Success",
                text2: `Marked ${studentLogin} as ${status}`,
                position: "top",
            });
        } catch (error: any) {
            console.error("Failed to mark presence:", error);
            soundService.playErrorSound();
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to mark presence: " + error.message,
                position: "top",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualSubmit = async () => {
        if (!manualEmail.trim()) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Please enter an email or login",
                position: "top",
            });
            return;
        }

        if (!event) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No event selected",
                position: "top",
            });
            return;
        }

        setIsProcessing(true);
        try {
            // Try to mark presence using epitechApi (which handles the matching)
            await epitechApi.markPresence(manualEmail.trim(), event);

            soundService.playSuccessSound();
            setManualEmail("");

            // Reload students to get updated status
            await loadStudents();

            Toast.show({
                type: "success",
                text1: "Success",
                text2: `Marked ${manualEmail.trim()} as present`,
                position: "top",
            });
        } catch (error: any) {
            console.error("Failed to mark presence:", error);
            soundService.playErrorSound();
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error.message || "Failed to mark presence",
                position: "top",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const getPresenceCount = () => {
        const present = students.filter(
            (s) => s.presenceStatus === "present",
        ).length;
        const absent = students.filter(
            (s) => s.presenceStatus === "absent",
        ).length;
        const total = students.length;
        return { present, absent, total };
    };

    const { present, absent, total } = getPresenceCount();

    if (!event) {
        return (
            <SafeAreaView className="flex-1">
                <View className="flex-1 items-center justify-center p-4">
                    <Text className="text-center text-lg text-status-error">
                        No event selected. Please go back and select an
                        activity.
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="mt-4 rounded-lg bg-primary px-6 py-3"
                    >
                        <Text className="text-white">Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

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
                            <Text className="text-xl text-white">
                                Manual Attendance
                            </Text>
                            <Text className="text-xs text-white/80">
                                {event.acti_title}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={loadStudents}
                        disabled={isLoading}
                        className="border border-white/30 bg-white/20 px-4 py-2"
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Ionicons name="refresh" size={20} color="white" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View className="mb-4 flex-row bg-white/20 p-3">
                    <View className="flex-1 items-center">
                        <Text className="text-2xl text-white">{present}</Text>
                        <Text className="text-xs text-white/80">Present</Text>
                    </View>
                    <View className="flex-1 items-center border-x border-white/30">
                        <Text className="text-2xl text-white">{absent}</Text>
                        <Text className="text-xs text-white/80">Absent</Text>
                    </View>
                    <View className="flex-1 items-center">
                        <Text className="text-2xl text-white">{total}</Text>
                        <Text className="text-xs text-white/80">Total</Text>
                    </View>
                </View>

                {/* Tab Selector */}
                <View className="flex-row bg-white/20 p-1">
                    <TouchableOpacity
                        onPress={() => setSelectedTab("list")}
                        className={`flex-1 py-3 ${
                            selectedTab === "list"
                                ? isDark
                                    ? "bg-black"
                                    : "bg-white"
                                : "bg-transparent"
                        }`}
                    >
                        <Text
                            className={`text-center text-sm ${
                                selectedTab === "list"
                                    ? "text-primary"
                                    : "text-white"
                            }`}
                        >
                            STUDENT LIST
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setSelectedTab("manual")}
                        className={`flex-1 py-3 ${
                            selectedTab === "manual"
                                ? isDark
                                    ? "bg-black"
                                    : "bg-white"
                                : "bg-transparent"
                        }`}
                    >
                        <Text
                            className={`text-center text-sm ${
                                selectedTab === "manual"
                                    ? "text-primary"
                                    : "text-white"
                            }`}
                        >
                            MANUAL ENTRY
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            <View className="flex-1">
                {selectedTab === "list" ? (
                    <View className="flex-1">
                        {/* Search Bar */}
                        <View className="border-b border-border px-4 py-3">
                            <TextInput
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Search by name, email, or login..."
                                className={`border border-input-border bg-input-bg px-4 py-3 text-text-primary`}
                                autoCapitalize="none"
                                selectionColor="transparent"
                                placeholderTextColor={
                                    isDark ? "#BBBBBB" : "#666666"
                                }
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <Text className="mt-1 text-xs text-text-secondary">
                                    Found {filteredStudents.length} of {total}{" "}
                                    students
                                </Text>
                            )}
                        </View>

                        {/* Student List */}
                        {isLoading ? (
                            <View className="flex-1 items-center justify-center">
                                <ActivityIndicator size="large" />
                                <Text className="mt-4 text-text-secondary">
                                    Loading students...
                                </Text>
                            </View>
                        ) : (
                            <ScrollView className="flex-1">
                                {filteredStudents.length === 0 ? (
                                    <View className="items-center py-8">
                                        <Text className="text-center text-text-secondary">
                                            {searchQuery
                                                ? "No students found"
                                                : "No students registered"}
                                        </Text>
                                    </View>
                                ) : (
                                    filteredStudents.map((student, index) => (
                                        <View
                                            key={student.login || index}
                                            className="mb-2 border-b border-border px-4 py-3"
                                        >
                                            <View className="mb-2">
                                                <Text className="text-base text-primary">
                                                    {student.title ||
                                                        student.login}
                                                </Text>
                                                <Text className="text-sm text-text-secondary">
                                                    {student.email ||
                                                        student.login}
                                                </Text>
                                            </View>

                                            <View className="flex-row gap-2">
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        markPresence(
                                                            student.login,
                                                            "present",
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing ||
                                                        student.presenceStatus ===
                                                            "present"
                                                    }
                                                    className={`flex-1 flex-row items-center justify-center py-2.5 ${
                                                        student.presenceStatus ===
                                                        "present"
                                                            ? "border border-status-success opacity-90"
                                                            : "border border-status-success"
                                                    } ${
                                                        isProcessing
                                                            ? "opacity-50"
                                                            : "opacity-100"
                                                    }`}
                                                >
                                                    {student.presenceStatus ===
                                                    "present" ? (
                                                        <Ionicons
                                                            name="checkmark"
                                                            size={20}
                                                            color="#22c55e"
                                                        />
                                                    ) : null}
                                                    <Text className="ml-2 text-center text-sm text-status-success">
                                                        {student.presenceStatus ===
                                                        "present"
                                                            ? "Present"
                                                            : "Mark Present"}
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() =>
                                                        markPresence(
                                                            student.login,
                                                            "absent",
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing ||
                                                        student.presenceStatus ===
                                                            "absent"
                                                    }
                                                    className={`flex-1 flex-row items-center justify-center py-2.5 ${
                                                        student.presenceStatus ===
                                                        "absent"
                                                            ? "border border-status-error opacity-90"
                                                            : "border border-status-error"
                                                    } ${
                                                        isProcessing
                                                            ? "opacity-50"
                                                            : "opacity-100"
                                                    }`}
                                                >
                                                    {student.presenceStatus ===
                                                    "absent" ? (
                                                        <Ionicons
                                                            name="close"
                                                            size={20}
                                                            color="#ef4444"
                                                        />
                                                    ) : null}
                                                    <Text className="text-center text-sm text-status-error">
                                                        {student.presenceStatus ===
                                                        "absent"
                                                            ? "Absent"
                                                            : "Mark Absent"}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        )}
                    </View>
                ) : (
                    <View className="flex-1 p-4">
                        <View className="border border-primary p-4">
                            <Text className="mb-2 text-base text-primary">
                                Enter Student Email or Login
                            </Text>
                            <Text className="mb-2 text-sm text-text-secondary">
                                Type the student&apos;s email (e.g.,
                                firstname.lastname@epitech.eu) or login to mark
                                them present.
                            </Text>
                            <Text className="mb-4 ml-4 text-sm text-text-secondary">
                                • You can enter email or login{"\n"}• The system
                                will automatically find the student{"\n"}•
                                Students must be registered for this event
                            </Text>

                            <TextInput
                                value={manualEmail}
                                onChangeText={setManualEmail}
                                placeholder="student.email@epitech.eu"
                                className={`mb-4 border border-input-border bg-input-bg px-4 py-3 text-base text-primary`}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                                editable={!isProcessing}
                            />

                            <TouchableOpacity
                                onPress={handleManualSubmit}
                                disabled={isProcessing || !manualEmail.trim()}
                                className={`py-4 ${
                                    isProcessing || !manualEmail.trim()
                                        ? "bg-text-disabled"
                                        : "bg-primary"
                                }`}
                            >
                                <Text className="text-center text-base text-white">
                                    {isProcessing
                                        ? "Processing..."
                                        : "Mark Present"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}
