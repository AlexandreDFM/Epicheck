import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import office365Auth from "../services/office365Auth";
import epitechApi from "../services/epitechApi";

type RootStackParamList = {
    Login: undefined;
    Presence: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [isLoading, setIsLoading] = useState(false);

    const handleOffice365Login = async () => {
        setIsLoading(true);

        try {
            console.log("Starting Office 365 login...");
            const userInfo = await office365Auth.login();
            console.log("Login successful, user info:", userInfo);

            // Verify it's an Epitech email
            if (
                !userInfo.mail?.endsWith("@epitech.eu") &&
                !userInfo.userPrincipalName?.endsWith("@epitech.eu")
            ) {
                console.log(
                    "Invalid email domain:",
                    userInfo.mail || userInfo.userPrincipalName
                );
                Alert.alert(
                    "Invalid Account",
                    "Please use your Epitech Office 365 account (@epitech.eu)"
                );
                await office365Auth.logout();
                setIsLoading(false);
                return;
            }

            console.log("Email validated, setting token and navigating...");

            // Set token for API calls
            const accessToken = await office365Auth.getAccessToken();
            if (accessToken) {
                epitechApi.setOffice365Token(accessToken);
            }

            // Navigate to Presence screen after a brief delay to ensure context is ready
            setTimeout(() => {
                navigation.replace("Presence");
                // Show success after navigation
                setTimeout(() => {
                    Alert.alert("Success", `Welcome ${userInfo.displayName}!`);
                }, 100);
            }, 100);
        } catch (error: any) {
            console.error("Login error:", error);
            Alert.alert(
                "Login Failed",
                error.message || "Failed to authenticate with Office 365"
            );
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-white"
        >
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
                            Sign in with Office 365
                        </Text>
                        <Text className="text-epitech-gray-dark text-center text-sm">
                            Use your Epitech Office 365 account to continue
                        </Text>
                    </View>

                    {/* Microsoft Logo Icon */}
                    <View className="items-center mb-6">
                        <View className="w-16 h-16 bg-white border-2 border-gray-200 rounded-2xl items-center justify-center">
                            <Text className="text-4xl">🏢</Text>
                        </View>
                    </View>

                    {/* Office 365 Login Button */}
                    <TouchableOpacity
                        onPress={handleOffice365Login}
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
                                    Sign in with Microsoft
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Security Note */}
                    <View className="mt-6 bg-blue-50 p-3 rounded-lg">
                        <Text className="text-epitech-navy text-xs text-center font-medium">
                            🔒 Secure authentication via Microsoft Azure AD
                        </Text>
                    </View>

                    {/* Footer */}
                    <Text className="text-gray-500 text-center mt-4 text-xs">
                        Only Epitech email addresses (@epitech.eu) are accepted
                    </Text>
                </View>

                {/* Bottom Info */}
                <Text className="text-gray-400 text-center mt-8 text-xs">
                    Powered by Epitech • Secure Authentication
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}
