/**
 * File Name: IntraWebViewAuth.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 29/10/2025
 * Description: Platform-specific authentication for Epitech Intranet
 *     - Mobile (iOS/Android): Uses WebView with automatic cookie extraction
 *     - Web: Provides manual authentication instructions
 * Copyright (c) 2025 Epitech
 * Version: 2.0.0
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
    Platform,
    TextInput,
    NativeModules,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
} from "react-native";

import { useRef, useState, useEffect } from "react";
import intraAuth from "../services/intraAuth";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useTheme } from "../contexts/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColoredUnderscore } from "../hooks/useColoredUnderscore";

const INTRA_URL = "https://intra.epitech.eu";
const EPITECH_CLIENT_ID = "e05d4149-1624-4627-a5ba-7472a39e43ab";
const OAUTH_AUTHORIZE_URL =
    "https://login.microsoftonline.com/common/oauth2/authorize";

interface IntraWebViewAuthProps {
    onSuccess: (cookie: string) => void;
    onCancel: () => void;
}

// ============================================================
// MOBILE COMPONENT - Uses react-native-webview
// ============================================================
function MobileAuthComponent({ onSuccess, onCancel, authUrl, isDark }: any) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebView = require("react-native-webview").WebView;

    const webViewRef = useRef<any>(null);
    const hasCalledSuccessRef = useRef(false);
    const [loading, setLoading] = useState(true);
    const [currentUrl, setCurrentUrl] = useState("");
    const [showManualOption, setShowManualOption] = useState(false);

    const darkModeCSS = `
        :root {
            color-scheme: dark;
        }
        html {
            filter: invert(1) hue-rotate(180deg);
            background-color: #000 !important;
        }
        img, video, [style*="background-image"] {
            filter: invert(1) hue-rotate(180deg);
        }
    `;

    const injectedJavaScript = isDark
        ? `
        (function() {
            const style = document.createElement('style');
            style.innerHTML = \`${darkModeCSS}\`;
            document.head.appendChild(style);
        })();
        true;
    `
        : "true;";

    const parseCookieString = (cookieString: string): string | null => {
        console.log(
            "[Mobile] Parsing cookie string:",
            cookieString || "(empty)",
        );

        if (!cookieString || cookieString.trim() === "") {
            console.log("[Mobile] ⚠ Cookie string is empty");
            return null;
        }

        const cookies = cookieString.split(";");
        const cookieNames = cookies.map((c) => c.trim().split("=")[0]);
        console.log("[Mobile] Cookie names found:", cookieNames.join(", "));

        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            if (name === "user") {
                console.log(
                    "[Mobile] ✓ User cookie found:",
                    value.substring(0, 20) + "...",
                );
                return value;
            }
        }

        console.log("[Mobile] ⚠ User cookie not in list");
        return null;
    };

    const tryNativeCookieExtraction = async (): Promise<string | null> => {
        try {
            console.log("[Mobile] Attempting native cookie extraction...");

            // First, check if the native module is available
            console.log("[Mobile] Checking NativeModules...");
            const { RNCookieManagerAndroid, RNCookieManagerIOS } =
                NativeModules;
            console.log(
                "[Mobile] RNCookieManagerAndroid:",
                !!RNCookieManagerAndroid,
            );
            console.log("[Mobile] RNCookieManagerIOS:", !!RNCookieManagerIOS);

            if (!RNCookieManagerAndroid && !RNCookieManagerIOS) {
                console.log(
                    "[Mobile] ⚠ Native cookie modules not found in NativeModules",
                );
                console.log(
                    "[Mobile] Available modules:",
                    Object.keys(NativeModules).filter((k) =>
                        k.toLowerCase().includes("cookie"),
                    ),
                );
                return null;
            }

            // Import the CookieManager - it's a CommonJS export, not ES6
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const CookieManagerModule = require("@react-native-cookies/cookies");

            console.log(
                "[Mobile] Module imported:",
                typeof CookieManagerModule,
            );
            console.log(
                "[Mobile] Module keys:",
                Object.keys(CookieManagerModule || {}),
            );

            if (!CookieManagerModule || !CookieManagerModule.get) {
                console.log(
                    "[Mobile] ⚠ CookieManager.get method not available",
                );
                return null;
            }

            console.log("[Mobile] Calling CookieManager.get for:", INTRA_URL);
            const cookies = await CookieManagerModule.get(INTRA_URL);

            if (!cookies) {
                console.log("[Mobile] ⚠ Cookies object is null");
                return null;
            }

            console.log(
                "[Mobile] Raw cookies object:",
                JSON.stringify(cookies, null, 2),
            );
            const cookieKeys = Object.keys(cookies);
            console.log("[Mobile] Native cookie keys:", cookieKeys.join(", "));

            if (cookies.user) {
                const cookieValue = cookies.user.value;
                console.log(
                    "[Mobile] ✓ User cookie via native API:",
                    cookieValue.substring(0, 20) + "...",
                );
                return cookieValue;
            }

            console.log("[Mobile] ⚠ User cookie not in native cookies");
            return null;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            console.log(
                "[Mobile] ❌ Native extraction exception:",
                errorMessage,
            );
            console.log(
                "[Mobile] Error stack:",
                error instanceof Error ? error.stack : "N/A",
            );
            return null;
        }
    };

    const handleWebMessage = (event: any) => {
        if (hasCalledSuccessRef.current) return;

        const data = event.nativeEvent.data;
        console.log("[Mobile] Received WebView message");

        try {
            const parsed = JSON.parse(data);
            if (parsed.cookie !== undefined) {
                console.log("[Mobile] Cookie from JS:", parsed.cookie);
                const userCookie = parseCookieString(parsed.cookie);
                if (userCookie) {
                    hasCalledSuccessRef.current = true;
                    onSuccess(userCookie);
                    return;
                }
            }
        } catch {
            // Not JSON, treat as plain cookie string
        }

        const userCookie = parseCookieString(data);
        if (userCookie) {
            console.log("[Mobile] ✓ Cookie extracted via JavaScript");
            hasCalledSuccessRef.current = true;
            onSuccess(userCookie);
        } else {
            console.log(
                "[Mobile] ⚠ Cookie empty (likely HttpOnly), trying native API...",
            );

            // Try native cookie extraction as fallback
            tryNativeCookieExtraction().then((nativeCookie) => {
                if (nativeCookie && !hasCalledSuccessRef.current) {
                    console.log("[Mobile] ✓ Success via native API!");
                    hasCalledSuccessRef.current = true;
                    onSuccess(nativeCookie);
                } else if (!nativeCookie) {
                    console.log(
                        "[Mobile] ❌ All extraction methods failed, showing manual option",
                    );
                    setTimeout(() => {
                        setShowManualOption(true);
                    }, 1000);
                }
            });
        }
    };

    const handleNavigationStateChange = (navState: any) => {
        const { url } = navState;
        setCurrentUrl(url);
        console.log("[Mobile] Navigation:", url);

        if (url.startsWith(INTRA_URL) && !url.includes("/auth/office365")) {
            console.log(
                "[Mobile] ✓ Reached Intranet, attempting cookie extraction...",
            );

            // Strategy 1: Try JavaScript extraction first (works for non-HttpOnly cookies)
            setTimeout(() => {
                const jsCode = `
                    (function() {
                        if (window.ReactNativeWebView) {
                            console.log('[WebView] Posting cookie to native');
                            window.ReactNativeWebView.postMessage(document.cookie);
                        }
                    })();
                    true;
                `;
                webViewRef.current?.injectJavaScript(jsCode);
            }, 1000);

            // Strategy 2: Try native API extraction after JS attempt
            setTimeout(() => {
                if (hasCalledSuccessRef.current) {
                    console.log(
                        "[Mobile] Success already called via other method, skipping native extraction",
                    );
                    return;
                }
                tryNativeCookieExtraction().then((nativeCookie) => {
                    if (nativeCookie && !hasCalledSuccessRef.current) {
                        console.log(
                            "[Mobile] ✓ Cookie extracted via native API (HttpOnly bypass)",
                        );
                        hasCalledSuccessRef.current = true;
                        onSuccess(nativeCookie);
                    }
                });
            }, 2000);
        }
    };

    return (
        <SafeAreaView className="flex-1">
            <View className="flex-row items-center justify-between bg-epitech-blue p-4">
                <View className="flex-1">
                    <Text
                        className="text-lg text-white"
                        style={{ fontFamily: "Anton" }}
                    >
                        Epitech Login
                    </Text>
                    <Text className="text-xs text-white opacity-80">
                        Sign in with your Office365 account
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onCancel}
                    className="rounded-lg border border-white/40 px-4 py-2"
                >
                    <Text className="text-white">Cancel</Text>
                </TouchableOpacity>
            </View>

            {loading && (
                <View className="absolute left-0 right-0 top-20 z-10 items-center">
                    <View className="flex-row items-center rounded-lg bg-surface p-4 shadow-lg">
                        <ActivityIndicator color="#00B8D4" />
                        <Text className="ml-3">Loading...</Text>
                    </View>
                </View>
            )}

            {__DEV__ && currentUrl && (
                <View className="p-2">
                    <Text
                        className="text-xs text-text-secondary"
                        numberOfLines={1}
                    >
                        {currentUrl}
                    </Text>
                </View>
            )}

            {showManualOption && (
                <View className="m-4 border-l-4 border-yellow-500 bg-yellow-500/10 p-4">
                    <Text className="mb-2 text-text-primary">
                        ⚠️ Manual Authentication Required
                    </Text>
                    <Text className="mb-3 text-sm text-text-secondary">
                        The authentication cookie is HttpOnly and cannot be
                        extracted automatically on your device.
                    </Text>
                    <Text className="mb-2 text-xs text-text-primary">
                        Why this happens:
                    </Text>
                    <Text className="mb-3 text-xs text-text-secondary">
                        • Running in Expo Go (requires custom dev build){"\n"}•
                        Native cookie module not available{"\n"}• Security
                        restrictions on HttpOnly cookies
                    </Text>
                    <Text className="mb-2 text-xs text-text-primary">
                        Solution:
                    </Text>
                    <Text className="mb-3 text-xs text-text-secondary">
                        Go to Settings → Developer Options → Enter cookie
                        manually
                    </Text>
                    <TouchableOpacity
                        onPress={onCancel}
                        className="mt-3 bg-epitech-blue px-4 py-2"
                    >
                        <Text className="text-center text-white">
                            Go to Settings
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <WebView
                ref={webViewRef}
                style={{ backgroundColor: isDark ? "#000000" : "#FFFFFF" }}
                source={{ uri: authUrl }}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onNavigationStateChange={handleNavigationStateChange}
                onMessage={handleWebMessage}
                sharedCookiesEnabled={true}
                thirdPartyCookiesEnabled={true}
                userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                injectedJavaScript={injectedJavaScript}
                renderLoading={() => (
                    <View
                        className={
                            "flex-1 items-center justify-center" +
                            (isDark ? " bg-black" : " bg-white")
                        }
                    >
                        <ActivityIndicator size="large" />
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

// ============================================================
// WEB COMPONENT - Popup-based OAuth authentication with backend session
// ============================================================
function WebAuthComponent({ onCancel, onSuccess, isDark }: any) {
    const [status, setStatus] = useState<
        "idle" | "opening" | "waiting" | "success" | "error" | "manual"
    >("idle");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [manualCookie, setManualCookie] = useState("");
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const popupRef = useRef<Window | null>(null);
    const BACKEND_URL =
        process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3001";

    const checkForAuthentication = async (sid: string) => {
        try {
            const response = await fetch(
                `${BACKEND_URL}/api/intra/session/${sid}`,
            );
            const sessionInfo = await response.json();

            console.log(
                "[Web] Session authenticated:",
                sessionInfo.authenticated,
            );

            if (sessionInfo.authenticated) {
                if (checkIntervalRef.current) {
                    clearInterval(checkIntervalRef.current);
                    checkIntervalRef.current = null;
                }

                if (popupRef.current && !popupRef.current.closed) {
                    popupRef.current.close();
                }

                setStatus("success");

                // Pass sessionId to parent (will be used for API requests)
                setTimeout(() => {
                    onSuccess(sid);
                }, 500);

                return true;
            }

            return false;
        } catch (error) {
            console.error("[Web] Error checking authentication:", error);
            return false;
        }
    };

    const handleManualCookie = async () => {
        if (!manualCookie.trim()) {
            Toast.show({
                type: "error",
                text1: "Cookie Required",
                text2: "Please paste your Intranet cookie",
            });
            return;
        }

        try {
            const sid = sessionId || localStorage.getItem("intra_session_id");
            if (!sid) {
                Toast.show({ type: "error", text1: "No session found" });
                return;
            }

            // Send cookie to backend
            await fetch(`${BACKEND_URL}/api/intra/session/${sid}/cookies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cookie: manualCookie }),
            });

            setStatus("success");
            setTimeout(() => onSuccess(sid), 500);
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Failed to save cookie",
                text2: error.message,
            });
        }
    };

    const switchToManual = () => {
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }
        if (popupRef.current) {
            popupRef.current.close();
        }
        setStatus("manual");
    };

    const startAuthFlow = async () => {
        try {
            setStatus("opening");

            const sid = localStorage.getItem("intra_session_id");
            if (!sid) {
                console.error("[Web] No session ID found");
                setStatus("error");
                return;
            }

            setSessionId(sid);
            console.log("[Web] Using session:", sid);

            // Get OAuth URL from backend
            const response = await fetch(
                `${BACKEND_URL}/api/intra/auth/start`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId: sid }),
                },
            );

            const result = await response.json();
            console.log("[Web] OAuth URL:", result.authUrl);

            // Open OAuth URL in popup window
            const popup = window.open(
                result.authUrl,
                "EpiCheck OAuth",
                "width=600,height=800,scrollbars=yes",
            );

            if (!popup) {
                console.error("[Web] Popup blocked!");
                setStatus("error");
                return;
            }

            popupRef.current = popup;
            setStatus("waiting");

            // Poll for authentication completion
            checkIntervalRef.current = setInterval(() => {
                if (popup.closed) {
                    console.log("[Web] Popup closed");
                    clearInterval(checkIntervalRef.current!);
                    checkIntervalRef.current = null;
                }
                checkForAuthentication(sid);
            }, 2000);
        } catch (error: any) {
            console.error("[Web] Auth flow error:", error);
            setStatus("error");
        }
    };

    useEffect(() => {
        startAuthFlow();

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, []);

    const handleRetry = () => {
        setStatus("idle");
        startAuthFlow();
    };

    return (
        <SafeAreaView
            className="flex-1 bg-background"
            style={{ backgroundColor: isDark ? "#242424" : "#FFFFFF" }}
        >
            {/* Header */}
            <View className="flex-row items-center justify-between bg-epitech-blue p-4">
                <TouchableOpacity
                    onPress={onCancel}
                    className="mr-4 border-2 border-white/20 px-2 py-2"
                >
                    <Ionicons name="arrow-back" size={16} color="white" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text
                        className="text-lg text-white"
                        style={{ fontFamily: "Anton" }}
                    >
                        🔐 Epitech Login
                    </Text>
                    <Text className="text-xs text-white opacity-80">
                        {status === "idle" && "Initializing..."}
                        {status === "opening" && "Opening login window..."}
                        {status === "waiting" &&
                            "Waiting for authentication..."}
                        {status === "success" && "✓ Success! Redirecting..."}
                        {status === "error" && "Authentication failed"}
                    </Text>
                </View>
            </View>

            {/* Main Content */}
            <View className="flex-1 items-center justify-center p-8">
                {(status === "idle" || status === "opening") && (
                    <View className="items-center">
                        <ActivityIndicator size="large" color="#00B8D4" />
                        <Text className="mt-4 text-center text-text-primary">
                            {status === "idle"
                                ? "Preparing..."
                                : "Opening authentication window..."}
                        </Text>
                    </View>
                )}

                {status === "waiting" && (
                    <View className="max-w-md items-center">
                        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                            <Text className="text-4xl">🔐</Text>
                        </View>
                        <Text
                            className="mb-4 text-center text-xl text-text-primary"
                            style={{ fontFamily: "Anton" }}
                        >
                            Complete Login in Browser Window
                        </Text>
                        <Text className="mb-6 text-center text-sm text-text-secondary">
                            A popup window has opened. Please complete the
                            authentication there.
                        </Text>
                        <View className="w-full rounded-lg bg-blue-50 p-4">
                            <Text className="mb-2 text-sm font-bold text-gray-700">
                                Instructions:
                            </Text>
                            <Text className="text-xs leading-relaxed text-gray-600">
                                1. Complete the login in the popup window{"\n"}
                                2. Sign in with your Office365 account{"\n"}
                                3. After successful login, close the popup{"\n"}
                                4. You'll be automatically redirected
                            </Text>
                        </View>
                        <View className="mt-6">
                            <ActivityIndicator size="small" color="#00B8D4" />
                            <Text className="mt-2 text-xs text-text-tertiary">
                                Waiting for authentication...
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={switchToManual}
                            className="mt-4 border-b border-blue-500 pb-1"
                        >
                            <Text className="text-sm text-blue-500">
                                Use Manual Cookie Entry Instead
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {status === "manual" && (
                    <View className="max-w-md items-center">
                        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
                            <Text className="text-4xl">📋</Text>
                        </View>
                        <Text
                            className="mb-4 text-center text-xl text-text-primary"
                            style={{ fontFamily: "Anton" }}
                        >
                            Manual Cookie Entry
                        </Text>
                        <View className="mb-4 w-full rounded-lg bg-yellow-50 p-4">
                            <Text className="mb-2 text-sm font-bold text-gray-700">
                                How to get your cookie:
                            </Text>
                            <Text className="text-xs leading-relaxed text-gray-600">
                                1. Open https://intra.epitech.eu in a new tab
                                {"\n"}
                                2. Sign in with Office365{"\n"}
                                3. Press F12 → Application → Cookies{"\n"}
                                4. Copy the "user" cookie value{"\n"}
                                5. Paste it below
                            </Text>
                        </View>
                        <TextInput
                            value={manualCookie}
                            onChangeText={setManualCookie}
                            placeholder="Paste your 'user' cookie here..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                            className="mb-4 w-full rounded border border-gray-300 p-3 text-sm text-text-primary"
                            style={{ minHeight: 100 }}
                        />
                        <View className="w-full flex-row gap-3">
                            <TouchableOpacity
                                onPress={handleManualCookie}
                                className="flex-1 rounded bg-epitech-blue px-6 py-3"
                            >
                                <Text className="text-center font-semibold text-white">
                                    Submit
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onCancel}
                                className="flex-1 rounded border border-gray-300 px-6 py-3"
                            >
                                <Text className="text-center text-text-primary">
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {status === "success" && (
                    <View className="items-center">
                        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-green-100">
                            <Text className="text-4xl">✅</Text>
                        </View>
                        <Text
                            className="mb-2 text-center text-xl text-text-primary"
                            style={{ fontFamily: "Anton" }}
                        >
                            Authentication Successful!
                        </Text>
                        <Text className="text-center text-sm text-text-secondary">
                            Redirecting you to the app...
                        </Text>
                    </View>
                )}

                {status === "error" && (
                    <View className="max-w-md items-center">
                        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-red-100">
                            <Text className="text-4xl">❌</Text>
                        </View>
                        <Text
                            className="mb-2 text-center text-xl text-text-primary"
                            style={{ fontFamily: "Anton" }}
                        >
                            Authentication Failed
                        </Text>
                        <Text className="mb-6 text-center text-sm text-text-secondary">
                            The popup was closed or an error occurred.
                        </Text>
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={handleRetry}
                                className="flex-1 bg-epitech-blue px-6 py-3"
                            >
                                <Text className="text-center text-white">
                                    Try Again
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onCancel}
                                className="flex-1 border border-gray-300 px-6 py-3"
                            >
                                <Text className="text-center text-text-primary">
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Footer */}
            <View className="border-t border-border p-4">
                <Text className="text-center text-xs text-text-tertiary">
                    {status === "waiting" &&
                        "The browser window opened on the Docker server. Check your terminal/server logs."}
                    {status === "error" &&
                        "Need help? Try manual cookie entry in Settings."}
                </Text>
            </View>
        </SafeAreaView>
    );
}

// ============================================================
// MAIN COMPONENT - Platform detection and routing
// ============================================================
export default function IntraWebViewAuth({
    onSuccess,
    onCancel,
}: IntraWebViewAuthProps) {
    const { isDark } = useTheme();

    const authUrl = `${OAUTH_AUTHORIZE_URL}?response_type=code&client_id=${EPITECH_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        `${INTRA_URL}/auth/office365`,
    )}&state=${encodeURIComponent("/")}`;

    console.log(`[Auth] Platform: ${Platform.OS}`);

    // Route to platform-specific component
    if (Platform.OS === "web") {
        return (
            <WebAuthComponent
                onCancel={onCancel}
                onSuccess={onSuccess}
                isDark={isDark}
            />
        );
    }

    return (
        <MobileAuthComponent
            onSuccess={onSuccess}
            onCancel={onCancel}
            authUrl={authUrl}
            isDark={isDark}
        />
    );
}
