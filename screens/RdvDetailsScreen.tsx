/**
 * File Name: RdvDetailsScreen.tsx
 * Description: Screen to display details of an RDV event and its registered students/groups.
 */

import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    Image,
    TouchableOpacity,
    Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import intraApi from "../services/intraApi";
import { IIntraEvent } from "../types/IIntraEvent";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import rdvService, { IRegistration } from "../services/rdvService";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

type RootStackParamList = {
    RdvDetails: { event: IIntraEvent };
};

type RdvDetailsRouteProp = RouteProp<RootStackParamList, "RdvDetails">;

export default function RdvDetailsScreen() {
    const navigation = useNavigation();
    const route = useRoute<RdvDetailsRouteProp>();
    const { event } = route.params;

    const [registrations, setRegistrations] = useState<IRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState("Fetching data...");
    const [projectName, setProjectName] = useState<string>("");
    const [projectLoading, setProjectLoading] = useState(true);
    const [activityData, setActivityData] = useState<any>(null);

    useEffect(() => {
        fetchRdvData();
    }, []);

    /**
     * Fetch RDV registrations and project info using API
     */
    const fetchRdvData = async () => {
        try {
            setLoading(true);
            setProjectLoading(true);
            setStatusMessage("Fetching RDV registrations...");

            // Fetch RDV registrations
            const rdvData = await intraApi.getRdvRegistrations(event);
            console.log("[RdvDetails] RDV data received");

            // Parse registrations
            const parsedRegistrations = rdvService.parseRdvData(rdvData);
            setRegistrations(parsedRegistrations);
            setStatusMessage("RDV data loaded");
            setLoading(false);

            // Extract project name from RDV data using API service
            const extractedName = intraApi.extractProjectNameFromRdv(rdvData);

            if (extractedName) {
                setProjectName(extractedName);
                setProjectLoading(false);
                console.log("[RdvDetails] ✓ Project name set:", extractedName);
            } else {
                // Fallback: try to fetch full project info
                console.log(
                    "[RdvDetails] No project in RDV data, fetching project info...",
                );
                try {
                    const projectData = await intraApi.getProjectInfo(event);
                    if (projectData) {
                        // Extract project name from project API
                        let apiName = "";

                        if (projectData.title_link) {
                            apiName = projectData.title_link.toLowerCase();
                        } else if (projectData.title) {
                            // Clean the title similar to RDV extraction
                            apiName = projectData.title
                                .replace(/\[[^\]]*\]/g, "")
                                .trim()
                                .toLowerCase()
                                .replace(/\s+/g, "");
                        } else if (projectData.repository) {
                            const repoMatch =
                                projectData.repository.match(
                                    /\/([a-z0-9_-]+)-\d+$/i,
                                );
                            if (repoMatch) {
                                apiName = repoMatch[1];
                            }
                        }

                        if (apiName) {
                            setProjectName(apiName);
                            console.log(
                                "[RdvDetails] ✓ Project name from API:",
                                apiName,
                            );
                        } else {
                            // Final fallback to activity code
                            const fallback = event.codeacti.replace(
                                /^acti-/,
                                "",
                            );
                            setProjectName(fallback);
                            console.log(
                                "[RdvDetails] Using activity code fallback:",
                                fallback,
                            );
                        }
                    } else {
                        // No project found at all
                        const fallback = event.codeacti.replace(/^acti-/, "");
                        setProjectName(fallback);
                        console.log(
                            "[RdvDetails] No project found, using activity code:",
                            fallback,
                        );
                    }
                } catch (projectError) {
                    console.warn(
                        "[RdvDetails] Failed to fetch project info:",
                        projectError,
                    );
                    const fallback = event.codeacti.replace(/^acti-/, "");
                    setProjectName(fallback);
                }
                setProjectLoading(false);
            }

            // Optionally fetch full activity details for additional info
            try {
                const activityDetails =
                    await intraApi.getActivityDetails(event);
                setActivityData(activityDetails);
                console.log("[RdvDetails] Activity details loaded");
            } catch (activityError) {
                console.warn(
                    "[RdvDetails] Failed to fetch activity details:",
                    activityError,
                );
            }
        } catch (err: any) {
            console.error("[RdvDetails] Error fetching RDV data:", err);
            setError(err.message || "Failed to load RDV data");
            setLoading(false);
            setProjectLoading(false);
        }
    };
    /**
     * Constructs Jenkins URL for a given student login
     * Pattern: https://jenkins.epitest.eu/view/{MODULE}/job/{MODULE}/job/{PROJECT_NAME}/job/{YEAR}/job/{INSTANCE}/job/{LOGIN}/
     */
    const getJenkinsUrl = (login: string): string => {
        // Extract module code (e.g., "G-PSU-100" from the codemodule)
        const moduleCode = event.codemodule.toUpperCase();
        // Extract module base without number (e.g., "G-PSU" from "G-PSU-100")
        const moduleBase = moduleCode.split("-").slice(0, 2).join("-");
        // Year
        const year = event.scolaryear;
        // Instance (e.g., "NCE-1-1")
        const instance = event.codeinstance;

        console.log("[RdvDetails] Jenkins URL params:", {
            moduleBase,
            moduleCode,
            projectName,
            year,
            instance,
            login,
        });

        return `https://jenkins.epitest.eu/view/${moduleBase}/job/${moduleCode}/job/${projectName}/job/${year}/job/${instance}/job/${login.replace("@epitech.eu", "")}/`;
    };

    const openJenkins = (login: string) => {
        if (!projectName) {
            console.warn(
                "[RdvDetails] Cannot open Jenkins: project name not loaded",
            );
            return;
        }
        const jenkinsUrl = getJenkinsUrl(login);
        console.log("[RdvDetails] Opening Jenkins:", jenkinsUrl);
        Linking.openURL(jenkinsUrl).catch((err) => {
            console.error("[RdvDetails] Failed to open Jenkins URL:", err);
        });
    };
    const renderRegistration = ({ item }: { item: IRegistration }) => {
        const isGroup = item.type === "group";
        const title = isGroup
            ? `Groupe (${item.members.length} membres)`
            : item.members[0].title;

        const logins = item.members.map((m) => m.login).join(", ");

        // Affiche la note du slot si présente, sinon le statut du slot, sinon fallback sur le statut du premier membre
        const getStatusOrNote = (item: any) => {
            if (
                item.note !== undefined &&
                item.note !== null &&
                item.note !== ""
            ) {
                return item.note;
            }
            if (item.status === "present") return "Présent";
            if (item.status === "absent") return "Absent";
            // fallback: premier membre
            if (item.members && item.members.length > 0) {
                const member = item.members[0];
                if (member.present === "present") return "Présent";
                if (member.present === "absent") return "Absent";
            }
            return "Non renseigné";
        };

        const mainStatus = getStatusOrNote(item);

        // Couleur badge
        let badgeColor = "bg-gray-100",
            textColor = "text-gray-500";
        if (mainStatus === "Présent") {
            badgeColor = "bg-green-100";
            textColor = "text-green-700";
        } else if (mainStatus === "Absent") {
            badgeColor = "bg-red-100";
            textColor = "text-red-700";
        } else if (mainStatus && mainStatus !== "Non renseigné") {
            badgeColor = "bg-blue-100";
            textColor = "text-blue-700";
        }

        return (
            <View className="border-tertiary/20 mb-3 border border-white bg-primary-dark p-4">
                <View className="flex-row items-center">
                    {/* Avatar */}
                    <View className="mr-4">
                        {isGroup ? (
                            <View className="h-10 w-10 items-center justify-center bg-primary">
                                <Text className="font-bold text-white">G</Text>
                            </View>
                        ) : item.members[0].picture ? (
                            (() => {
                                // Try to use miniview version if .bmp
                                const original = item.members[0].picture;
                                let miniview = original;
                                console.log("Original picture URL:", original);
                                if (original && original.endsWith(".bmp")) {
                                    // /file/userprofil/xxx.bmp => /file/userprofil/profilview/xxx.jpg
                                    const match = original.match(
                                        /\/file\/userprofil\/(.+)\.bmp$/,
                                    );
                                    if (match && match[1]) {
                                        miniview = `/file/userprofil/profilview/${match[1]}.jpg`;
                                        console.log(
                                            "Using miniview picture URL:",
                                            miniview,
                                        );
                                    }
                                }
                                return (
                                    <Image
                                        source={{
                                            uri: `https://intra.epitech.eu${miniview}`,
                                        }}
                                        className="h-10 w-10 rounded-full bg-black"
                                    />
                                );
                            })()
                        ) : (
                            <View className="h-10 w-10 items-center justify-center bg-primary">
                                <Text className="font-bold text-white">
                                    {item.members[0].login
                                        .substring(0, 2)
                                        .toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Info */}
                    <View className="flex-1">
                        <Text
                            className="text-base font-semibold text-primary"
                            style={{ fontFamily: "IBMPlexSansSemiBold" }}
                        >
                            {title}
                        </Text>
                        <Text
                            className="text-xs text-text-tertiary"
                            style={{ fontFamily: "IBMPlexSans" }}
                            numberOfLines={2}
                        >
                            {logins}
                        </Text>
                        {item.date && (
                            <Text
                                className="mt-1 text-xs text-text-tertiary"
                                style={{ fontFamily: "IBMPlexSans" }}
                            >
                                {item.date}
                            </Text>
                        )}
                    </View>

                    {/* Status/Note Badge */}
                    <View
                        className={`border border-primary px-3 py-1 ${badgeColor} ml-2`}
                    >
                        <Text className={`text-xs font-bold ${textColor}`}>
                            {mainStatus}
                        </Text>
                    </View>
                </View>

                {/* Jenkins Buttons for each member */}
                {!isGroup && item.members.length === 1 && projectName && (
                    <View className="mt-3">
                        <TouchableOpacity
                            onPress={() => openJenkins(item.members[0].login)}
                            className="flex-row items-center justify-center rounded bg-primary px-4 py-2"
                        >
                            <Ionicons
                                name="build-outline"
                                size={16}
                                color="white"
                            />
                            <Text
                                className="ml-2 text-sm font-bold text-white"
                                style={{ fontFamily: "IBMPlexSansSemiBold" }}
                            >
                                Open Jenkins
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
                {!isGroup && item.members.length === 1 && projectLoading && (
                    <View className="mt-3 border-t border-gray-100 pt-3">
                        <View className="flex-row items-center justify-center rounded bg-gray-300 px-4 py-2">
                            <ActivityIndicator size="small" color="#666" />
                            <Text
                                className="ml-2 text-sm text-gray-600"
                                style={{ fontFamily: "IBMPlexSans" }}
                            >
                                Loading Jenkins...
                            </Text>
                        </View>
                    </View>
                )}

                {/* For groups, show Jenkins buttons for each member */}
                {isGroup && projectName && (
                    <View className="mt-3 border-t pt-3">
                        <Text
                            className="mb-2 text-xs font-semibold text-gray-600"
                            style={{ fontFamily: "IBMPlexSansSemiBold" }}
                        >
                            Jenkins Links:
                        </Text>
                        {item.members.map((member, idx) => (
                            <TouchableOpacity
                                key={member.login}
                                onPress={() => openJenkins(member.login)}
                                className={`flex-row items-center justify-between rounded px-3 py-2 ${idx > 0 ? "mt-2" : ""}`}
                            >
                                <Text
                                    className="flex-1 text-sm text-blue-900"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                >
                                    {member.login}
                                </Text>
                                <Ionicons
                                    name="build-outline"
                                    size={16}
                                    color="#1e40af"
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                {isGroup && projectLoading && (
                    <View className="mt-3 border-t border-gray-100 pt-3">
                        <View className="flex-row items-center justify-center rounded px-4 py-2">
                            <ActivityIndicator size="small" color="#666" />
                            <Text
                                className="ml-2 text-sm text-gray-600"
                                style={{ fontFamily: "IBMPlexSans" }}
                            >
                                Loading Jenkins...
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1">
            {/* Header */}
            <View className="flex-row items-center bg-primary px-4 py-4">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="mr-3 p-2"
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text
                        className="text-xl text-white"
                        style={{ fontFamily: "Anton" }}
                    >
                        {event.acti_title.toUpperCase()} - DETAILS
                    </Text>
                    <Text
                        className="text-xs text-white/80"
                        style={{ fontFamily: "IBMPlexSans" }}
                        numberOfLines={1}
                    >
                        Project reference :{" "}
                        {projectLoading ? "Loading..." : projectName}
                    </Text>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center p-8">
                    <ActivityIndicator size="large" color="#0ea5e9" />
                    <Text
                        className="mt-4 text-center text-text-tertiary"
                        style={{ fontFamily: "IBMPlexSans" }}
                    >
                        {statusMessage}
                    </Text>
                    <Text className="mt-2 text-center text-xs text-gray-400">
                        Fetching data from Intranet API...
                    </Text>
                </View>
            ) : error ? (
                <View className="flex-1 items-center justify-center p-8">
                    <Ionicons
                        name="alert-circle-outline"
                        size={48}
                        color="#ef4444"
                    />
                    <Text
                        className="mt-4 text-center text-lg text-red-500"
                        style={{ fontFamily: "IBMPlexSansSemiBold" }}
                    >
                        Error
                    </Text>
                    <Text className="mt-2 text-center text-text-tertiary">
                        {error}
                    </Text>
                    <TouchableOpacity
                        className="mt-6 rounded bg-primary px-6 py-3"
                        onPress={() => {
                            setError(null);
                            fetchRdvData();
                        }}
                    >
                        <Text className="font-bold text-white">Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View className="flex-1 p-4">
                    <View className="mb-1 border border-white p-4">
                        <Text className="text-sm text-text-tertiary">
                            <Text className="font-bold text-primary">
                                {registrations.length}
                            </Text>{" "}
                            inscription{registrations.length > 1 ? "s" : ""}{" "}
                            trouvée{registrations.length > 1 ? "s" : ""}
                        </Text>
                    </View>
                    <FlatList
                        data={registrations}
                        renderItem={renderRegistration}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{
                            paddingBottom: 32,
                            paddingTop: 8,
                        }}
                    />
                </View>
            )}
        </SafeAreaView>
    );
}
