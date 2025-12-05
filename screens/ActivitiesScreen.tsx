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
import Toast from "react-native-toast-message";
import epitechApi from "../services/epitechApi";
import { useState, useEffect, useRef } from "react";
import { IIntraEvent } from "../types/IIntraEvent";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AntDesign, Entypo, Ionicons } from "@expo/vector-icons";
import { useColoredUnderscore } from "../hooks/useColoredUnderscore";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
    Login: undefined;
    Activities: undefined;
    Presence: { event?: IIntraEvent };
    RdvDetails: { event: IIntraEvent };
    Settings: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ActivitiesScreen() {
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation<NavigationProp>();
    const [refreshing, setRefreshing] = useState(false);
    const { underscore, color } = useColoredUnderscore();
    const [activities, setActivities] = useState<IIntraEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const eventColors: { [key: string]: string } = {
        exam: "#dd9473",
        tp: "#a48cbb",
        class: "#71adc1",
        other: "#668cb3",
        proj: "#668cb3",
        rdv: "#f97316", // Orange for RDV/appointments
    };

    const loadActivities = async (date: Date = selectedDate) => {
        try {
            console.log("Loading activities...");
            setLoading(true);
            const data = await epitechApi.getActivitiesForDate(date);
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
                                    loadActivities(date);
                                } catch (authError: any) {
                                    Toast.show({
                                        type: "error",
                                        text1: "Error",
                                        text2:
                                            authError.message ||
                                            "Failed to authenticate",
                                        position: "top",
                                    });
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
                Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: error.message || "Failed to load activities",
                    position: "top",
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadActivities(selectedDate);
    }, [selectedDate]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadActivities(selectedDate);
    };

    const handleSelectActivity = (event: IIntraEvent) => {
        navigation.navigate("Presence", { event });
    };

    const handlePrevDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() - 1);
        setSelectedDate(newDate);
    };

    const handleNextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + 1);
        setSelectedDate(newDate);
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
                    <Text
                        className="mt-4 text-text-primary"
                        style={{ fontFamily: "IBMPlexSans" }}
                    >
                        Loading activities...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1">
            {/* FONT TEST - REMOVE AFTER DEBUGGING */}
            {/* {__DEV__ && (
                <View style={{ position: "absolute", top: 100, left: 0, right: 0, zIndex: 9999, backgroundColor: "white", opacity: 0.95 }}>
                    <FontTest />
                </View>
            )} */}

            {/* Header */}
            <View className="bg-primary px-4 py-5">
                <View className="mb-2 flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center">
                        <View className="mr-3 h-10 w-10 items-center justify-center">
                            <Image
                                source={require("../assets/img/epicheck-icon.png")}
                                className="absolute h-8 w-8 bg-white"
                                resizeMode="contain"
                                style={{ width: 32, height: 32 }}
                            />
                        </View>
                        <View className="flex-1">
                            <Text
                                className="text-2xl text-white"
                                style={{ fontFamily: "Anton" }}
                            >
                                ACTIVITIES
                                <Text style={{ color }}>{underscore}</Text>
                            </Text>
                            <View className="mt-1 flex-row items-center">
                                <TouchableOpacity
                                    onPress={handlePrevDay}
                                    className="mr-3 p-1"
                                >
                                    <AntDesign
                                        name="left"
                                        size={16}
                                        color="white"
                                    />
                                </TouchableOpacity>
                                <Text
                                    className="text-xs text-white/80"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    {selectedDate.toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </Text>
                                <TouchableOpacity
                                    onPress={handleNextDay}
                                    className="ml-3 p-1"
                                >
                                    <AntDesign
                                        name="right"
                                        size={16}
                                        color="white"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => navigation.navigate("Settings")}
                            className="border border-white/30 bg-white/20 px-2 py-2"
                        >
                            <Ionicons name="cog" size={24} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleLogout}
                            className="border border-white/30 bg-white/20 px-2 py-2"
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
                    className="mt-3 border border-white/30 bg-white/20 px-4 py-3"
                >
                    <Text
                        className="text-center text-white"
                        style={{ fontFamily: "Anton" }}
                    >
                        QUICK SCAN (NO EVENT)
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Activities List */}
            <ScrollView
                className="flex-1"
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
                        <Text
                            className="text-lg text-text-primary"
                            style={{ fontFamily: "Anton" }}
                        >
                            No activities found
                        </Text>
                        <Text
                            className="mt-2 text-sm text-text-secondary"
                            style={{ fontFamily: "IBMPlexSans" }}
                        >
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

                            // Debug: Log event rights
                            if (__DEV__) {
                                console.log(`Event: ${event.acti_title}`);
                                console.log(`Type: ${event.type_code}`);
                                console.log(`Rights:`, event.rights);
                                console.log(
                                    `Has prof_inst:`,
                                    event.rights?.includes("prof_inst"),
                                );
                                console.log(
                                    `Has assistant:`,
                                    event.rights?.includes("assistant"),
                                );
                            }

                            return (
                                <TouchableOpacity
                                    key={`${event.codeevent}-${index}`}
                                    style={{ backgroundColor: bgColor }}
                                    className="mb-3 overflow-hidden"
                                    onPress={() => {
                                        if (event.type_title === "Follow-up") {
                                            navigation.navigate("RdvDetails", {
                                                event,
                                            });
                                        } else if (
                                            event.rights?.includes(
                                                "force_register",
                                            ) !== false
                                        ) {
                                            handleSelectActivity(event);
                                        }
                                    }}
                                >
                                    <View className="p-4">
                                        <View className="mb-2 flex-row items-start justify-between">
                                            <View className="mr-2 flex-1">
                                                <Text
                                                    className="mb-1 text-lg text-white"
                                                    style={{
                                                        fontFamily: "Anton",
                                                    }}
                                                >
                                                    {event.acti_title}
                                                    {event.nb_group &&
                                                    event.nb_group > 1
                                                        ? ` #${event.num_event}`
                                                        : ""}
                                                </Text>
                                                <Text
                                                    className="text-sm capitalize text-white/90"
                                                    style={{
                                                        fontFamily:
                                                            "IBMPlexSans",
                                                    }}
                                                >
                                                    {event.type_code}
                                                </Text>
                                            </View>
                                            <View className="bg-white/20 px-3 py-1">
                                                <Text
                                                    className="text-xs text-white"
                                                    style={{
                                                        fontFamily:
                                                            "IBMPlexSansSemiBold",
                                                    }}
                                                >
                                                    <AntDesign
                                                        name="clock-circle"
                                                        size={12}
                                                    />{" "}
                                                    {startTime} - {endTime}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="flex-row">
                                            <View className="flex-row">
                                                <View className="mt-2 flex-row items-center">
                                                    <View className="bg-white/20 px-3 py-1">
                                                        <Text
                                                            className="text-xs text-white"
                                                            style={{
                                                                fontFamily:
                                                                    "IBMPlexSans",
                                                            }}
                                                        >
                                                            <Entypo
                                                                name="location-pin"
                                                                size={12}
                                                                color={"red"}
                                                            />{" "}
                                                            {room}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View className="ml-auto mt-auto flex-shrink">
                                                {/* Show if user can mark presence */}
                                                {event.rights &&
                                                event.type_code !== "rdv" &&
                                                Array.isArray(event.rights) &&
                                                event.rights.length > 0 &&
                                                event.rights.includes(
                                                    "force_register",
                                                ) &&
                                                (event.rights.includes(
                                                    "prof_inst",
                                                ) ||
                                                    event.rights.includes(
                                                        "assistant",
                                                    )) ? (
                                                    <View className="mt-2 flex-shrink self-start bg-green-500/20 px-3 py-1">
                                                        <Text
                                                            className="text-xs text-green-200"
                                                            style={{
                                                                fontFamily:
                                                                    "IBMPlexSansSemiBold",
                                                            }}
                                                        >
                                                            <AntDesign
                                                                name="check"
                                                                color="#86efac"
                                                                size={12}
                                                            />{" "}
                                                            Can mark presence
                                                        </Text>
                                                    </View>
                                                ) : event.rights &&
                                                  event.type_code !==
                                                      "Follow-up" &&
                                                  Array.isArray(event.rights) &&
                                                  event.rights.length > 0 &&
                                                  event.rights.includes(
                                                      "force_register",
                                                  ) &&
                                                  (event.rights.includes(
                                                      "prof_inst",
                                                  ) ||
                                                      event.rights.includes(
                                                          "assistant",
                                                      )) ? (
                                                    <View className="mt-2 flex-shrink self-start bg-green-500/20 px-3 py-1">
                                                        <Text
                                                            className="text-xs text-green-200"
                                                            style={{
                                                                fontFamily:
                                                                    "IBMPlexSansSemiBold",
                                                            }}
                                                        >
                                                            <AntDesign
                                                                name="check"
                                                                color="#86efac"
                                                                size={12}
                                                            />{" "}
                                                            Mark students
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <View className="mt-2 flex-shrink self-start bg-gray-500/20 px-3 py-1">
                                                        <Text
                                                            className="text-xs text-gray-300"
                                                            style={{
                                                                fontFamily:
                                                                    "IBMPlexSans",
                                                            }}
                                                        >
                                                            <AntDesign
                                                                name="eye"
                                                                color="#d1d5db"
                                                                size={12}
                                                            />{" "}
                                                            View only
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
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
