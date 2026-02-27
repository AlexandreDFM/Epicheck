/**
 * File Name: MultiQRScanner.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 10/02/2026
 * Description: Multi-QR code scanner component that can detect and process
 *              multiple QR codes simultaneously with visual overlays.
 * Copyright (c) 2026 Epitech
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

import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
    memo,
} from "react";
import {
    Text,
    View,
    Platform,
    Pressable,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { CameraView, Camera, BarcodeScanningResult } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

/** Interval at which the detection buffer is flushed to UI state */
const FLUSH_INTERVAL_MS = 400;
/** Time after which an overlay disappears if not re-detected */
const OVERLAY_TTL_MS = 2_000;
/** Minimum time between processing the same QR code data again */
const DEDUP_WINDOW_MS = 300;

/** Stable barcode settings — avoids creating a new object on every render */
const BARCODE_SETTINGS: { barcodeTypes: ("qr")[] } = { barcodeTypes: ["qr"] };

interface MultiQRScannerProps {
    /** Called when user presses Validate with all pending emails */
    onValidate: (emails: string[]) => void;
    isActive: boolean;
}

type QROverlay = {
    id: string;
    text: string;
    bounds: { x: number; y: number; width: number; height: number };
    lastSeen: number;
    processed: boolean;
};

/**
 * Memoized camera — receives a stable callback so it NEVER re-renders
 * when overlay state changes. This is the single biggest perf win.
 */
const StableCamera = memo(function StableCamera({
    onBarcodeScanned,
}: {
    onBarcodeScanned: (result: BarcodeScanningResult) => void;
}) {
    return (
        <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={onBarcodeScanned}
            autofocus="off"
            barcodeScannerSettings={BARCODE_SETTINGS}
        />
    );
});

export default function MultiQRScanner({
    onValidate,
    isActive,
}: MultiQRScannerProps) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [overlays, setOverlays] = useState<QROverlay[]>([]);
    const [pendingEmails, setPendingEmails] = useState<Set<string>>(new Set());
    const [validatedEmails, setValidatedEmails] = useState<Set<string>>(
        new Set(),
    );
    const [isValidating, setIsValidating] = useState(false);

    // === All mutable state accessible to the scan callback via a single ref ===
    const scanStateRef = useRef({
        isActive,
        isValidating,
        validatedEmails: new Set<string>(),
        pendingEmails: new Set<string>(),
    });
    // Sync React state → ref every render (cheap assignment, no allocation)
    scanStateRef.current.isActive = isActive;
    scanStateRef.current.isValidating = isValidating;
    scanStateRef.current.validatedEmails = validatedEmails;
    scanStateRef.current.pendingEmails = pendingEmails;

    // Detection buffer: scan callback writes here, flush interval reads
    const detectionBuffer = useRef<Map<string, QROverlay>>(new Map());
    // Pending emails buffer: scan callback writes here, flush interval reads
    const pendingBuffer = useRef<Set<string>>(new Set());
    // Per-QR dedup timestamps
    const lastSeenMap = useRef<Map<string, number>>(new Map());

    const requestCameraPermission = useCallback(async () => {
        try {
            setPermissionError(null);

            if (Platform.OS === "web") {
                if (typeof window !== "undefined" && !window.isSecureContext) {
                    setPermissionError(
                        "Camera requires HTTPS. Please access the site via https://",
                    );
                    setHasPermission(false);
                    return;
                }

                if (
                    typeof navigator === "undefined" ||
                    !navigator.mediaDevices
                ) {
                    setPermissionError(
                        "Camera API not available in this browser",
                    );
                    setHasPermission(false);
                    return;
                }

                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: "environment" },
                    });
                    stream.getTracks().forEach((track) => track.stop());
                    setHasPermission(true);
                } catch (err: unknown) {
                    const error = err as Error & { name?: string };
                    if (
                        error.name === "NotAllowedError" ||
                        error.name === "PermissionDeniedError"
                    ) {
                        setPermissionError(
                            "Camera permission was denied. Please allow camera access in your browser settings.",
                        );
                    } else if (
                        error.name === "NotFoundError" ||
                        error.name === "DevicesNotFoundError"
                    ) {
                        setPermissionError("No camera found on this device.");
                    } else if (
                        error.name === "NotReadableError" ||
                        error.name === "TrackStartError"
                    ) {
                        setPermissionError(
                            "Camera is in use by another application.",
                        );
                    } else if (error.name === "OverconstrainedError") {
                        try {
                            const stream =
                                await navigator.mediaDevices.getUserMedia({
                                    video: true,
                                });
                            stream.getTracks().forEach((track) => track.stop());
                            setHasPermission(true);
                            return;
                        } catch {
                            setPermissionError(
                                "Could not access camera with requested settings.",
                            );
                        }
                    } else {
                        setPermissionError(
                            `Camera error: ${error.message || "Unknown error"}`,
                        );
                    }
                    setHasPermission(false);
                }
            } else {
                const { status } = await Camera.requestCameraPermissionsAsync();
                setHasPermission(status === "granted");
                if (status !== "granted") {
                    setPermissionError("Camera permission was denied.");
                }
            }
        } catch (err) {
            console.error("[MultiQRScanner] Permission request error:", err);
            setPermissionError("Failed to request camera permission.");
            setHasPermission(false);
        }
    }, []);

    useEffect(() => {
        requestCameraPermission();
    }, [requestCameraPermission]);

    // === Completely stable scan callback — ZERO dependencies ===
    // Reads all mutable state from refs. Identity never changes, so
    // StableCamera never re-renders due to a new callback prop.
    const handleBarCodeScanned = useCallback(
        (result: BarcodeScanningResult) => {
            const state = scanStateRef.current;
            if (!state.isActive || state.isValidating) return;

            // Inline email extraction (avoids extra callback)
            const data = result.data;
            let email: string;
            try {
                const parsed = JSON.parse(data);
                email = parsed.email || parsed.Email || data;
            } catch {
                email = data;
            }

            const now = Date.now();

            // Skip if this exact QR was processed very recently
            const prev = lastSeenMap.current.get(email);
            if (prev && now - prev < DEDUP_WINDOW_MS) return;
            lastSeenMap.current.set(email, now);

            const isAlreadyValidated = state.validatedEmails.has(email);

            // Compute bounds (use raw coordinates directly)
            const rawX = result.bounds?.origin?.x ?? 0;
            const rawY = result.bounds?.origin?.y ?? 0;
            const rawW = result.bounds?.size?.width ?? 0;
            const rawH = result.bounds?.size?.height ?? 0;

            const bounds: QROverlay["bounds"] = {
                x: rawX,
                y: rawY,
                width: rawW,
                height: rawH,
            };

            // Write to detection buffer (NO state update — just a ref write)
            detectionBuffer.current.set(email, {
                id: email,
                text: email,
                bounds,
                lastSeen: now,
                processed: isAlreadyValidated,
            });

            // Buffer pending email (NO state update)
            if (!isAlreadyValidated && !state.pendingEmails.has(email)) {
                pendingBuffer.current.add(email);
            }
        },
        [], // Empty deps = identity NEVER changes
    );

    // === Single flush interval: refs → state ===
    // This is the ONLY place where overlays/pendingEmails state is updated
    // from scan data. Runs every FLUSH_INTERVAL_MS independently of scanning.
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const cutoff = now - OVERLAY_TTL_MS;

            // 1. Flush detection buffer → overlays state
            const buffer = detectionBuffer.current;
            if (buffer.size > 0) {
                const snapshot = new Map(buffer);
                buffer.clear();
                setOverlays((prev) => {
                    const merged = new Map<string, QROverlay>();
                    for (const o of prev) {
                        if (o.lastSeen > cutoff) merged.set(o.id, o);
                    }
                    for (const [k, o] of snapshot) {
                        merged.set(k, o);
                    }
                    return Array.from(merged.values());
                });
            } else {
                // No new detections — clean stale overlays only
                setOverlays((prev) => {
                    const filtered = prev.filter((o) => o.lastSeen > cutoff);
                    return filtered.length === prev.length ? prev : filtered;
                });
            }

            // 2. Flush pending buffer → state
            const pending = pendingBuffer.current;
            if (pending.size > 0) {
                const newEmails = new Set(pending);
                pending.clear();
                setPendingEmails((prev) => {
                    let changed = false;
                    const next = new Set(prev);
                    for (const e of newEmails) {
                        if (!next.has(e)) {
                            next.add(e);
                            changed = true;
                        }
                    }
                    return changed ? next : prev;
                });
            }

            // 3. Clean up stale dedup entries (prevent memory leak)
            if (lastSeenMap.current.size > 50) {
                for (const [k, t] of lastSeenMap.current) {
                    if (t < cutoff) lastSeenMap.current.delete(k);
                }
            }
        }, FLUSH_INTERVAL_MS);

        return () => clearInterval(interval);
    }, []);

    const handleValidate = useCallback(() => {
        if (pendingEmails.size === 0 || isValidating) return;
        setIsValidating(true);

        const emails = Array.from(pendingEmails);

        // Mark all as validated
        setValidatedEmails((prev) => {
            const next = new Set(prev);
            for (const e of emails) next.add(e);
            return next;
        });

        // Update overlays to show them as processed
        setOverlays((prev) =>
            prev.map((o) => ({
                ...o,
                processed: pendingEmails.has(o.id) || o.processed,
            })),
        );

        // Clear pending
        setPendingEmails(new Set());

        // Fire callback
        onValidate(emails);

        setIsValidating(false);
    }, [pendingEmails, isValidating, onValidate]);

    const handleClearPending = useCallback(() => {
        setPendingEmails(new Set());
    }, []);

    // --- Render helpers (memoized for performance) ---

    const overlayElements = useMemo(() => {
        const elements: React.ReactElement[] = [];

        for (let i = 0; i < overlays.length; i++) {
            const o = overlays[i];
            if (!o.bounds || o.bounds.width === 0 || o.bounds.height === 0) {
                continue;
            }

            const color = o.processed ? "#00ff00" : "#ffaa00";
            const bgColor = o.processed
                ? "rgba(0, 255, 0, 0.08)"
                : "rgba(255, 170, 0, 0.08)";
            const labelBg = o.processed
                ? "rgba(0, 180, 0, 0.9)"
                : "rgba(0, 0, 0, 0.8)";
            const label =
                o.text.length > 20 ? o.text.slice(0, 20) + "…" : o.text;

            // Single View per overlay: bounds box + label inside
            elements.push(
                <View
                    key={o.id}
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        left: o.bounds.x,
                        top: o.bounds.y - 25,
                        width: o.bounds.width,
                    }}
                >
                    {/* Label */}
                    <View style={{ alignItems: "center", marginBottom: 2 }}>
                        <View
                            style={{
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                backgroundColor: labelBg,
                                borderRadius: 3,
                                borderWidth: 1,
                                borderColor: color,
                            }}
                        >
                            <Text
                                style={{
                                    color: "white",
                                    fontSize: 9,
                                    fontFamily: "IBMPlexSans",
                                }}
                                numberOfLines={1}
                            >
                                {o.processed ? "✓ " : "⏳ "}
                                {label}
                            </Text>
                        </View>
                    </View>
                    {/* Bounds box */}
                    <View
                        style={{
                            width: o.bounds.width,
                            height: o.bounds.height,
                            borderWidth: 2,
                            borderColor: color,
                            backgroundColor: bgColor,
                        }}
                    />
                </View>,
            );
        }

        return elements;
    }, [overlays]);

    // --- Permission / inactive states ---

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
                    {permissionError ||
                        "Please grant camera permissions in your device settings to scan QR codes."}
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
            {/* Camera layer — StableCamera is memo'd and never re-renders */}
            <StableCamera onBarcodeScanned={handleBarCodeScanned} />

            {/* Overlay layer — sibling of camera, so camera is untouched */}
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {/* QR overlays */}
                {overlayElements}

                {/* Bottom bar: status + validate button */}
                <View className="absolute bottom-0 left-0 right-0">
                    {/* Pending count badge */}
                    <View className="items-center pb-2">
                        <View className="rounded-full bg-black/70 px-5 py-2">
                            <Text
                                className="text-center text-sm text-white"
                                style={{ fontFamily: "IBMPlexSans" }}
                            >
                                {pendingEmails.size === 0
                                    ? "Point camera at QR codes"
                                    : `${pendingEmails.size} new QR${pendingEmails.size > 1 ? "s" : ""} detected${validatedEmails.size > 0 ? ` · ${validatedEmails.size} already sent` : ""}`}
                            </Text>
                        </View>
                    </View>

                    {/* Validate / Clear buttons */}
                    {pendingEmails.size > 0 && (
                        <View className="flex-row items-center justify-center gap-3 bg-black/60 px-4 pb-6 pt-3">
                            <TouchableOpacity
                                onPress={handleClearPending}
                                className="border border-white/30 bg-white/10 px-5 py-3"
                            >
                                <Text
                                    className="text-sm text-white/80"
                                    style={{
                                        fontFamily: "IBMPlexSansSemiBold",
                                    }}
                                >
                                    Clear
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleValidate}
                                disabled={isValidating}
                                className={`flex-row items-center border px-6 py-3 ${
                                    isValidating
                                        ? "border-gray-500 bg-gray-600"
                                        : "border-green-400 bg-green-500"
                                }`}
                            >
                                <Ionicons
                                    name="checkmark-circle"
                                    size={20}
                                    color="white"
                                />
                                <Text
                                    className="ml-2 text-base text-white"
                                    style={{ fontFamily: "Anton" }}
                                >
                                    {isValidating
                                        ? "SENDING..."
                                        : `VALIDATE (${pendingEmails.size})`}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    camera: {
        flex: 1,
    },
});
