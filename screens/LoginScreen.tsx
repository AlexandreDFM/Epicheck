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
    Alert,
    Image,
    Modal,
    Platform,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
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
                    Alert.alert(
                        "Success",
                        `Welcome ${userInfo.title || userInfo.login}!`,
                    );
                }, 100);
            }, 100);
        } catch (error: any) {
            console.error("Login error:", error);
            setIsLoading(false);
            Alert.alert(
                "Login Failed",
                error.message || "Failed to authenticate with Epitech Intranet",
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
            className="flex-1"
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

            <View className="flex-1 justify-center bg-background px-8">
                {/* Logo Section */}
                <View className="mb-12 items-center">
                    <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl">
                        <Image
                            source={require("../assets/img/epicheck-icon.png")}
                            className="absolute h-20 w-20"
                            resizeMode="contain"
                            style={{ width: 80, height: 80 }}
                        />
                    </View>
                    <Text className="mb-1 text-3xl font-bold text-text-primary">
                        EpiCheck
                    </Text>
                    <Text className="text-center text-sm text-text-secondary">
                        Student Presence Management Application
                    </Text>
                </View>

                <View className="rounded-2xl border border-card-border bg-card-bg p-8">
                    {/* Info Section */}

                    {/* Intranet Login Button */}
                    <TouchableOpacity
                        onPress={handleIntranetLogin}
                        disabled={isLoading}
                        className={`flex-row items-center justify-center rounded-lg py-4 ${
                            isLoading ? "bg-text-disabled" : "bg-primary"
                        }`}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className="text-base font-bold uppercase tracking-wide text-white">
                                    Sign in with Epitech Intranet
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Footer */}
                    <Text className="mt-4 text-center text-xs text-text-tertiary">
                        Uses your Office365 credentials through the Epitech
                        Intranet
                    </Text>
                </View>

                {/* Bottom Info */}
                <Text className="mt-8 text-center text-xs text-text-disabled">
                    Powered by Epitech
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}
