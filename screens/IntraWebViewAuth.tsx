/**
 * File Name: IntraWebViewAuth.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 29/10/2025
 * Description: Platform-specific authentication for Epitech Intranet
 * - Mobile (iOS/Android): Uses WebView with automatic cookie extraction
 * - Web: Provides manual authentication instructions
 * Copyright (c) 2025 Epitech
 * Version: 2.0.0
 */

import {
    View,
    Text,
    ActivityIndicator,
    TouchableOpacity,
    Platform,
    NativeModules,
    TextInput,
} from "react-native";

import { useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import intraAuth from "../services/intraAuth";

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
        const data = event.nativeEvent.data;
        console.log("[Mobile] Received WebView message");

        try {
            const parsed = JSON.parse(data);
            if (parsed.cookie !== undefined) {
                console.log("[Mobile] Cookie from JS:", parsed.cookie);
                const userCookie = parseCookieString(parsed.cookie);
                if (userCookie) {
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
            onSuccess(userCookie);
        } else {
            console.log(
                "[Mobile] ⚠ Cookie empty (likely HttpOnly), trying native API...",
            );

            // Try native cookie extraction as fallback
            tryNativeCookieExtraction().then((nativeCookie) => {
                if (nativeCookie) {
                    console.log("[Mobile] ✓ Success via native API!");
                    onSuccess(nativeCookie);
                } else {
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
                tryNativeCookieExtraction().then((nativeCookie) => {
                    if (nativeCookie) {
                        console.log(
                            "[Mobile] ✓ Cookie extracted via native API (HttpOnly bypass)",
                        );
                        onSuccess(nativeCookie);
                    }
                });
            }, 2000);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-row items-center justify-between bg-epitech-blue p-4">
                <View className="flex-1">
                    <Text className="text-lg font-bold text-white">
                        Epitech Login
                    </Text>
                    <Text className="text-xs text-white opacity-80">
                        Sign in with your Office365 account
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onCancel}
                    className="rounded-lg bg-white/20 px-4 py-2"
                >
                    <Text className="font-semibold text-white">Cancel</Text>
                </TouchableOpacity>
            </View>

            {loading && (
                <View className="absolute left-0 right-0 top-20 z-10 items-center">
                    <View className="flex-row items-center rounded-lg bg-surface p-4 shadow-lg">
                        <ActivityIndicator color="#00B8D4" />
                        <Text className="ml-3 text-text-primary">
                            Loading...
                        </Text>
                    </View>
                </View>
            )}

            {__DEV__ && currentUrl && (
                <View className="bg-surface p-2">
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
                    <Text className="mb-2 font-bold text-text-primary">
                        ⚠️ Manual Authentication Required
                    </Text>
                    <Text className="mb-3 text-sm text-text-secondary">
                        The authentication cookie is HttpOnly and cannot be
                        extracted automatically on your device.
                    </Text>
                    <Text className="mb-2 text-xs font-semibold text-text-primary">
                        Why this happens:
                    </Text>
                    <Text className="mb-3 text-xs text-text-secondary">
                        • Running in Expo Go (requires custom dev build){"\n"}•
                        Native cookie module not available{"\n"}• Security
                        restrictions on HttpOnly cookies
                    </Text>
                    <Text className="mb-2 text-xs font-semibold text-text-primary">
                        Solution:
                    </Text>
                    <Text className="mb-3 text-xs text-text-secondary">
                        Go to Settings → Developer Options → Enter cookie
                        manually
                    </Text>
                    <TouchableOpacity
                        onPress={onCancel}
                        className="mt-3 rounded-lg bg-epitech-blue px-4 py-2"
                    >
                        <Text className="text-center font-semibold text-white">
                            Go to Settings
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <WebView
                ref={webViewRef}
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
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#00B8D4" />
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

// ============================================================
// WEB COMPONENT - Manual authentication instructions
// ============================================================
function WebAuthComponent({ onCancel, onSuccess }: any) {
    const [cookieInput, setCookieInput] = useState("");
    const [isExtracting, setIsExtracting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpenIntra = () => {
        // Open Intranet in new window
        const authUrl = `https://login.microsoftonline.com/common/oauth2/authorize?response_type=code&client_id=${EPITECH_CLIENT_ID}&redirect_uri=${encodeURIComponent(
            `${INTRA_URL}/auth/office365`,
        )}&state=${encodeURIComponent("/")}`;

        window.open(authUrl, "_blank");
        setIsExtracting(true);
    };

    const handleCookieSubmit = async () => {
        const trimmedCookie = cookieInput.trim();
        if (trimmedCookie.length < 20) {
            alert("Cookie value seems too short. Please check and try again.");
            return;
        }

        setIsSubmitting(true);
        try {
            console.log("[Web] Submitting cookie:", trimmedCookie.substring(0, 20) + "...");

            // Save the cookie using intraAuth service
            await intraAuth.setTestCookie(trimmedCookie);

            console.log("[Web] ✓ Cookie saved successfully");

            // Success message - proxy server handles CORS
            alert(
                "✅ Authentication Successful\n\n" +
                "Your Intranet cookie has been saved!\n\n" +
                "� The app now uses a proxy server to bypass browser CORS restrictions.\n\n" +
                "Make sure the proxy server is running on http://localhost:3001"
            );

            // Call onSuccess to close the modal
            onSuccess(trimmedCookie);
        } catch (error) {
            console.error("[Web] Failed to save cookie:", error);
            alert("Failed to save cookie. Please try again or use Settings → Developer Options.");
        } finally {
            setIsSubmitting(false);
        }
    };    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-row items-center justify-between bg-epitech-blue p-4">
                <View className="flex-1">
                    <Text className="text-lg font-bold text-white">
                        Epitech Login (Web)
                    </Text>
                    <Text className="text-xs text-white opacity-80">
                        Manual authentication required
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onCancel}
                    className="rounded-lg bg-white/20 px-4 py-2"
                >
                    <Text className="font-semibold text-white">Cancel</Text>
                </TouchableOpacity>
            </View>

            <View className="flex-1 p-6">
                <View className="mb-6 rounded-lg border-l-4 border-status-info bg-status-info-bg p-4">
                    <Text className="mb-2 font-bold text-status-info">
                        ℹ️ Web Platform Notice
                    </Text>
                    <Text className="text-sm leading-relaxed text-status-info">
                        Automatic authentication is not available on web due to
                        browser security restrictions. Follow the steps below to login.
                    </Text>
                </View>

                {/* Proxy Server Notice */}
                <View className="mb-6 rounded-lg border-l-4 border-green-500 bg-green-500/10 p-4">
                    <Text className="mb-2 font-bold text-green-700">
                        🚀 Proxy Server Solution
                    </Text>
                    <Text className="mb-2 text-sm leading-relaxed text-green-800">
                        The app uses a local proxy server to bypass browser CORS restrictions. 
                        Make sure the proxy is running on port 3001.
                    </Text>
                    <Text className="text-xs font-semibold text-green-900">
                        � See proxy-server/README.md for setup instructions
                    </Text>
                </View>

                {/* Quick Login Button */}
                <TouchableOpacity
                    onPress={handleOpenIntra}
                    className="mb-6 rounded-lg bg-epitech-blue px-6 py-4 shadow-lg"
                >
                    <Text className="mb-1 text-center text-lg font-bold text-white">
                        🔐 Login with Office365
                    </Text>
                    <Text className="text-center text-xs text-white opacity-80">
                        Opens Epitech Intranet in a new tab
                    </Text>
                </TouchableOpacity>

                {isExtracting && (
                    <View className="mb-6 rounded-lg border border-yellow-500 bg-yellow-500/10 p-4">
                        <Text className="mb-2 font-bold text-text-primary">
                            📋 After logging in, extract your cookie:
                        </Text>
                        <Text className="mb-3 text-sm text-text-secondary">
                            1. Press F12 to open DevTools{"\n"}
                            2. Go to Application → Cookies → intra.epitech.eu{"\n"}
                            3. Find the &quot;user&quot; cookie and copy its value{"\n"}
                            4. Paste it below or in Settings → Developer Options
                        </Text>
                    </View>
                )}

                {isExtracting && (
                    <View className="mb-6 rounded-lg border border-card-border bg-card-bg p-4">
                        <Text className="mb-2 text-sm font-semibold text-text-primary">
                            Quick Cookie Input:
                        </Text>
                        <TextInput
                            value={cookieInput}
                            onChangeText={setCookieInput}
                            placeholder="Paste your 'user' cookie value here..."
                            multiline
                            numberOfLines={3}
                            style={{
                                borderWidth: 1,
                                borderColor: "#d1d5db",
                                backgroundColor: "#ffffff",
                                color: "#111827",
                                padding: 12,
                                borderRadius: 8,
                                marginBottom: 12,
                                fontSize: 12,
                                fontFamily: "monospace",
                            }}
                        />
                        <TouchableOpacity
                            onPress={handleCookieSubmit}
                            disabled={isSubmitting || cookieInput.trim().length < 20}
                            className={`rounded-lg px-4 py-3 ${
                                isSubmitting || cookieInput.trim().length < 20
                                    ? "bg-gray-400"
                                    : "bg-green-600"
                            }`}
                        >
                            <Text className="text-center font-semibold text-white">
                                {isSubmitting ? "Saving..." : "✓ Save & Login"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View className="rounded-lg border border-card-border bg-card-bg p-6">
                    <Text className="mb-4 text-lg font-bold text-text-primary">
                        Detailed Instructions
                    </Text>

                    <View className="space-y-3">
                        <View className="flex-row">
                            <Text className="mr-2 font-bold text-epitech-blue">
                                1.
                            </Text>
                            <Text className="flex-1 text-text-primary">
                                Open{" "}
                                <Text className="font-mono text-epitech-blue">
                                    intra.epitech.eu
                                </Text>{" "}
                                in a new tab
                            </Text>
                        </View>

                        <View className="flex-row">
                            <Text className="mr-2 font-bold text-epitech-blue">
                                2.
                            </Text>
                            <Text className="flex-1 text-text-primary">
                                Login with your Office365 credentials
                            </Text>
                        </View>

                        <View className="flex-row">
                            <Text className="mr-2 font-bold text-epitech-blue">
                                3.
                            </Text>
                            <Text className="flex-1 text-text-primary">
                                Press <Text className="font-mono">F12</Text> to
                                open DevTools
                            </Text>
                        </View>

                        <View className="flex-row">
                            <Text className="mr-2 font-bold text-epitech-blue">
                                4.
                            </Text>
                            <Text className="flex-1 text-text-primary">
                                Go to{" "}
                                <Text className="font-semibold">
                                    Application
                                </Text>{" "}
                                → <Text className="font-semibold">Cookies</Text>{" "}
                                →{" "}
                                <Text className="font-mono">
                                    intra.epitech.eu
                                </Text>
                            </Text>
                        </View>

                        <View className="flex-row">
                            <Text className="mr-2 font-bold text-epitech-blue">
                                5.
                            </Text>
                            <Text className="flex-1 text-text-primary">
                                Find the <Text className="font-mono">user</Text>{" "}
                                cookie and copy its value
                            </Text>
                        </View>

                        <View className="flex-row">
                            <Text className="mr-2 font-bold text-epitech-blue">
                                6.
                            </Text>
                            <Text className="flex-1 text-text-primary">
                                Go to{" "}
                                <Text className="font-semibold">Settings</Text>{" "}
                                →{" "}
                                <Text className="font-semibold">
                                    Developer Options
                                </Text>
                            </Text>
                        </View>

                        <View className="flex-row">
                            <Text className="mr-2 font-bold text-epitech-blue">
                                7.
                            </Text>
                            <Text className="flex-1 text-text-primary">
                                Paste the cookie value and click{" "}
                                <Text className="font-semibold">
                                    SET COOKIE
                                </Text>
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={onCancel}
                        className="mt-6 rounded-lg bg-epitech-blue px-6 py-3"
                    >
                        <Text className="text-center text-base font-semibold text-white">
                            Go to Settings
                        </Text>
                    </TouchableOpacity>
                </View>

                <View className="mt-4 rounded-lg border border-status-warning bg-status-warning-bg p-4">
                    <Text className="text-xs leading-relaxed text-status-warning">
                        💡 <Text className="font-semibold">Tip:</Text> Use the
                        mobile app (Android/iOS) for automatic authentication.
                    </Text>
                </View>
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
        return <WebAuthComponent onCancel={onCancel} onSuccess={onSuccess} />;
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
