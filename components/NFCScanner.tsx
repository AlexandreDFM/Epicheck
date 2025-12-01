/**
 * File Name: NFCScanner.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 4/11/2025
 * Description: This is the NFCScanner.tsx
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

import { useState, useEffect } from "react";
import NfcManager, { NfcTech } from "react-native-nfc-manager";
import { Text, View, Platform, TouchableOpacity } from "react-native";

interface NFCScannerProps {
    onScan: (email: string) => void;
    isActive: boolean;
}

export default function NFCScanner({ onScan, isActive }: NFCScannerProps) {
    const [isNfcSupported, setIsNfcSupported] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [message, setMessage] = useState("Ready to scan");

    useEffect(() => {
        const checkNfcSupport = async () => {
            if (Platform.OS === "web") {
                setIsNfcSupported(false);
                setMessage("NFC not supported on web");
                return;
            }

            try {
                const supported = await NfcManager.isSupported();
                setIsNfcSupported(supported);

                if (supported) {
                    await NfcManager.start();
                    setMessage("NFC is ready");
                } else {
                    setMessage("NFC not supported on this device");
                }
            } catch (error) {
                console.error("NFC check error:", error);
                setIsNfcSupported(false);
                setMessage("Error initializing NFC");
            }
        };

        checkNfcSupport();

        return () => {
            if (Platform.OS !== "web" && isNfcSupported) {
                try {
                    NfcManager.cancelTechnologyRequest().catch(() => {});
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        };
    }, []);

    useEffect(() => {
        if (isActive && isNfcSupported && !isScanning) {
            startNfcScan();
        } else if (!isActive && isScanning) {
            stopNfcScan();
        }

        return () => {
            stopNfcScan();
        };
    }, [isActive, isNfcSupported]);

    const startNfcScan = async () => {
        if (Platform.OS === "web" || !isNfcSupported) return;

        try {
            setIsScanning(true);
            setMessage("Hold your NFC card near the device...");

            await NfcManager.requestTechnology(NfcTech.Ndef);

            const tag = await NfcManager.getTag();

            if (tag) {
                let email = "";

                // Try to read NDEF message
                if (tag.ndefMessage && tag.ndefMessage.length > 0) {
                    const ndefRecord = tag.ndefMessage[0];
                    const payload = ndefRecord.payload;

                    // Decode NDEF payload (skip first byte for text records)
                    const textDecoder = new TextDecoder("utf-8");
                    const text = textDecoder.decode(
                        new Uint8Array(payload.slice(1)),
                    );
                    email = text;
                } else if (tag.id) {
                    // If no NDEF message, use tag ID or serial number
                    // You may need to map tag IDs to emails in your system
                    const idBytes = Array.isArray(tag.id) ? tag.id : [tag.id];
                    const tagId = idBytes
                        .map((byte) =>
                            Number(byte).toString(16).padStart(2, "0"),
                        )
                        .join("");
                    email = tagId; // Or lookup email from tagId
                }

                if (email) {
                    setMessage("Card scanned successfully!");
                    onScan(email);

                    // Wait a bit before allowing next scan
                    setTimeout(() => {
                        setMessage("Ready for next scan");
                    }, 2000);
                }
            }

            await NfcManager.cancelTechnologyRequest();

            // Restart scanning after a delay
            if (isActive) {
                setTimeout(() => {
                    startNfcScan();
                }, 1000);
            } else {
                setIsScanning(false);
            }
        } catch (error: any) {
            console.error("NFC scan error:", error);

            if (error.toString().includes("cancelled")) {
                setMessage("Scan cancelled");
            } else {
                setMessage("Error scanning NFC card");
            }

            await NfcManager.cancelTechnologyRequest();
            setIsScanning(false);

            // Retry if still active
            if (isActive) {
                setTimeout(() => {
                    startNfcScan();
                }, 1000);
            }
        }
    };

    const stopNfcScan = async () => {
        if (Platform.OS === "web" || !isNfcSupported) return;

        try {
            await NfcManager.cancelTechnologyRequest();
            setIsScanning(false);
            setMessage("Scanning stopped");
        } catch (error) {
            console.error("Error stopping NFC scan:", error);
        }
    };

    const handleManualScan = () => {
        if (isActive && isNfcSupported) {
            startNfcScan();
        }
    };

    if (Platform.OS === "web") {
        return (
            <View className="flex-1 items-center justify-center bg-epitech-gray px-4">
                <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-gray-300">
                    <Text className="text-5xl">📱</Text>
                </View>
                <Text className="mb-2 text-xl text-epitech-navy">
                    NFC Not Available
                </Text>
                <Text className="text-center text-epitech-gray-dark">
                    NFC scanning is only available on mobile devices.{"\n"}
                    Please use QR code scanning instead.
                </Text>
            </View>
        );
    }

    if (!isNfcSupported) {
        return (
            <View className="flex-1 items-center justify-center bg-epitech-gray px-4">
                <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-red-100">
                    <Text className="text-5xl">⚠️</Text>
                </View>
                <Text className="mb-2 text-xl text-red-600">
                    NFC Not Supported
                </Text>
                <Text className="mb-2 text-center text-epitech-gray-dark">
                    {message}
                </Text>
                <Text className="text-center text-sm text-gray-500">
                    Please use QR code scanning or try on a different device.
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1 items-center justify-center bg-epitech-navy px-6">
            <View className="w-full max-w-sm items-center rounded-3xl p-8">
                {/* NFC Icon */}
                <View className="mb-6 h-32 w-32 items-center justify-center rounded-full bg-epitech-blue">
                    <Text className="text-7xl text-white">📱</Text>
                </View>

                <Text className="mb-3 text-center text-2xl text-epitech-navy">
                    NFC Scanner Ready
                </Text>

                {/* Status Message */}
                <View className="mb-6 w-full rounded-xl bg-epitech-gray px-4 py-3">
                    <Text className="text-center text-epitech-navy">
                        {message}
                    </Text>
                </View>

                {/* Scanning Animation */}
                {isScanning && (
                    <View className="mb-4">
                        <View className="h-16 w-16 rounded-full border-4 border-epitech-blue border-t-transparent" />
                    </View>
                )}

                {/* Manual Scan Button */}
                {!isScanning && isActive && (
                    <TouchableOpacity
                        onPress={handleManualScan}
                        className="w-full rounded-xl bg-epitech-blue px-8 py-4"
                    >
                        <Text className="text-center text-base uppercase tracking-wide text-white">
                            Start Scanning
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Instructions */}
            <View className="mt-8 rounded-full bg-white/10 px-6 py-3">
                <Text className="text-center text-sm text-white">
                    Hold the student card close to your device
                </Text>
            </View>
        </View>
    );
}
