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
import {
    useNavigation,
    useRoute,
    RouteProp,
    NavigationProp,
} from "@react-navigation/native";

import { useEffect, useState } from "react";
import intraApi from "../services/intraApi";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import jenkinsApi from "../services/jenkinsApi";
import { IIntraEvent } from "../types/IIntraEvent";
import jenkinsService from "../services/jenkinsService";
import { SafeAreaView } from "react-native-safe-area-context";
import rdvService, { IRegistration } from "../services/rdvService";

type RootStackParamList = {
    RdvDetails: { event: IIntraEvent };
    RdvMark: { event: IIntraEvent };
};

type RdvDetailsRouteProp = RouteProp<RootStackParamList>;
type RdvDetailsNavigationProp = NavigationProp<RootStackParamList>;

export default function RdvDetailsScreen() {
    const navigation = useNavigation<RdvDetailsNavigationProp>();
    const route = useRoute<RdvDetailsRouteProp>();
    const { event } = route.params;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>("");
    const [projectLoading, setProjectLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState("Fetching data...");
    const [registrations, setRegistrations] = useState<IRegistration[]>([]);
    const [hasJenkinsCredentials, setHasJenkinsCredentials] = useState(false);
    const [jenkinsBuildInfo, setJenkinsBuildInfo] = useState<
        Record<string, any>
    >({});
    const [jenkinsLoadingLogins, setJenkinsLoadingLogins] = useState<
        Set<string>
    >(new Set());
    const [jenkinsTeamBuildInfo, setJenkinsTeamBuildInfo] = useState<
        Record<string, any>
    >({});
    const [jenkinsTeamLoadingIds, setJenkinsTeamLoadingIds] = useState<
        Set<string>
    >(new Set());

    useEffect(() => {
        fetchRdvData();
        checkJenkinsCredentials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Fetch Jenkins build info when project name and credentials are ready
     */
    useEffect(() => {
        if (
            hasJenkinsCredentials &&
            projectName &&
            registrations.length > 0 &&
            !projectLoading
        ) {
            console.log(
                "[RdvDetails] Fetching Jenkins build info for all registrations",
            );

            registrations.forEach((registration) => {
                if (registration.type === "group") {
                    // Fetch team-level build info for groups
                    const teamId = registration.members
                        .map((m) => m.login)
                        .join("_");
                    if (!jenkinsTeamBuildInfo[teamId]) {
                        fetchJenkinsTeamBuildInfo(registration);
                    }
                } else {
                    // Fetch individual build info for single registrations
                    registration.members.forEach((member) => {
                        if (!jenkinsBuildInfo[member.login]) {
                            fetchJenkinsBuildInfo(member.login);
                        }
                    });
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        hasJenkinsCredentials,
        projectName,
        registrations.length,
        projectLoading,
    ]);

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
                await intraApi.getActivityDetails(event);
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
     * Check if Jenkins credentials are configured
     */
    const checkJenkinsCredentials = async () => {
        try {
            const has = await jenkinsService.hasCredentials();
            setHasJenkinsCredentials(has);
            console.log("[RdvDetails] Jenkins credentials available:", has);
        } catch (error) {
            console.error(
                "[RdvDetails] Error checking Jenkins credentials:",
                error,
            );
            setHasJenkinsCredentials(false);
        }
    };

    /**
     * Constructs Jenkins job path for a given student login
     */
    const getJenkinsJobPath = (login: string): string => {
        const moduleCode = event.codemodule.toUpperCase();
        const moduleBase = moduleCode.split("-").slice(0, -1).join("-");
        const year = event.scolaryear;
        const instance = event.codeinstance;
        const cleanLogin = login.replace("@epitech.eu", "");

        return `/view/${moduleBase}/job/${moduleCode}/job/${projectName}/job/${year}/job/${instance}/job/${cleanLogin}`;
    };

    /**
     * Constructs Jenkins job path for a team with assembled member logins
     */
    const getJenkinsTeamJobPath = (item: IRegistration): string => {
        const year = event.scolaryear;
        const instance = event.codeinstance;
        const moduleCode = event.codemodule.toUpperCase();
        const moduleBase = moduleCode.split("-").slice(0, -1).join("-");

        const teamChief = item.master.login?.replace("@epitech.eu", "");

        const cleanedMembers = item.members.reduce<string[]>((acc, m) => {
            if (m.login === item.master.login) return acc;
            else return [...acc, m.login.replace("@epitech.eu", "")];
        }, []);

        console.log("[RdvDetails] Team chief for Jenkins path:", teamChief);
        console.log(
            "[RdvDetails] Team members for Jenkins path:",
            cleanedMembers,
        );

        const teamMembersWithoutChief =
            cleanedMembers.length > 0 ? `${cleanedMembers.join("_")}` : "";

        return `/view/${moduleBase}/job/${moduleCode}/job/${projectName}/job/${year}/job/${instance}/job/${teamChief}${teamMembersWithoutChief ? `_${teamMembersWithoutChief}` : ""}`;
    };

    /**
     * Constructs Jenkins URL for a given student login
     * Pattern: https://jenkins.epitest.eu/view/{MODULE}/job/{MODULE}/job/{PROJECT_NAME}/job/{YEAR}/job/{INSTANCE}/job/{LOGIN}/
     */
    const getJenkinsUrl = (login: string): string => {
        const baseUrl = "https://jenkins.epitest.eu";
        const jobPath = getJenkinsJobPath(login);
        return `${baseUrl}${jobPath}`;
    };

    /**
     * Constructs Jenkins URL for a team with assembled member logins
     */
    const getJenkinsTeamUrl = (item: IRegistration): string => {
        const baseUrl = "https://jenkins.epitest.eu";
        const jobPath = getJenkinsTeamJobPath(item);
        return `${baseUrl}${jobPath}`;
    };

    /**
     * Fetch Jenkins build information for a student
     */
    const fetchJenkinsBuildInfo = async (login: string) => {
        if (!hasJenkinsCredentials || !projectName) {
            return null;
        }

        try {
            const loadingSet = new Set(jenkinsLoadingLogins);
            loadingSet.add(login);
            setJenkinsLoadingLogins(loadingSet);

            const jobPath = getJenkinsJobPath(login);
            const buildInfo = await jenkinsApi.getLastBuild(jobPath);

            setJenkinsBuildInfo((prev) => ({
                ...prev,
                [login]: buildInfo,
            }));

            console.log(
                `[RdvDetails] ✓ Build info fetched for ${login}:`,
                buildInfo,
            );

            const newSet = new Set(jenkinsLoadingLogins);
            newSet.delete(login);
            setJenkinsLoadingLogins(newSet);

            return buildInfo;
        } catch (error: any) {
            console.warn(
                `[RdvDetails] Failed to fetch Jenkins build info for ${login}:`,
                error.message,
            );

            const newSet = new Set(jenkinsLoadingLogins);
            newSet.delete(login);
            setJenkinsLoadingLogins(newSet);

            return null;
        }
    };

    /**
     * Fetch Jenkins team build information
     */
    const fetchJenkinsTeamBuildInfo = async (item: IRegistration) => {
        if (!hasJenkinsCredentials || !projectName) {
            return null;
        }

        try {
            const teamId = item.members.map((m) => m.login).join("_");
            const loadingSet = new Set(jenkinsTeamLoadingIds);
            loadingSet.add(teamId);
            setJenkinsTeamLoadingIds(loadingSet);

            const jobPath = getJenkinsTeamJobPath(item);
            const buildInfo = await jenkinsApi.getLastBuild(jobPath);

            setJenkinsTeamBuildInfo((prev) => ({
                ...prev,
                [teamId]: buildInfo,
            }));

            console.log(
                `[RdvDetails] ✓ Team build info fetched for ${teamId}:`,
                buildInfo,
            );

            const newSet = new Set(jenkinsTeamLoadingIds);
            newSet.delete(teamId);
            setJenkinsTeamLoadingIds(newSet);

            return buildInfo;
        } catch (error: any) {
            console.warn(
                `[RdvDetails] Failed to fetch Jenkins team build info:`,
                error.message,
            );

            const newSet = new Set(jenkinsTeamLoadingIds);
            newSet.delete(item.members.map((m) => m.login).join("_"));
            setJenkinsTeamLoadingIds(newSet);

            return null;
        }
    };

    /**
     * Constructs Jenkins build trigger URL
     */
    const getJenkinsBuildTriggerUrl = (login: string): string => {
        const jobPath = getJenkinsJobPath(login);
        const baseUrl = "https://jenkins.epitest.eu";
        return `${baseUrl}${jobPath}/build?delay=0sec`;
    };

    /**
     * Trigger a Jenkins build for testing
     */
    const triggerJenkinsBuild = async (login: string) => {
        if (!hasJenkinsCredentials || !projectName) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Jenkins credentials not configured",
                position: "top",
            });
            return;
        }

        try {
            const buildUrl = getJenkinsBuildTriggerUrl(login);
            console.log("[RdvDetails] Triggering Jenkins build:", buildUrl);

            // Get auth header for the request
            const authHeader = await jenkinsService.getAuthHeader();
            const baseUrl = await jenkinsService.getBaseUrl();

            // Fetch Jenkins-Crumb token
            let crumbToken = "";
            try {
                const crumbUrl = `${baseUrl}/crumbIssuer/api/json`;
                const crumbResponse = await fetch(crumbUrl, {
                    method: "GET",
                    headers: {
                        Authorization: authHeader,
                    },
                });
                if (crumbResponse.ok) {
                    const crumbData = await crumbResponse.json();
                    crumbToken = crumbData.crumb || "";
                    console.log("[RdvDetails] ✓ Jenkins-Crumb fetched");
                }
            } catch (crumbError) {
                console.warn(
                    "[RdvDetails] Failed to fetch Jenkins-Crumb:",
                    crumbError,
                );
            }

            // Build parameters
            const parameters = [
                { name: "VISIBILITY", value: "Private" },
                { name: "DELIVERY", value: "Git" },
                { name: "FORCE", value: false },
                { name: "CHECKOUT_DELIVERY_DATETIME", value: "" },
            ];

            const headers: Record<string, string> = {
                Authorization: authHeader,
                "Content-Type": "application/x-www-form-urlencoded",
            };

            // Add Jenkins-Crumb if available
            if (crumbToken) {
                headers["Jenkins-Crumb"] = crumbToken;
            }

            // Build form data for parameters
            const formData = new URLSearchParams();
            parameters.forEach((param) => {
                formData.append(param.name, String(param.value));
            });

            const response = await fetch(buildUrl, {
                method: "POST",
                headers,
                body: formData.toString(),
            });

            if (
                response.ok ||
                response.status === 201 ||
                response.status === 303
            ) {
                Toast.show({
                    type: "success",
                    text1: "Build started",
                    text2: `Build triggered for ${login}`,
                    position: "top",
                });
                console.log("[RdvDetails] ✓ Build triggered successfully");
            } else {
                throw new Error(`Jenkins returned status ${response.status}`);
            }
        } catch (error: any) {
            console.error(
                "[RdvDetails] Failed to trigger Jenkins build:",
                error,
            );
            Toast.show({
                type: "error",
                text1: "Build failed",
                text2: error.message || "Failed to trigger build",
                position: "top",
            });
        }
    };

    /**
     * Open Jenkins in browser
     */
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

    /**
     * Open Jenkins build page
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const openJenkinsBuild = async (login: string) => {
        if (!projectName) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Project name not loaded yet",
                position: "top",
            });
            return;
        }

        // If build info not cached, fetch it first
        let buildInfo = jenkinsBuildInfo[login];
        if (!buildInfo) {
            buildInfo = await fetchJenkinsBuildInfo(login);
        }

        if (!buildInfo || !buildInfo.url) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Could not fetch build information",
                position: "top",
            });
            return;
        }

        Linking.openURL(buildInfo.url).catch((err) => {
            console.error("[RdvDetails] Failed to open Jenkins build:", err);
        });
    };

    /**
     * Get build status badge color
     */
    const getBuildStatusColor = (
        status: string,
    ): { bg: string; text: string } => {
        switch (status?.toUpperCase()) {
            case "SUCCESS":
                return { bg: "bg-green-100", text: "text-green-700" };
            case "FAILURE":
                return { bg: "bg-red-100", text: "text-red-700" };
            case "UNSTABLE":
                return { bg: "bg-yellow-100", text: "text-yellow-700" };
            case "ABORTED":
                return { bg: "bg-gray-100", text: "text-gray-700" };
            default:
                return { bg: "bg-blue-100", text: "text-blue-700" };
        }
    };

    const getrdvdate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const renderRegistration = ({ item }: { item: IRegistration }) => {
        const title = `${item.title}`;
        const logins = item.members
            .map((m) => {
                const words = m.login
                    .replace(/@.*/, "")
                    .replace(/[-\.]/g, " ")
                    .split(" ")
                    .map(
                        (word) =>
                            word.charAt(0).toUpperCase() +
                            word.slice(1).toLowerCase(),
                    );

                // Make the last word uppercase
                if (words.length > 0) {
                    words[words.length - 1] =
                        words[words.length - 1].toUpperCase();
                }

                return words.join(" ");
            })
            .join(", ");

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
            return "N/A";
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
        } else if (mainStatus && mainStatus !== "N/A") {
            badgeColor = "bg-blue-100";
            textColor = "text-blue-700";
        }

        return (
            <View className="border-tertiary/20 mb-3 border border-white p-4">
                {/* Avatar */}
                <View className="flex-row items-center">
                    <View className="flex-1">
                        <View className="flex-row items-center">
                            {item.members.length > 0 ? (
                                item.members.map((member, idx) => {
                                    const original = member.picture;
                                    let miniview = original;
                                    if (original && original.endsWith(".bmp")) {
                                        const match = original.match(
                                            /\/file\/userprofil\/(.+)\.bmp$/,
                                        );
                                        if (match && match[1])
                                            miniview = `/file/userprofil/profilview/${match[1]}.jpg`;
                                    }
                                    return miniview ? (
                                        <Image
                                            key={member.login}
                                            source={{
                                                uri: `https://intra.epitech.eu${miniview}`,
                                            }}
                                            className={`h-10 w-10 rounded-full border-2 border-primary bg-black`}
                                        />
                                    ) : (
                                        <View
                                            key={member.login}
                                            className={`h-10 w-10 items-center justify-center rounded-full bg-primary`}
                                        >
                                            <Text className="text-xs font-bold text-white">
                                                {member.login
                                                    .substring(0, 1)
                                                    .toUpperCase()}
                                            </Text>
                                        </View>
                                    );
                                })
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
                    </View>
                    {/* Status/Note Badge */}
                    <View
                        className={`border border-primary p-2 ${badgeColor} ml-2`}
                    >
                        <Text className={`text-xs font-bold ${textColor}`}>
                            {mainStatus}
                        </Text>
                    </View>
                    {/* Jenkins URL Button */}
                    <TouchableOpacity
                        className="ml-2 rounded bg-primary p-2"
                        onPress={() => {
                            if (hasJenkinsCredentials)
                                fetchJenkinsTeamBuildInfo(item);
                            const teamUrl = getJenkinsTeamUrl(item);
                            Linking.openURL(teamUrl).catch((err) => {
                                console.error(
                                    "[RdvDetails] Failed to open Jenkins URL:",
                                    err,
                                );
                            });
                        }}
                    >
                        <Ionicons name="link-outline" size={16} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() =>
                            triggerJenkinsBuild(item.members[0].login)
                        }
                        className="ml-2 rounded bg-green-500 p-2"
                    >
                        <Ionicons name="play-outline" size={16} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <View className="flex-row items-center">
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
                            numberOfLines={3}
                        >
                            {logins}
                        </Text>
                    </View>
                </View>

                <View className="mt-2 flex-row items-center justify-center space-x-4">
                    {(() => {
                        const teamId = item.members
                            .map((m) => m.login)
                            .join("_");
                        const teamBuildInfo = jenkinsTeamBuildInfo[teamId];
                        const isTeamLoading = jenkinsTeamLoadingIds.has(teamId);

                        if (hasJenkinsCredentials && teamBuildInfo) {
                            // Show build status when available
                            const { bg, text } = getBuildStatusColor(
                                teamBuildInfo.status,
                            );
                            return (
                                <TouchableOpacity
                                    onPress={() => {
                                        Linking.openURL(
                                            teamBuildInfo.url,
                                        ).catch((err) => {
                                            console.error(
                                                "[RdvDetails] Failed to open Jenkins build:",
                                                err,
                                            );
                                        });
                                    }}
                                    className={`flex-row items-center justify-between rounded px-4 py-3 ${bg}`}
                                >
                                    <View className="flex-1">
                                        <Text
                                            className={`text-sm font-semibold ${text}`}
                                            style={{
                                                fontFamily:
                                                    "IBMPlexSansSemiBold",
                                            }}
                                        >
                                            Build: {teamBuildInfo.displayName}
                                        </Text>
                                        <Text
                                            className={`text-xs ${text}`}
                                            style={{
                                                fontFamily: "IBMPlexSans",
                                            }}
                                        >
                                            Status: {teamBuildInfo.status}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="open-outline"
                                        size={16}
                                        color={
                                            text === "text-green-700"
                                                ? "#15803d"
                                                : text === "text-red-700"
                                                  ? "#dc2626"
                                                  : text === "text-yellow-700"
                                                    ? "#ca8a04"
                                                    : "#374151"
                                        }
                                    />
                                </TouchableOpacity>
                            );
                        } else if (hasJenkinsCredentials && isTeamLoading) {
                            // Show loading indicator while fetching
                            return (
                                <View className="flex-row items-center justify-center rounded bg-blue-100 px-4 py-3">
                                    <ActivityIndicator
                                        size="small"
                                        color="#1e40af"
                                    />
                                    <Text
                                        className="ml-2 text-sm text-blue-700"
                                        style={{
                                            fontFamily: "IBMPlexSans",
                                        }}
                                    >
                                        Fetching build info...
                                    </Text>
                                </View>
                            );
                        } else {
                            // Fallback to regular Jenkins link
                            return (
                                <TouchableOpacity
                                    onPress={async () => {
                                        let url = `${await jenkinsService.getBaseUrl()}/job/${item.master.login.replace("@epitech.eu", "")}${item.members.length > 0 ? `_${item.members.map((member) => member.login.replace("@epitech.eu", "")).join('_')}` : ''}`;
                                        console.log("[RdvDetails] Opening Jenkins URL:", url);
                                        window.open(
                                            url,
                                            "_blank",
                                        )
                                    }}
                                    className="flex-row items-center justify-center rounded bg-primary px-4 py-3"
                                >
                                    <Ionicons
                                        name="open-outline"
                                        size={16}
                                        color="white"
                                    />
                                    <Text
                                        className="ml-2 text-sm font-bold text-white"
                                        style={{
                                            fontFamily: "IBMPlexSansSemiBold",
                                        }}
                                    >
                                        View Jenkins
                                    </Text>
                                </TouchableOpacity>
                            );
                        }
                    })()}
                    <TouchableOpacity
                        onPress={() =>
                            navigation.navigate("RdvMark", { event })
                        }
                        className="flex-row items-center justify-center rounded bg-primary px-4 py-3"
                    >
                        <Ionicons
                            name="bookmark-outline"
                            size={16}
                            color="white"
                        />
                        <Text
                            className="ml-2 text-sm font-bold text-white"
                            style={{
                                fontFamily: "IBMPlexSansSemiBold",
                            }}
                        >
                            {hasJenkinsCredentials
                                ? "View Build"
                                : "Noter"}
                            {" - "}
                            {getrdvdate(item.date ? item.date : event.start)}
                        </Text>
                    </TouchableOpacity>
                </View>

                {projectLoading && (
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
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="rounded bg-green-500 p-2"
                >
                    <Ionicons name="play-outline" size={24} color="white" />
                </TouchableOpacity>
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
