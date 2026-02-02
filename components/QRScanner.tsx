/**
 * File Name: QRScanner.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 4/11/2025
 * Description: This is the QRScanner.tsx
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

import { Text, View, Platform, Pressable } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { CameraView, Camera, BarcodeScanningResult } from "expo-camera";

interface QRScannerProps {
    onScan: (email: string) => void;
    isActive: boolean;
}

export default function QRScanner({ onScan, isActive }: QRScannerProps) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    const requestCameraPermission = useCallback(async () => {
        try {
            setPermissionError(null);
            
            if (Platform.OS === "web") {
                // On web, we need to use the native browser API
                // First check if we're in a secure context (HTTPS)
                if (typeof window !== "undefined" && !window.isSecureContext) {
                    console.error("[QRScanner] Not in secure context (HTTPS required)");
                    setPermissionError("Camera requires HTTPS. Please access the site via https://");
                    setHasPermission(false);
                    return;
                }

                // Check if mediaDevices is available
                if (typeof navigator === "undefined" || !navigator.mediaDevices) {
                    console.error("[QRScanner] navigator.mediaDevices not available");
                    setPermissionError("Camera API not available in this browser");
                    setHasPermission(false);
                    return;
                }

                try {
                    // Request camera permission using browser API
                    console.log("[QRScanner] Requesting camera permission via getUserMedia...");
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { facingMode: "environment" } 
                    });
                    
                    // Stop the stream immediately - we just needed to trigger permission
                    stream.getTracks().forEach(track => track.stop());
                    
                    console.log("[QRScanner] Camera permission granted via getUserMedia");
                    setHasPermission(true);
                } catch (err: unknown) {
                    const error = err as Error & { name?: string };
                    console.error("[QRScanner] getUserMedia error:", error.name, error.message);
                    
                    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
                        setPermissionError("Camera permission was denied. Please allow camera access in your browser settings.");
                    } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
                        setPermissionError("No camera found on this device.");
                    } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
                        setPermissionError("Camera is in use by another application.");
                    } else if (error.name === "OverconstrainedError") {
                        // Try again without facingMode constraint
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                            stream.getTracks().forEach(track => track.stop());
                            setHasPermission(true);
                            return;
                        } catch {
                            setPermissionError("Could not access camera with requested settings.");
                        }
                    } else {
                        setPermissionError(`Camera error: ${error.message || "Unknown error"}`);
                    }
                    setHasPermission(false);
                }
            } else {
                // Native platforms - use expo-camera
                const { status } = await Camera.requestCameraPermissionsAsync();
                setHasPermission(status === "granted");
                if (status !== "granted") {
                    setPermissionError("Camera permission was denied.");
                }
            }
        } catch (err) {
            console.error("[QRScanner] Permission request error:", err);
            setPermissionError("Failed to request camera permission.");
            setHasPermission(false);
        }
    }, []);

    useEffect(() => {
        requestCameraPermission();
    }, [requestCameraPermission]);

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
        }, 5000);
    };

    if (hasPermission === null) {
        return (
            <View className="flex-1 items-center justify-center bg-epitech-gray">
                <Text
                    className="text-epitech-gray-dark"
                    style={{ fontFamily: "IBMPlexSans" }}
                >
                    Requesting camera permission...
                </Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View className="flex-1 items-center justify-center bg-epitech-gray px-4">
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-red-100">
                    <Text className="text-4xl">🔒</Text>
                </View>
                <Text
                    className="mb-2 text-lg text-red-600"
                    style={{ fontFamily: "Anton" }}
                >
                    Camera Access Required
                </Text>
                <Text
                    className="mb-4 text-center text-epitech-gray-dark"
                    style={{ fontFamily: "IBMPlexSans" }}
                >
                    {permissionError || "Please grant camera permissions in your device settings to scan QR codes."}
                </Text>
                {Platform.OS === "web" && (
                    <Pressable
                        onPress={requestCameraPermission}
                        className="mt-2 rounded-lg bg-epitech-blue px-6 py-3"
                    >
                        <Text
                            className="text-white"
                            style={{ fontFamily: "IBMPlexSansSemiBold" }}
                        >
                            Retry Camera Access
                        </Text>
                    </Pressable>
                )}
            </View>
        );
    }

    if (!isActive) {
        return (
            <View className="flex-1 items-center justify-center bg-epitech-gray">
                <Text
                    className="text-epitech-gray-dark"
                    style={{ fontFamily: "IBMPlexSans" }}
                >
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
                    <View className="flex-1 items-center justify-center">
                        {/* Corner borders for scan area */}
                        <View className="relative h-72 w-72">
                            {/* Top-left corner */}
                            <View className="absolute left-0 top-0 h-12 w-12 rounded-tl-xl border-l-4 border-t-4 border-epitech-blue" />
                            {/* Top-right corner */}
                            <View className="absolute right-0 top-0 h-12 w-12 rounded-tr-xl border-r-4 border-t-4 border-epitech-blue" />
                            {/* Bottom-left corner */}
                            <View className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-xl border-b-4 border-l-4 border-epitech-blue" />
                            {/* Bottom-right corner */}
                            <View className="absolute bottom-0 right-0 h-12 w-12 rounded-br-xl border-b-4 border-r-4 border-epitech-blue" />
                        </View>
                        <View className="mt-6 rounded-full bg-black/70 px-6 py-3">
                            <Text
                                className="text-center text-base text-white"
                                style={{ fontFamily: "IBMPlexSansSemiBold" }}
                            >
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
