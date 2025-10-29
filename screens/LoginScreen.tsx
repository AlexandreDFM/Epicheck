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
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from "react-native";

// import epitechApi from "../services/epitechApi";
// import office365Auth from "../services/office365Auth";

import { useState } from "react";
import intraApi from "../services/intraApi";
import intraAuth from "../services/intraAuth";
import IntraWebViewAuth from "./IntraWebViewAuth";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
    Login: undefined;
    Activities: undefined;
    Presence: { event?: any };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [isLoading, setIsLoading] = useState(false);
    const [showWebView, setShowWebView] = useState(false);

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
            setTimeout(() => {
                navigation.replace("Activities");
                // Show success after navigation
                setTimeout(() => {
                    Alert.alert("Success", `Welcome ${userInfo.title || userInfo.login}!`);
                }, 100);
            }, 100);
        } catch (error: any) {
            console.error("Login error:", error);
            setIsLoading(false);
            Alert.alert(
                "Login Failed",
                error.message || "Failed to authenticate with Epitech Intranet"
            );
        }
    };

    const handleAuthCancel = () => {
        setShowWebView(false);
        Alert.alert("Cancelled", "Authentication was cancelled");
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-white"
        >
            {/* WebView Authentication Modal */}
            <Modal
                visible={showWebView}
                animationType="slide"
                presentationStyle="fullScreen"
            >
                <IntraWebViewAuth
                    onSuccess={handleAuthSuccess}
                    onCancel={handleAuthCancel}
                />
            </Modal>

            <View className="flex-1 justify-center px-8">
                {/* Logo Section */}
                <View className="items-center mb-12">
                    <View className="w-20 h-20 bg-epitech-blue rounded-2xl items-center justify-center mb-4">
                        <Text className="text-white text-4xl font-bold">E</Text>
                    </View>
                    <Text className="text-3xl font-bold text-epitech-navy mb-1">
                        EpiCheck
                    </Text>
                    <Text className="text-epitech-gray-dark text-center text-sm">
                        Student Presence Management System
                    </Text>
                </View>

                <View className="bg-white rounded-2xl p-8 border border-gray-200">
                    {/* Info Section */}
                    <View className="mb-6">
                        <Text className="text-epitech-navy font-bold text-lg mb-2 text-center">
                            Sign in with Intranet
                        </Text>
                        <Text className="text-epitech-gray-dark text-center text-sm">
                            Use your Epitech account to continue
                        </Text>
                    </View>

                    {/* Epitech Logo Icon */}
                    <View className="items-center mb-6">
                        <View className="w-16 h-16 bg-epitech-blue border-2 border-epitech-blue rounded-2xl items-center justify-center">
                            <Text className="text-4xl">�</Text>
                        </View>
                    </View>

                    {/* Intranet Login Button */}
                    <TouchableOpacity
                        onPress={handleIntranetLogin}
                        disabled={isLoading}
                        className={`rounded-lg py-4 items-center flex-row justify-center ${
                            isLoading ? "bg-gray-400" : "bg-epitech-blue"
                        }`}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className="text-2xl mr-3">🔐</Text>
                                <Text className="text-white font-bold text-base uppercase tracking-wide">
                                    Sign in with Epitech
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Security Note */}
                    <View className="mt-6 bg-blue-50 p-3 rounded-lg">
                        <Text className="text-epitech-navy text-xs text-center font-medium">
                            🔒 Secure authentication via Epitech Intranet
                        </Text>
                    </View>

                    {/* Footer */}
                    <Text className="text-gray-500 text-center mt-4 text-xs">
                        Uses your Epitech Office365 credentials
                    </Text>
                </View>

                {/* Bottom Info */}
                <Text className="text-gray-400 text-center mt-8 text-xs">
                    Powered by Epitech Intranet • Secure Authentication
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}
