/**
 * File Name: LoginScreen.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 29/10/2025
 * Description: This is the LoginScreen.tsx
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
    Modal,
    Platform,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
} from "react-native";

// import epitechApi from "../services/epitechApi";
// import office365Auth from "../services/office365Auth";

import intraApi from "../services/intraApi";
import AppTitle from "../components/AppTitle";
import intraAuth from "../services/intraAuth";
import IntraWebViewAuth from "./IntraWebViewAuth";
import { useTheme } from "../contexts/ThemeContext";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import { useColoredUnderscore } from "../hooks/useColoredUnderscore";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";

type RootStackParamList = {
    Login: undefined;
    Activities: undefined;
    Presence: { event?: any };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
    const { isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const navigation = useNavigation<NavigationProp>();
    const { underscore, color } = useColoredUnderscore();
    const [showWebView, setShowWebView] = useState(false);
    const hasCheckedAuthRef = useRef(false);

    // Check if user is already authenticated on mount
    const checkExistingAuth = useCallback(async () => {
        // Prevent multiple checks
        if (hasCheckedAuthRef.current) return;
        hasCheckedAuthRef.current = true;

        try {
            setIsLoading(true);
            const isAuthenticated = await intraAuth.isAuthenticated();

            if (isAuthenticated) {
                console.log(
                    "User already authenticated, navigating to Activities...",
                );
                const userInfo = await intraApi.getCurrentUser();

                // Navigate to Activities screen
                navigation.replace("Activities");
                // Show toast after navigation completes
                requestAnimationFrame(() => {
                    Toast.show({
                        type: "success",
                        text1: "Welcome Back",
                        text2: `Hello ${userInfo.title || userInfo.login}!`,
                        position: "top",
                    });
                });
            }
        } catch (error) {
            console.error("Auth check error:", error);
            // If there's an error, just stay on login screen
        } finally {
            setIsLoading(false);
        }
    }, [navigation]);

    useEffect(() => {
        checkExistingAuth();
    }, [checkExistingAuth]);

    const handleIntranetLogin = () => {
        // Show WebView modal for authentication
        setShowWebView(true);
    };

    const handleAuthSuccess = async (cookie: string) => {
        setShowWebView(false);
        setIsLoading(true);

        try {
            console.log("Cookie received, setting it...");

            // Set the cookie
            await intraAuth.setIntraCookie(cookie);

            // Get user info to verify login
            const userInfo = await intraApi.getCurrentUser();
            console.log("User info:", userInfo);

            // Navigate to Activities screen
            setIsLoading(false);
            navigation.replace("Activities");
            // Show toast after navigation completes
            requestAnimationFrame(() => {
                Toast.show({
                    type: "success",
                    text1: "Success",
                    text2: `Welcome ${userInfo.title || userInfo.login}!`,
                    position: "top",
                });
            });
        } catch (error: any) {
            setIsLoading(false);
            Toast.show({
                type: "error",
                text1: "Login Failed",
                text2:
                    error.message ||
                    "Failed to authenticate with Epitech Intranet",
                position: "top",
            });
        }
    };

    const handleAuthCancel = () => {
        setShowWebView(false);
        Toast.show({
            type: "info",
            text1: "Cancelled",
            text2: "Authentication was cancelled",
            position: "top",
        });
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
        >
            {/* WebView Authentication Modal */}
            <Modal
                visible={showWebView}
                animationType="slide"
                presentationStyle="fullScreen"
                backdropColor={isDark ? "#121212" : "#FFFFFF"}
            >
                <IntraWebViewAuth
                    onSuccess={handleAuthSuccess}
                    onCancel={handleAuthCancel}
                />
            </Modal>

            <View className="flex-1 justify-center px-8">
                {/* Logo Section */}
                <View className="mb-12 items-center">
                    <View className="mb-4 h-20 w-20 items-center justify-center">
                        <Image
                            source={require("../assets/img/epicheck-icon.png")}
                            className="absolute h-20 w-20"
                            resizeMode="contain"
                            style={{ width: 80, height: 80 }}
                        />
                    </View>
                    <AppTitle className="mb-1 text-3xl text-primary">
                        EPICHECK
                        <Text style={{ color }} className="text-3xl">
                            {underscore}
                        </Text>
                    </AppTitle>
                    <Text className="text-center text-sm text-text-secondary">
                        Student Presence Management Application
                    </Text>
                </View>

                <View className="p-8">
                    {/* Intranet Login Button */}
                    <TouchableOpacity
                        onPress={handleIntranetLogin}
                        disabled={isLoading}
                        className={`flex-row items-center justify-center py-4 ${
                            isLoading ? "bg-text-disabled" : "bg-primary"
                        }`}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text
                                    className="text-base uppercase tracking-wide text-white"
                                    style={{ fontFamily: "IBMPlexSansBold" }}
                                >
                                    Sign in with Epitech Intranet
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Footer */}
                    <Text
                        className="mt-4 text-center text-xs text-text-tertiary"
                        style={{ fontFamily: "IBMPlexSans" }}
                    >
                        Uses your Office365 credentials through the Epitech
                        Intranet
                    </Text>
                </View>

                {/* Bottom Info */}
                <Text
                    className="mt-8 text-center text-xs text-text-disabled"
                    style={{ fontFamily: "IBMPlexSans" }}
                >
                    Powered by Epitech
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}
