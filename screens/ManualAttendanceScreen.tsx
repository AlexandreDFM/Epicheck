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
    Alert,
    TextInput,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import intraApi from "../services/intraApi";
import { useState, useEffect } from "react";
import epitechApi from "../services/epitechApi";
import soundService from "../services/soundService";
import type { IIntraEvent } from "../types/IIntraEvent";
import type { IIntraStudent } from "../types/IIntraStudent";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

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
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();
    const event = (route.params as any)?.event as IIntraEvent | undefined;

    const [students, setStudents] = useState<StudentWithPresence[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<StudentWithPresence[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [manualEmail, setManualEmail] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
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
                    s.title?.toLowerCase().includes(query)
            );
            setFilteredStudents(filtered);
        }
    }, [searchQuery, students]);

    const loadStudents = async () => {
        if (!event) {
            Alert.alert("Error", "No event selected");
            navigation.goBack();
            return;
        }

        setIsLoading(true);
        try {
            const registeredStudents = await intraApi.getRegisteredStudents(event);
            
            // Map students with their current presence status
            const studentsWithPresence = registeredStudents.map((s) => ({
                ...s,
                presenceStatus: (s.present || "n/a") as "present" | "absent" | "n/a",
            }));

            setStudents(studentsWithPresence);
            setFilteredStudents(studentsWithPresence);
        } catch (error: any) {
            console.error("Failed to load students:", error);
            Alert.alert("Error", "Failed to load student list: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const markPresence = async (studentLogin: string, status: "present" | "absent") => {
        if (!event) {
            Alert.alert("Error", "No event selected");
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
                        : s
                )
            );

            Alert.alert("Success", `Marked ${studentLogin} as ${status}`);
        } catch (error: any) {
            console.error("Failed to mark presence:", error);
            soundService.playErrorSound();
            Alert.alert("Error", "Failed to mark presence: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualSubmit = async () => {
        if (!manualEmail.trim()) {
            Alert.alert("Error", "Please enter an email or login");
            return;
        }

        if (!event) {
            Alert.alert("Error", "No event selected");
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
            
            Alert.alert("Success", `Marked ${manualEmail.trim()} as present`);
        } catch (error: any) {
            console.error("Failed to mark presence:", error);
            soundService.playErrorSound();
            Alert.alert("Error", error.message || "Failed to mark presence");
        } finally {
            setIsProcessing(false);
        }
    };

    const getPresenceCount = () => {
        const present = students.filter((s) => s.presenceStatus === "present").length;
        const absent = students.filter((s) => s.presenceStatus === "absent").length;
        const total = students.length;
        return { present, absent, total };
    };

    const { present, absent, total } = getPresenceCount();

    if (!event) {
        return (
            <SafeAreaView className="flex-1 bg-epitech-gray">
                <View className="flex-1 items-center justify-center p-4">
                    <Text className="text-center text-lg text-red-600">
                        No event selected. Please go back and select an activity.
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="mt-4 rounded-lg bg-epitech-blue px-6 py-3"
                    >
                        <Text className="font-semibold text-white">Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

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
                        className="rounded-lg border border-white/30 bg-white/20 px-4 py-2"
                    >
                        <Text className="text-sm font-semibold text-white">
                            {isLoading ? "..." : "↻ Refresh"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View className="mb-4 flex-row rounded-lg bg-white/20 p-3">
                    <View className="flex-1 items-center">
                        <Text className="text-2xl font-bold text-white">{present}</Text>
                        <Text className="text-xs text-white/80">Present</Text>
                    </View>
                    <View className="flex-1 items-center border-x border-white/30">
                        <Text className="text-2xl font-bold text-white">{absent}</Text>
                        <Text className="text-xs text-white/80">Absent</Text>
                    </View>
                    <View className="flex-1 items-center">
                        <Text className="text-2xl font-bold text-white">{total}</Text>
                        <Text className="text-xs text-white/80">Total</Text>
                    </View>
                </View>

                {/* Tab Selector */}
                <View className="flex-row rounded-lg bg-white/20 p-1">
                    <TouchableOpacity
                        onPress={() => setSelectedTab("list")}
                        className={`flex-1 rounded-md py-3 ${
                            selectedTab === "list" ? "bg-white" : "bg-transparent"
                        }`}
                    >
                        <Text
                            className={`text-center text-sm font-bold ${
                                selectedTab === "list"
                                    ? "text-epitech-blue"
                                    : "text-white"
                            }`}
                        >
                            📋 Student List
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setSelectedTab("manual")}
                        className={`flex-1 rounded-md py-3 ${
                            selectedTab === "manual" ? "bg-white" : "bg-transparent"
                        }`}
                    >
                        <Text
                            className={`text-center text-sm font-bold ${
                                selectedTab === "manual"
                                    ? "text-epitech-blue"
                                    : "text-white"
                            }`}
                        >
                            ✍️ Manual Entry
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            <View className="flex-1">
                {selectedTab === "list" ? (
                    <View className="flex-1">
                        {/* Search Bar */}
                        <View className="border-b border-gray-300 bg-white px-4 py-3">
                            <TextInput
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Search by name, email, or login..."
                                className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-base"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <Text className="mt-1 text-xs text-gray-600">
                                    Found {filteredStudents.length} of {total} students
                                </Text>
                            )}
                        </View>

                        {/* Student List */}
                        {isLoading ? (
                            <View className="flex-1 items-center justify-center">
                                <ActivityIndicator size="large" color="#1d4ed8" />
                                <Text className="mt-4 text-gray-600">
                                    Loading students...
                                </Text>
                            </View>
                        ) : (
                            <ScrollView className="flex-1 bg-gray-50">
                                {filteredStudents.length === 0 ? (
                                    <View className="items-center py-8">
                                        <Text className="text-center text-gray-600">
                                            {searchQuery
                                                ? "No students found"
                                                : "No students registered"}
                                        </Text>
                                    </View>
                                ) : (
                                    filteredStudents.map((student, index) => (
                                        <View
                                            key={student.login || index}
                                            className="mb-2 border-b border-gray-200 bg-white px-4 py-3"
                                        >
                                            <View className="mb-2">
                                                <Text className="text-base font-semibold text-gray-900">
                                                    {student.title || student.login}
                                                </Text>
                                                <Text className="text-sm text-gray-600">
                                                    {student.email || student.login}
                                                </Text>
                                            </View>

                                            <View className="flex-row gap-2">
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        markPresence(
                                                            student.login,
                                                            "present"
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing ||
                                                        student.presenceStatus === "present"
                                                    }
                                                    className={`flex-1 rounded-lg py-2.5 ${
                                                        student.presenceStatus === "present"
                                                            ? "bg-green-600"
                                                            : "bg-green-500"
                                                    } ${
                                                        isProcessing
                                                            ? "opacity-50"
                                                            : "opacity-100"
                                                    }`}
                                                >
                                                    <Text className="text-center text-sm font-semibold text-white">
                                                        {student.presenceStatus === "present"
                                                            ? "✓ Present"
                                                            : "Mark Present"}
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() =>
                                                        markPresence(
                                                            student.login,
                                                            "absent"
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing ||
                                                        student.presenceStatus === "absent"
                                                    }
                                                    className={`flex-1 rounded-lg py-2.5 ${
                                                        student.presenceStatus === "absent"
                                                            ? "bg-red-600"
                                                            : "bg-red-500"
                                                    } ${
                                                        isProcessing
                                                            ? "opacity-50"
                                                            : "opacity-100"
                                                    }`}
                                                >
                                                    <Text className="text-center text-sm font-semibold text-white">
                                                        {student.presenceStatus === "absent"
                                                            ? "✗ Absent"
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
                    <View className="flex-1 bg-white p-4">
                        <Text className="mb-2 text-base font-semibold text-gray-900">
                            Enter Student Email or Login
                        </Text>
                        <Text className="mb-4 text-sm text-gray-600">
                            Type the student&apos;s email (e.g., firstname.lastname@epitech.eu)
                            or login to mark them present.
                        </Text>

                        <TextInput
                            value={manualEmail}
                            onChangeText={setManualEmail}
                            placeholder="student.email@epitech.eu"
                            className="mb-4 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-base"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            editable={!isProcessing}
                        />

                        <TouchableOpacity
                            onPress={handleManualSubmit}
                            disabled={isProcessing || !manualEmail.trim()}
                            className={`rounded-lg py-4 ${
                                isProcessing || !manualEmail.trim()
                                    ? "bg-gray-400"
                                    : "bg-epitech-blue"
                            }`}
                        >
                            <Text className="text-center text-base font-semibold text-white">
                                {isProcessing ? "Processing..." : "Mark Present"}
                            </Text>
                        </TouchableOpacity>

                        <View className="mt-6 rounded-lg bg-blue-50 p-4">
                            <Text className="mb-2 text-sm font-semibold text-blue-900">
                                💡 Tips:
                            </Text>
                            <Text className="text-sm text-blue-800">
                                • You can enter email or login{"\n"}
                                • The system will automatically find the student{"\n"}
                                • Students must be registered for this event
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}
