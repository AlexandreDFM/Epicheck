/**
 * File Name: ActivitiesScreen.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 29/10/2025
 * Description: This is the ActivitiesScreen.tsx
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
    Image,
    Alert,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";

// import office365Auth from "../services/office365Auth";

import intraApi from "../services/intraApi";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import epitechApi from "../services/epitechApi";
import { IIntraEvent } from "../types/IIntraEvent";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
    Login: undefined;
    Activities: undefined;
    Presence: { event?: IIntraEvent };
    Settings: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ActivitiesScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [activities, setActivities] = useState<IIntraEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const eventColors: { [key: string]: string } = {
        exam: "#dd9473",
        tp: "#a48cbb",
        class: "#71adc1",
        other: "#668cb3",
        proj: "#668cb3",
    };

    const loadActivities = async () => {
        try {
            console.log("Loading today's activities...");
            const data = await epitechApi.getTodayActivities();
            console.log("Activities loaded:", data.length, "events");
            setActivities(data);
        } catch (error: any) {
            console.error("Load activities error:", error);
            console.error(
                "Error details:",
                error.response?.data || error.message,
            );

            // If session expired, prompt to re-login
            if (error.message.includes("Session expired")) {
                Alert.alert(
                    "Session Expired",
                    "Your Intranet session has expired. Please log in again.",
                    [
                        {
                            text: "Re-login",
                            onPress: async () => {
                                try {
                                    await intraApi.authenticate();
                                    loadActivities();
                                } catch (authError: any) {
                                    Alert.alert(
                                        "Error",
                                        authError.message ||
                                            "Failed to authenticate",
                                    );
                                    handleLogout();
                                }
                            },
                        },
                        {
                            text: "Logout",
                            style: "destructive",
                            onPress: handleLogout,
                        },
                    ],
                );
            } else {
                Alert.alert(
                    "Error",
                    error.message || "Failed to load activities",
                );
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadActivities();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        loadActivities();
    };

    const handleSelectActivity = (event: IIntraEvent) => {
        navigation.navigate("Presence", { event });
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
                    navigation.reset({
                        index: 0,
                        routes: [{ name: "Login" }],
                    });
                },
            },
        ]);
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    };

    const getRoomDisplay = (event: IIntraEvent) => {
        if (event.room?.code) {
            return (
                event.room.code.split("/").pop()?.replace(/-/g, " ") || "Room"
            );
        }
        if (event.room?.type) {
            return event.room.type;
        }
        return "No room";
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1">
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" />
                    <Text className="mt-4 font-semibold text-text-primary">
                        Loading activities...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="bg-primary px-4 py-5">
                <View className="mb-2 flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center">
                        <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg">
                            <Image
                                source={require("../assets/img/epicheck-icon.png")}
                                className="absolute h-10 w-10 rounded-md bg-white"
                                resizeMode="contain"
                                style={{ width: 40, height: 40 }}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-2xl font-bold text-white">
                                Today&apos;s Activities
                            </Text>
                            <Text className="text-xs text-white/80">
                                {new Date().toLocaleDateString("en-US", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => navigation.navigate("Settings")}
                            className="rounded-lg border border-white/30 bg-white/20 px-3 py-2"
                        >
                            <Ionicons name="cog" size={24} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleLogout}
                            className="rounded-lg border border-white/30 bg-white/20 px-3 py-2"
                        >
                            <Ionicons
                                name="log-out-outline"
                                size={24}
                                color="white"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick scan button */}
                <TouchableOpacity
                    onPress={() => navigation.navigate("Presence", {})}
                    className="mt-3 rounded-lg border border-white/30 bg-white/20 px-4 py-3"
                >
                    <Text className="text-center font-semibold text-white">
                        QUICK SCAN (NO EVENT)
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Activities List */}
            <ScrollView
                className="flex-1 bg-background"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                }
            >
                {activities.length === 0 ? (
                    <View className="flex-1 items-center justify-center py-20">
                        <Text className="mb-4 text-6xl">📅</Text>
                        <Text className="text-lg font-bold text-text-primary">
                            No activities today
                        </Text>
                        <Text className="mt-2 text-sm text-text-secondary">
                            Pull down to refresh
                        </Text>
                    </View>
                ) : (
                    <View className="p-4">
                        {activities.map((event, index) => {
                            const bgColor =
                                eventColors[event.type_code] ||
                                eventColors.other;
                            const startTime = formatTime(event.start);
                            const endTime = formatTime(event.end);
                            const room = getRoomDisplay(event);

                            return (
                                <TouchableOpacity
                                    key={`${event.codeevent}-${index}`}
                                    onPress={() => handleSelectActivity(event)}
                                    className="mb-3 overflow-hidden rounded-xl shadow-sm"
                                    style={{ backgroundColor: bgColor }}
                                >
                                    <View className="p-4">
                                        <View className="mb-2 flex-row items-start justify-between">
                                            <View className="mr-2 flex-1">
                                                <Text className="mb-1 text-lg font-bold text-white">
                                                    {event.acti_title}
                                                    {event.nb_group &&
                                                    event.nb_group > 1
                                                        ? ` #${event.num_event}`
                                                        : ""}
                                                </Text>
                                                <Text className="text-sm capitalize text-white/90">
                                                    {event.type_code}
                                                </Text>
                                            </View>
                                            <View className="rounded-full bg-white/20 px-3 py-1">
                                                <Text className="text-xs font-semibold text-white">
                                                    {startTime}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="mt-2 flex-row items-center">
                                            <View className="mr-2 rounded-full bg-white/20 px-3 py-1">
                                                <Text className="text-xs text-white">
                                                    📍 {room}
                                                </Text>
                                            </View>
                                            <View className="rounded-full bg-white/20 px-3 py-1">
                                                <Text className="text-xs text-white">
                                                    ⏰ {startTime} - {endTime}
                                                </Text>
                                            </View>
                                        </View>

                                        {event.rights &&
                                            event.rights.indexOf(
                                                "force_register",
                                            ) > -1 && (
                                                <View className="mt-2 self-start rounded-full bg-white/20 px-3 py-1">
                                                    <Text className="text-xs font-semibold text-white">
                                                        ⭐ Pedago Rights
                                                    </Text>
                                                </View>
                                            )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
