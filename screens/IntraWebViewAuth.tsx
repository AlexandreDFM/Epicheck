/**
 * File Name: IntraWebViewAuth.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 29/10/2025
 * Description: This is the IntraWebViewAuth.tsx
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
    ActivityIndicator,
    Alert,
    TouchableOpacity,
} from "react-native";

import { useRef, useState } from "react";
import { WebView } from "react-native-webview";
import CookieManager from "@react-native-cookies/cookies";
import { SafeAreaView } from "react-native-safe-area-context";

const INTRA_URL = "https://intra.epitech.eu";
const EPITECH_CLIENT_ID = "e05d4149-1624-4627-a5ba-7472a39e43ab";
const OAUTH_AUTHORIZE_URL =
    "https://login.microsoftonline.com/common/oauth2/authorize";

interface IntraWebViewAuthProps {
    onSuccess: (cookie: string) => void;
    onCancel: () => void;
}

export default function IntraWebViewAuth({
    onSuccess,
    onCancel,
}: IntraWebViewAuthProps) {
    const webViewRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [currentUrl, setCurrentUrl] = useState("");

    // Build OAuth URL that redirects to Intranet
    const authUrl = `${OAUTH_AUTHORIZE_URL}?response_type=code&client_id=${EPITECH_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        `${INTRA_URL}/auth/office365`
    )}&state=${encodeURIComponent("/")}`;

    const extractCookie = async (url: string) => {
        try {
            console.log("Extracting cookies from:", url);

            // Get all cookies for intra.epitech.eu
            const cookies = await CookieManager.get(INTRA_URL);
            console.log("Cookies found:", Object.keys(cookies));

            // Look for 'user' cookie
            if (cookies.user) {
                console.log(
                    "User cookie found:",
                    cookies.user.value.substring(0, 20) + "..."
                );
                return cookies.user.value;
            }

            return null;
        } catch (error) {
            console.error("Error extracting cookie:", error);
            return null;
        }
    };

    const handleNavigationStateChange = async (navState: any) => {
        const { url } = navState;
        setCurrentUrl(url);
        console.log("Navigation to:", url);

        // Check if we've reached the Intranet after OAuth
        if (url.startsWith(INTRA_URL) && !url.includes("/auth/office365")) {
            console.log(
                "Reached Intranet home, attempting to extract cookie..."
            );

            // Give it a moment for cookies to be set
            setTimeout(async () => {
                const cookie = await extractCookie(url);

                if (cookie) {
                    console.log("Cookie extracted successfully");
                    onSuccess(cookie);
                } else {
                    console.warn("No cookie found, waiting a bit more...");
                    // Try again after 1 second
                    setTimeout(async () => {
                        const cookie2 = await extractCookie(url);
                        if (cookie2) {
                            console.log("Cookie extracted on second attempt");
                            onSuccess(cookie2);
                        } else {
                            Alert.alert(
                                "Error",
                                "Could not extract authentication cookie. Please try again."
                            );
                        }
                    }, 1000);
                }
            }, 500);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="bg-epitech-blue p-4 flex-row items-center justify-between">
                <View className="flex-1">
                    <Text className="text-white font-bold text-lg">
                        Epitech Login
                    </Text>
                    <Text className="text-white text-xs opacity-80">
                        Sign in with your Office365 account
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onCancel}
                    className="bg-white/20 px-4 py-2 rounded-lg"
                >
                    <Text className="text-white font-semibold">Cancel</Text>
                </TouchableOpacity>
            </View>

            {/* Loading Indicator */}
            {loading && (
                <View className="absolute top-20 left-0 right-0 items-center z-10">
                    <View className="bg-white rounded-lg p-4 shadow-lg flex-row items-center">
                        <ActivityIndicator color="#00B8D4" />
                        <Text className="ml-3 text-epitech-navy">
                            Loading...
                        </Text>
                    </View>
                </View>
            )}

            {/* Current URL Display (Dev only) */}
            {__DEV__ && currentUrl && (
                <View className="bg-gray-100 p-2">
                    <Text className="text-xs text-gray-600" numberOfLines={1}>
                        {currentUrl}
                    </Text>
                </View>
            )}

            {/* WebView */}
            <WebView
                ref={webViewRef}
                source={{ uri: authUrl }}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onNavigationStateChange={handleNavigationStateChange}
                sharedCookiesEnabled={true}
                thirdPartyCookiesEnabled={true}
                userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#00B8D4" />
                    </View>
                )}
            />
        </SafeAreaView>
    );
}
