import React, { useState, useEffect } from "react";
import { Text, View, Alert, Platform } from "react-native";
import { CameraView, Camera, BarcodeScanningResult } from "expo-camera";

interface QRScannerProps {
    onScan: (email: string) => void;
    isActive: boolean;
}

export default function QRScanner({ onScan, isActive }: QRScannerProps) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        const getCameraPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        };

        getCameraPermissions();
    }, []);

    useEffect(() => {
        // Reset scanned state when scanner becomes active
        if (isActive) {
            setScanned(false);
        }
    }, [isActive]);

    const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
        if (scanned || !isActive) return;

        setScanned(true);

        // Assume QR code contains email or extract email from data
        // You may need to parse the data based on your QR code format
        let email = data;

        // If QR code contains JSON or other format, parse it
        try {
            const parsed = JSON.parse(data);
            email = parsed.email || parsed.Email || data;
        } catch (e) {
            // If not JSON, assume it's plain email
            email = data;
        }

        onScan(email);

        // Reset scanned state after 3 seconds to allow rescanning
        setTimeout(() => {
            setScanned(false);
        }, 3000);
    };

    if (hasPermission === null) {
        return (
            <View className="flex-1 items-center justify-center bg-epitech-gray">
                <Text className="text-epitech-gray-dark">
                    Requesting camera permission...
                </Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View className="flex-1 items-center justify-center bg-epitech-gray px-4">
                <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-4">
                    <Text className="text-4xl">🔒</Text>
                </View>
                <Text className="text-red-600 text-lg font-bold mb-2">
                    Camera Access Required
                </Text>
                <Text className="text-epitech-gray-dark text-center">
                    Please grant camera permissions in your device settings to
                    scan QR codes.
                </Text>
            </View>
        );
    }

    if (!isActive) {
        return (
            <View className="flex-1 items-center justify-center bg-epitech-gray">
                <Text className="text-epitech-gray-dark">
                    Camera is inactive
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1">
            <CameraView
                style={{ flex: 1, height: "100%", width: "100%" }}
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
                autofocus="off"
                barcodeScannerSettings={{
                    barcodeTypes: [
                        "qr",
                        "ean13",
                        "ean8",
                        "code128",
                        "code39",
                        "codabar",
                    ],
                }}
            >
                <View className="flex-1 bg-transparent">
                    {/* Scanning overlay */}
                    <View className="flex-1 justify-center items-center">
                        {/* Corner borders for scan area */}
                        <View className="w-72 h-72 relative">
                            {/* Top-left corner */}
                            <View className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-epitech-blue rounded-tl-xl" />
                            {/* Top-right corner */}
                            <View className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-epitech-blue rounded-tr-xl" />
                            {/* Bottom-left corner */}
                            <View className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-epitech-blue rounded-bl-xl" />
                            {/* Bottom-right corner */}
                            <View className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-epitech-blue rounded-br-xl" />
                        </View>
                        <View className="mt-6 bg-black/70 px-6 py-3 rounded-full">
                            <Text className="text-white text-base font-semibold text-center">
                                {scanned
                                    ? "✓ Scanned! Processing..."
                                    : "Align QR code within frame"}
                            </Text>
                        </View>
                    </View>
                </View>
            </CameraView>
        </View>
    );
}
