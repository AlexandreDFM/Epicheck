/**
 * File Name: RdvDetailsScreen.tsx
 * Description: Screen to display details of an RDV event and its registered students/groups.
 */

import {
    View,
    Text,
    Modal,
    Image,
    Switch,
    Linking,
    FlatList,
    TextInput,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import {
    useRoute,
    RouteProp,
    useNavigation,
    NavigationProp,
} from "@react-navigation/native";

import { useEffect, useState } from "react";
import intraApi from "../services/intraApi";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import jenkinsApi from "../services/jenkinsApi";
import { IIntraEvent } from "../types/IIntraEvent";
import { useTheme } from "../contexts/ThemeContext";
import { IActivityNote } from "../types/IActivityNote";
import jenkinsService from "../services/jenkinsService";
import { SafeAreaView } from "react-native-safe-area-context";
import rdvService, { IRegistration } from "../services/rdvService";

type RootStackParamList = {
    RdvDetails: { event: IIntraEvent };
    RdvMark: { event: IIntraEvent; masterLogin: string; groupName: string };
};

type RdvDetailsRouteProp = RouteProp<RootStackParamList>;
type RdvDetailsNavigationProp = NavigationProp<RootStackParamList>;

export default function RdvDetailsScreen() {
    const navigation = useNavigation<RdvDetailsNavigationProp>();
    const route = useRoute<RdvDetailsRouteProp>();
    const { event } = route.params;

    const { isDark } = useTheme();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>("");
    const [projectLoading, setProjectLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState("Fetching data...");
    const [registrations, setRegistrations] = useState<IRegistration[]>([]);
    const [hasJenkinsCredentials, setHasJenkinsCredentials] = useState(false);
    const [jenkinsBaseUrl, setJenkinsBaseUrl] = useState("");
    const [jenkinsProjectExists, setJenkinsProjectExists] = useState<
        boolean | null
    >(null); // null = not checked yet
    const [jenkinsBuildInfo, setJenkinsBuildInfo] = useState<
        Record<string, any>
    >({});
    const [jenkinsLoadingLogins, setJenkinsLoadingLogins] = useState<
        Set<string>
    >(new Set());
    const [jenkinsTeamBuildInfo, setJenkinsTeamBuildInfo] = useState<
        Record<string, any>
    >({});
    const [rawRdvData, setRawRdvData] = useState<any>(null);
    const [jenkinsTeamLoadingIds, setJenkinsTeamLoadingIds] = useState<
        Set<string>
    >(new Set());
    const [activityNotes, setActivityNotes] = useState<
        Record<string, IActivityNote>
    >({});
    const [noteModal, setNoteModal] = useState<{
        visible: boolean;
        note: IActivityNote | null;
        allNotes?: IActivityNote[];
    }>({ visible: false, note: null });

    // Jenkins build configuration
    const [jenkinsConfig, setJenkinsConfig] = useState({
        visibility: "Private" as "Private" | "Public",
        delivery: "Git" as "Git" | "Ramassage" | "Bttf",
        force: false,
        checkoutDatetime: "",
    });
    const [jenkinsBuildModal, setJenkinsBuildModal] = useState<{
        visible: boolean;
        mode: "single" | "all";
        jobPath?: string;
        label?: string; // display name for toast after trigger
    }>({ visible: false, mode: "all" });

    useEffect(() => {
        fetchRdvData();
        checkJenkinsCredentials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Check if the Jenkins project exists, then fetch build info for each
     * registration. A single probe to the instance-level job path avoids
     * spamming dozens of 404s when an activity has no Jenkins tests at all.
     */
    useEffect(() => {
        if (
            hasJenkinsCredentials &&
            projectName &&
            registrations.length > 0 &&
            !projectLoading
        ) {
            const checkAndFetch = async () => {
                // Probe the project-level job once
                try {
                    const moduleCode = event.codemodule.toUpperCase();
                    const moduleBase = moduleCode
                        .split("-")
                        .slice(0, -1)
                        .join("-");
                    const projectPath = `/view/${moduleBase}/job/${moduleCode}/job/${projectName}/job/${event.scolaryear}/job/${event.codeinstance}`;

                    await jenkinsApi.getJobInfo(projectPath);
                    setJenkinsProjectExists(true);
                    console.log(
                        "[RdvDetails] ✓ Jenkins project exists:",
                        projectPath,
                    );
                } catch {
                    console.log(
                        "[RdvDetails] Jenkins project not found — disabling Jenkins features",
                    );
                    setJenkinsProjectExists(false);
                    return; // Don't fetch individual builds
                }

                // Project exists → fetch individual build info
                console.log(
                    "[RdvDetails] Fetching Jenkins build info for all registrations",
                );
                registrations.forEach((registration) => {
                    if (registration.type === "group") {
                        const teamId = registration.members
                            .map((m) => m.login)
                            .join("_");
                        if (!jenkinsTeamBuildInfo[teamId]) {
                            fetchJenkinsTeamBuildInfo(registration);
                        }
                    } else {
                        registration.members.forEach((member) => {
                            if (!jenkinsBuildInfo[member.login]) {
                                fetchJenkinsBuildInfo(member.login);
                            }
                        });
                    }
                });
            };

            checkAndFetch();
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
            setRawRdvData(rdvData);
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

            // Fetch notes in background (non-critical)
            intraApi
                .getActivityNotes(event)
                .then((notes) => {
                    const map: Record<string, IActivityNote> = {};
                    notes.forEach((n: IActivityNote) => {
                        if (n.login) map[n.login] = n;
                        // Also index by group members so we can look up by any member login
                        (n.group ?? []).forEach((m) => {
                            if (m.login) map[m.login] = n;
                        });
                    });
                    setActivityNotes(map);
                    console.log("[RdvDetails] ✓ Notes loaded:", notes.length);
                })
                .catch(() => {
                    /* non-critical */
                });
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

            // Always load the base URL — getBaseUrl() returns the configured
            // value or the default from jenkinsService if nothing is stored yet
            const baseUrl = await jenkinsService.getBaseUrl();
            setJenkinsBaseUrl(baseUrl);
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
        const jobPath = getJenkinsJobPath(login);
        return `${jenkinsBaseUrl}${jobPath}`;
    };

    /**
     * Constructs Jenkins URL for a team with assembled member logins
     */
    const getJenkinsTeamUrl = (item: IRegistration): string => {
        const jobPath = getJenkinsTeamJobPath(item);
        return `${jenkinsBaseUrl}${jobPath}`;
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
     * Core build trigger — posts to a Jenkins job path with the correct
     * form body (flat fields + json payload + crumb).
     * Throws on failure so callers can handle errors.
     */
    const triggerBuildByJobPath = async (
        jobPath: string,
        config: typeof jenkinsConfig = jenkinsConfig,
    ): Promise<void> => {
        const authHeader = await jenkinsService.getAuthHeader();
        const baseUrl = await jenkinsService.getBaseUrl();
        const buildUrl = `${baseUrl}${jobPath}/build?delay=0sec`;

        console.log("[RdvDetails] Triggering Jenkins build:", buildUrl);

        // Fetch Jenkins-Crumb token (required for CSRF protection)
        let crumbToken = "";
        try {
            const crumbUrl = `${baseUrl}/crumbIssuer/api/json`;
            const crumbResponse = await fetch(crumbUrl, {
                method: "GET",
                headers: { Authorization: authHeader },
            });
            if (crumbResponse.ok) {
                const crumbData = await crumbResponse.json();
                crumbToken = crumbData.crumb || "";
                console.log("[RdvDetails] ✓ Jenkins-Crumb fetched");
            } else {
                console.warn(
                    "[RdvDetails] Crumb fetch returned:",
                    crumbResponse.status,
                );
            }
        } catch (crumbError) {
            console.warn(
                "[RdvDetails] Failed to fetch Jenkins-Crumb:",
                crumbError,
            );
        }

        // Parameters from user configuration
        const parameters: { name: string; value: string | boolean }[] = [
            { name: "VISIBILITY", value: config.visibility },
            { name: "DELIVERY", value: config.delivery },
            { name: "FORCE", value: config.force },
            {
                name: "CHECKOUT_DELIVERY_DATETIME",
                value: config.checkoutDatetime,
            },
        ];

        // ── Build the body exactly like the Jenkins browser form ──
        const parts: string[] = [];

        // 1. Flat form fields: name=X&value=Y pairs
        parameters.forEach((param) => {
            parts.push(`name=${encodeURIComponent(param.name)}`);
            if (param.value !== false) {
                parts.push(`value=${encodeURIComponent(String(param.value))}`);
            }
        });

        // 2. Hidden form fields
        parts.push("statusCode=303");
        parts.push("redirectTo=.");

        // 3. Jenkins-Crumb as flat field
        if (crumbToken) {
            parts.push(`Jenkins-Crumb=${encodeURIComponent(crumbToken)}`);
        }

        // 4. The critical `json` field — without this Jenkins returns 400
        const jsonPayload: Record<string, any> = {
            parameter: parameters.map((p) => ({
                name: p.name,
                value: p.value,
            })),
            statusCode: "303",
            redirectTo: ".",
        };
        if (crumbToken) {
            jsonPayload["Jenkins-Crumb"] = crumbToken;
        }
        parts.push(`json=${encodeURIComponent(JSON.stringify(jsonPayload))}`);

        const body = parts.join("&");

        const headers: Record<string, string> = {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
        };
        if (crumbToken) {
            headers["Jenkins-Crumb"] = crumbToken;
        }

        const response = await fetch(buildUrl, {
            method: "POST",
            headers,
            body,
            redirect: "manual",
        });

        if (
            response.ok ||
            response.status === 201 ||
            response.status === 302 ||
            response.status === 303
        ) {
            console.log(
                "[RdvDetails] ✓ Build triggered (status:",
                response.status,
                ")",
            );
        } else {
            const text = await response.text().catch(() => "");
            console.error(
                "[RdvDetails] Jenkins trigger response:",
                response.status,
                text.substring(0, 500),
            );
            throw new Error(`Jenkins returned status ${response.status}`);
        }
    };

    /**
     * Trigger Jenkins builds for ALL registrations in the activity.
     */
    const [triggeringAllBuilds, setTriggeringAllBuilds] = useState(false);

    const triggerAllBuilds = async () => {
        if (
            !hasJenkinsCredentials ||
            !projectName ||
            jenkinsProjectExists === false
        ) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Jenkins credentials not configured",
                position: "top",
            });
            return;
        }

        if (registrations.length === 0) {
            Toast.show({
                type: "info",
                text1: "No registrations",
                text2: "No groups or students to trigger builds for",
                position: "top",
            });
            return;
        }

        setTriggeringAllBuilds(true);
        let successCount = 0;
        let failCount = 0;

        Toast.show({
            type: "info",
            text1: "Triggering builds…",
            text2: `0 / ${registrations.length}`,
            position: "top",
            visibilityTime: 1500,
        });

        for (const registration of registrations) {
            try {
                const jobPath =
                    registration.type === "group"
                        ? getJenkinsTeamJobPath(registration)
                        : getJenkinsJobPath(registration.master.login);

                await triggerBuildByJobPath(jobPath, jenkinsConfig);
                successCount++;
            } catch (error: any) {
                failCount++;
                console.warn(
                    `[RdvDetails] Build trigger failed for ${registration.master.login}:`,
                    error.message,
                );
            }

            if (
                registrations.indexOf(registration) <
                registrations.length - 1
            ) {
                await new Promise((resolve) => setTimeout(resolve, 800));
            }
        }

        setTriggeringAllBuilds(false);

        Toast.show({
            type:
                failCount === 0
                    ? "success"
                    : successCount > 0
                      ? "info"
                      : "error",
            text1: "All builds triggered",
            text2: `✓ ${successCount} succeeded${failCount > 0 ? `, ✗ ${failCount} failed` : ""}`,
            position: "top",
            visibilityTime: 4000,
        });
    };

    /**
     * Called when user confirms the build config modal.
     */
    const handleBuildModalConfirm = async () => {
        const { mode, jobPath, label } = jenkinsBuildModal;
        setJenkinsBuildModal((prev) => ({ ...prev, visible: false }));

        if (mode === "single" && jobPath) {
            try {
                await triggerBuildByJobPath(jobPath, jenkinsConfig);
                Toast.show({
                    type: "success",
                    text1: "Build started",
                    text2: `Build triggered for ${label ?? "job"}`,
                    position: "top",
                });
            } catch (error: any) {
                Toast.show({
                    type: "error",
                    text1: "Build failed",
                    text2: error.message || "Failed to trigger build",
                    position: "top",
                });
            }
        } else {
            await triggerAllBuilds();
        }
    };

    /**
     * Render the Jenkins build configuration modal.
     */
    const renderJenkinsBuildModal = () => {
        if (!jenkinsBuildModal.visible) return null;

        const visibilityOptions: ("Private" | "Public")[] = [
            "Private",
            "Public",
        ];
        const deliveryOptions: ("Git" | "Ramassage" | "Bttf")[] = [
            "Git",
            "Ramassage",
            "Bttf",
        ];

        return (
            <Modal
                visible
                animationType="slide"
                transparent={false}
                backdropColor={isDark ? "#242424" : "#FFFFFF"}
                onRequestClose={() =>
                    setJenkinsBuildModal((prev) => ({
                        ...prev,
                        visible: false,
                    }))
                }
            >
                <SafeAreaView className="flex-1">
                    {/* Header */}
                    <View className="flex-row items-center bg-primary px-4 py-4">
                        <TouchableOpacity
                            onPress={() =>
                                setJenkinsBuildModal((prev) => ({
                                    ...prev,
                                    visible: false,
                                }))
                            }
                            className="mr-3 p-2"
                        >
                            <Ionicons
                                name="arrow-back"
                                size={24}
                                color="white"
                            />
                        </TouchableOpacity>
                        <View className="flex-1">
                            <Text
                                className="text-xl font-bold text-white"
                                style={{ fontFamily: "Anton" }}
                            >
                                BUILD CONFIGURATION
                            </Text>
                            <Text className="text-xs text-white/80">
                                {jenkinsBuildModal.mode === "all"
                                    ? `All registrations (${registrations.length})`
                                    : (jenkinsBuildModal.label ??
                                      "Single build")}
                            </Text>
                        </View>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        {/* VISIBILITY */}
                        <View className="mb-6">
                            <Text className="mb-1 text-xs font-semibold uppercase text-text-tertiary">
                                Visibility
                            </Text>
                            <Text className="mb-3 text-xs text-text-tertiary">
                                Private: not visible for students on
                                my.epitech.eu{"\n"}Public: visible for students
                            </Text>
                            <View className="flex-row gap-2">
                                {visibilityOptions.map((opt) => (
                                    <TouchableOpacity
                                        key={opt}
                                        onPress={() =>
                                            setJenkinsConfig((prev) => ({
                                                ...prev,
                                                visibility: opt,
                                            }))
                                        }
                                        className={`flex-1 items-center py-3 ${
                                            jenkinsConfig.visibility === opt
                                                ? "bg-primary"
                                                : "border-2 border-gray-300 bg-gray-100"
                                        }`}
                                    >
                                        <Text
                                            className={`text-sm font-semibold ${
                                                jenkinsConfig.visibility === opt
                                                    ? "text-white"
                                                    : "text-gray-700"
                                            }`}
                                        >
                                            {opt}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* DELIVERY */}
                        <View className="mb-6">
                            <Text className="mb-2 text-xs font-semibold uppercase text-text-tertiary">
                                Delivery
                            </Text>
                            <Text className="mb-3 text-xs text-text-tertiary">
                                Git: latest commit (follow-ups){"\n"}Ramassage:
                                last commit before delivery date{"\n"}Bttf:
                                latest commit (bttf grading)
                            </Text>
                            <View className="flex-row gap-2">
                                {deliveryOptions.map((opt) => (
                                    <TouchableOpacity
                                        key={opt}
                                        onPress={() =>
                                            setJenkinsConfig((prev) => ({
                                                ...prev,
                                                delivery: opt,
                                            }))
                                        }
                                        className={`flex-1 items-center py-3 ${
                                            jenkinsConfig.delivery === opt
                                                ? "bg-primary"
                                                : "border-2 border-gray-300 bg-gray-100"
                                        }`}
                                    >
                                        <Text
                                            className={`text-sm font-semibold ${
                                                jenkinsConfig.delivery === opt
                                                    ? "text-white"
                                                    : "text-gray-700"
                                            }`}
                                        >
                                            {opt}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* FORCE */}
                        <View className="mb-6">
                            <View className="flex-row items-center justify-between border border-gray-300 px-4 py-3">
                                <View className="mr-4 flex-1">
                                    <Text className="text-sm font-semibold text-text-tertiary">
                                        Force
                                    </Text>
                                    <Text className="mt-1 text-xs text-text-tertiary">
                                        Always run all tests even if no source
                                        changes
                                    </Text>
                                </View>
                                <Switch
                                    value={jenkinsConfig.force}
                                    onValueChange={(val) =>
                                        setJenkinsConfig((prev) => ({
                                            ...prev,
                                            force: val,
                                        }))
                                    }
                                    trackColor={{
                                        false: "#d1d5db",
                                        true: "#0ea5e9",
                                    }}
                                />
                            </View>
                        </View>

                        {/* CHECKOUT_DELIVERY_DATETIME */}
                        <View className="mb-6">
                            <Text className="mb-2 text-xs font-semibold uppercase text-text-tertiary">
                                Checkout Datetime (optional)
                            </Text>
                            <Text className="mb-3 text-xs text-text-tertiary">
                                ISO 8601 format, e.g. 2025-04-23T16:31:34Z
                                {"\n"}Leave empty for default behaviour
                            </Text>
                            <View className="flex-row items-center border border-gray-300 px-3 py-2">
                                <TextInput
                                    className="flex-1 text-sm text-text-secondary"
                                    style={{ fontFamily: "IBMPlexSans" }}
                                    placeholder="Not set (default)"
                                    placeholderTextColor="#9ca3af"
                                    value={jenkinsConfig.checkoutDatetime}
                                    onChangeText={(val) =>
                                        setJenkinsConfig((prev) => ({
                                            ...prev,
                                            checkoutDatetime: val,
                                        }))
                                    }
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {jenkinsConfig.checkoutDatetime ? (
                                    <TouchableOpacity
                                        onPress={() =>
                                            setJenkinsConfig((prev) => ({
                                                ...prev,
                                                checkoutDatetime: "",
                                            }))
                                        }
                                        className="ml-2 p-1"
                                    >
                                        <Ionicons
                                            name="close-circle"
                                            size={20}
                                            color="#9ca3af"
                                        />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                    </ScrollView>

                    {/* Bottom action */}
                    <View className="p-4">
                        <TouchableOpacity
                            onPress={handleBuildModalConfirm}
                            disabled={triggeringAllBuilds}
                            className={`flex-row items-center justify-center rounded py-4 ${
                                triggeringAllBuilds
                                    ? "bg-gray-400"
                                    : "bg-green-500"
                            }`}
                        >
                            {triggeringAllBuilds ? (
                                <>
                                    <ActivityIndicator
                                        size="small"
                                        color="white"
                                    />
                                    <Text className="ml-2 font-bold text-white">
                                        Triggering…
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons
                                        name="play"
                                        size={20}
                                        color="white"
                                    />
                                    <Text className="ml-2 font-bold text-white">
                                        {jenkinsBuildModal.mode === "all"
                                            ? `Build All (${registrations.length})`
                                            : "Build"}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        );
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

    const renderNoteModal = () => {
        const { visible, note, allNotes } = noteModal;
        if (!visible) return null;

        const formatNote = (n: IActivityNote) => {
            const score = n.note_finale ?? n.note;
            return score != null && score !== "" ? String(score) : "—";
        };

        return (
            <Modal
                visible={visible}
                animationType="slide"
                transparent={false}
                backdropColor={isDark ? "#242424" : "#FFFFFF"}
                onRequestClose={() =>
                    setNoteModal({ visible: false, note: null })
                }
            >
                <SafeAreaView className="flex-1">
                    {/* Modal header */}
                    <View className="flex-row items-center bg-primary px-4 py-4">
                        <TouchableOpacity
                            onPress={() =>
                                setNoteModal({ visible: false, note: null })
                            }
                            className="mr-3 p-2"
                        >
                            <Ionicons
                                name="arrow-back"
                                size={24}
                                color="white"
                            />
                        </TouchableOpacity>
                        <Text
                            className="flex-1 text-xl font-bold text-white"
                            style={{ fontFamily: "Anton" }}
                        >
                            {allNotes ? "TOUTES LES NOTES" : "NOTATION"}
                        </Text>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        {allNotes ? (
                            // Global view — all notes
                            allNotes.map((n, idx) => (
                                <View
                                    key={idx}
                                    className="mb-2 gap-y-2 border border-primary p-4"
                                >
                                    <View className="flex-row items-center justify-between">
                                        <Text className="font-semibold text-primary">
                                            {n.title ?? n.login}
                                        </Text>
                                        <View className="bg-primary p-3">
                                            <Text className="font-bold text-white">
                                                {formatNote(n)}
                                            </Text>
                                        </View>
                                    </View>
                                    {(() => {
                                        const correctorDisplay =
                                            n.grader ??
                                            n.corrector ??
                                            event.prof_inst
                                                ?.map((p) => p.title)
                                                .join(", ");
                                        if (!correctorDisplay) return null;
                                        return (
                                            <Text className="mt-2 text-xs text-tertiary">
                                                Correcteur : {correctorDisplay}
                                            </Text>
                                        );
                                    })()}
                                    {n.comment ? (
                                        <Text className="text-xs text-text-tertiary">
                                            {n.comment}
                                        </Text>
                                    ) : null}
                                </View>
                            ))
                        ) : note ? (
                            // Single group detail view
                            <View className="gap-y-4">
                                {/* Note finale */}
                                <View className="flex-row items-center justify-between border border-primary p-4">
                                    <Text className="text-lg font-bold uppercase text-primary">
                                        Note finale
                                    </Text>
                                    <Text className="text-3xl font-bold text-tertiary">
                                        {formatNote(note)}
                                    </Text>
                                </View>

                                {/* Correcteur */}
                                {(() => {
                                    const correctorDisplay =
                                        note.grader ??
                                        note.corrector ??
                                        event.prof_inst
                                            ?.map((p) => p.title)
                                            .join(", ");
                                    if (!correctorDisplay) return null;
                                    return (
                                        <View className="flex-row items-center justify-between border border-primary p-4">
                                            <Text className="text-md font-bold uppercase text-primary">
                                                Correcteur
                                            </Text>
                                            <Text className="text-md font-bold text-tertiary">
                                                {correctorDisplay}
                                            </Text>
                                        </View>
                                    );
                                })()}

                                {/* Date */}
                                {(note.correction_date ?? note.date) && (
                                    <View className="flex-row items-center justify-between border border-primary p-4">
                                        <Text className="text-md font-bold uppercase text-primary">
                                            Date de correction
                                        </Text>
                                        <Text className="text-md font-bold text-tertiary">
                                            {note.correction_date ?? note.date}
                                        </Text>
                                    </View>
                                )}

                                {/* Commentaire général */}
                                {note.comment && (
                                    <View className="border border-primary p-4">
                                        <Text className="text-md mb-2 font-semibold uppercase text-primary">
                                            Commentaire
                                        </Text>
                                        <Text className="text-sm text-text-tertiary">
                                            {note.comment}
                                        </Text>
                                    </View>
                                )}

                                {/* Critères */}
                                {note.notes && note.notes.length > 0 && (
                                    <View className="border border-primary p-4">
                                        <Text className="mb-2 text-xs font-semibold uppercase text-text-tertiary">
                                            Critères
                                        </Text>
                                        {note.notes.map((criterion, idx) => (
                                            <View
                                                key={idx}
                                                className="mb-2 flex-row items-start justify-between border-b border-gray-100 pb-2"
                                            >
                                                <Text className="mr-4 flex-1 text-xs text-primary">
                                                    {criterion.name}
                                                </Text>
                                                <Text className="text-xs font-bold text-primary">
                                                    {criterion.note ?? "—"}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Notes individuelles */}
                                {note.individuel &&
                                    note.individuel.length > 0 && (
                                        <View className="border border-primary p-4">
                                            <Text className="mb-3 text-xs font-semibold uppercase text-text-tertiary">
                                                Notes individuelles
                                            </Text>
                                            {note.individuel.map((ind, idx) => (
                                                <View
                                                    key={idx}
                                                    className="mb-2 flex-row items-center justify-between"
                                                >
                                                    <Text className="flex-1 text-xs text-primary">
                                                        {ind.title ?? ind.login}
                                                    </Text>
                                                    <View className="flex-row">
                                                        {[1, 2, 3, 4, 5].map(
                                                            (star) => (
                                                                <Ionicons
                                                                    key={star}
                                                                    name={
                                                                        parseInt(
                                                                            String(
                                                                                ind.note ??
                                                                                    "0",
                                                                            ),
                                                                            10,
                                                                        ) >=
                                                                        star
                                                                            ? "star"
                                                                            : "star-outline"
                                                                    }
                                                                    size={14}
                                                                    color="#f59e0b"
                                                                />
                                                            ),
                                                        )}
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                            </View>
                        ) : (
                            <Text className="text-center text-gray-500">
                                Aucune donnée
                            </Text>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        );
    };

    const renderRegistration = ({ item }: { item: IRegistration }) => {
        const firstMember = item.members?.[0];
        const memberCount = Array.isArray(item.members)
            ? item.members.length
            : 0;
        const title =
            item.title?.trim() ||
            (item.type === "group"
                ? `Groupe (${memberCount} membres)`
                : firstMember?.title ||
                  item.master.title ||
                  firstMember?.login ||
                  item.master.login ||
                  "Inscription sans titre");
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

        // Single source of truth: activityNotes (bareme grade)
        const gradeEntry =
            activityNotes[item.master.login] ??
            item.members.reduce<IActivityNote | undefined>(
                (found, m) => found ?? activityNotes[m.login],
                undefined,
            );

        const rawScore = gradeEntry
            ? (gradeEntry.note_finale ?? gradeEntry.note)
            : null;

        // Map special Epitech score values to human-readable labels
        const getScoreLabel = (
            score: string | number | null | undefined,
        ): string => {
            if (score === null || score === undefined || score === "")
                return "N/A";
            const num = Number(score);
            if (num === -21) return "Absent";
            if (num === -42) return "Tricheur";
            if (num === -84) return "Voleur";
            return String(score);
        };

        const scoreLabel = getScoreLabel(rawScore);
        const scoreNum =
            rawScore !== null && rawScore !== undefined && rawScore !== ""
                ? Number(rawScore)
                : null;

        // Badge styling based on score value
        let badgeStyle = "bg-gray-100 border-gray-200";
        let badgeTextStyle = "text-gray-400";
        if (scoreNum !== null) {
            if (scoreNum < 0) {
                badgeStyle = "bg-red-100 border-red-200";
                badgeTextStyle = "text-red-700";
            } else if (scoreNum > 0) {
                badgeStyle = "bg-blue-100 border-blue-200";
                badgeTextStyle = "text-blue-700";
            } else {
                // score === 0
                badgeStyle = "bg-gray-100 border-gray-200";
                badgeTextStyle = "text-gray-500";
            }
        }

        return (
            <View className="mb-3 border border-primary p-4">
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
                    {/* Score badge — always visible, tappable when graded */}
                    {gradeEntry ? (
                        <TouchableOpacity
                            onPress={() =>
                                setNoteModal({
                                    visible: true,
                                    note: gradeEntry,
                                })
                            }
                            className={`ml-2 border p-2 ${badgeStyle}`}
                        >
                            <Text
                                className={`text-xs font-bold ${badgeTextStyle}`}
                            >
                                {scoreLabel}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View className="ml-2 border border-gray-200 bg-gray-100 p-2">
                            <Text className="text-xs font-bold text-gray-400">
                                N/A
                            </Text>
                        </View>
                    )}
                    {/* Jenkins URL Button */}
                    <TouchableOpacity
                        disabled={jenkinsProjectExists === false}
                        className={`ml-2 p-2 ${jenkinsProjectExists === false ? "bg-gray-400" : "bg-primary"}`}
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
                        disabled={jenkinsProjectExists === false}
                        onPress={() => {
                            const jobPath =
                                item.type === "group"
                                    ? getJenkinsTeamJobPath(item)
                                    : getJenkinsJobPath(item.members[0].login);
                            const label =
                                item.master.login?.replace("@epitech.eu", "") ??
                                "job";
                            setJenkinsBuildModal({
                                visible: true,
                                mode: "single",
                                jobPath,
                                label,
                            });
                        }}
                        className={`ml-2 p-2 ${jenkinsProjectExists === false ? "bg-gray-400" : "bg-green-500"}`}
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

                <View className="mt-2 flex-row items-center justify-center gap-x-2">
                    {(() => {
                        const teamId = item.members
                            .map((m) => m.login)
                            .join("_");
                        const teamBuildInfo = jenkinsTeamBuildInfo[teamId];
                        const isTeamLoading = jenkinsTeamLoadingIds.has(teamId);

                        if (jenkinsProjectExists === false) {
                            // Project doesn't exist on Jenkins — greyed out
                            return (
                                <View className="flex-row items-center justify-center bg-gray-100 p-4">
                                    <Ionicons
                                        name="close-circle-outline"
                                        size={16}
                                        color="#9ca3af"
                                    />
                                    <Text
                                        className="ml-2 text-sm text-gray-400"
                                        style={{
                                            fontFamily: "IBMPlexSans",
                                        }}
                                    >
                                        No Jenkins tests
                                    </Text>
                                </View>
                            );
                        } else if (hasJenkinsCredentials && teamBuildInfo) {
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
                                    className={`flex-row items-center justify-between p-4 ${bg}`}
                                >
                                    <View className="flex-row items-center gap-x-2">
                                        <Ionicons
                                            name="open-outline"
                                            size={16}
                                            color={
                                                text === "text-green-700"
                                                    ? "#15803d"
                                                    : text === "text-red-700"
                                                      ? "#dc2626"
                                                      : text ===
                                                          "text-yellow-700"
                                                        ? "#ca8a04"
                                                        : "#374151"
                                            }
                                        />
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
                                            {teamBuildInfo.status}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        } else if (hasJenkinsCredentials && isTeamLoading) {
                            // Show loading indicator while fetching
                            return (
                                <View className="flex-row items-center justify-center bg-blue-100 p-4">
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
                                        let url = `${await jenkinsService.getBaseUrl()}/job/${item.master.login.replace("@epitech.eu", "")}${item.members.length > 0 ? `_${item.members.map((member) => member.login.replace("@epitech.eu", "")).join("_")}` : ""}`;
                                        console.log(
                                            "[RdvDetails] Opening Jenkins URL:",
                                            url,
                                        );
                                        await Linking.openURL(url);
                                    }}
                                    className="flex-row items-center justify-center bg-primary p-4"
                                >
                                    <Ionicons
                                        name="open-outline"
                                        size={16}
                                        color="white"
                                    />
                                    <Text
                                        className="text-sm font-bold text-white"
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
                        onPress={() => {
                            const groupName = rawRdvData
                                ? rdvService.buildGroupName(
                                      rawRdvData,
                                      event,
                                      item.master.login,
                                  )
                                : `${event.codeinstance}-${item.master.login}`;
                            navigation.navigate("RdvMark", {
                                event,
                                masterLogin: item.master.login,
                                groupName,
                            });
                        }}
                        className="flex-row items-center justify-center bg-primary p-4"
                    >
                        <View className="flex-row items-center gap-x-2">
                            <Ionicons
                                name="bookmark-outline"
                                size={16}
                                color="white"
                            />
                            <Text
                                className="text-sm font-bold text-white"
                                style={{
                                    fontFamily: "IBMPlexSansSemiBold",
                                }}
                            >
                                {"Noter - "}
                                {getrdvdate(
                                    item.date ? item.date : event.start,
                                )}
                            </Text>
                        </View>
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
            {renderNoteModal()}
            {renderJenkinsBuildModal()}
            {/* Header */}
            <View className="flex-row items-center gap-x-2 bg-primary p-4">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="p-2"
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text
                        className="text-xl text-white"
                        style={{ fontFamily: "Anton" }}
                    >
                        {event.acti_title.toUpperCase()}
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
                    onPress={() => {
                        const allNotes = Object.values(activityNotes).filter(
                            (n, i, arr) =>
                                arr.findIndex((x) => x.login === n.login) === i,
                        );
                        setNoteModal({ visible: true, note: null, allNotes });
                    }}
                    className="bg-tertiary p-2"
                >
                    <Ionicons name="bar-chart" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() =>
                        setJenkinsBuildModal({
                            visible: true,
                            mode: "all",
                        })
                    }
                    disabled={
                        triggeringAllBuilds ||
                        !hasJenkinsCredentials ||
                        !projectName ||
                        jenkinsProjectExists === false
                    }
                    className={`p-2 ${
                        triggeringAllBuilds ||
                        !hasJenkinsCredentials ||
                        !projectName ||
                        jenkinsProjectExists === false
                            ? "bg-gray-400"
                            : "bg-green-500"
                    }`}
                >
                    {triggeringAllBuilds ? (
                        <ActivityIndicator size={24} color="white" />
                    ) : (
                        <Ionicons name="play-outline" size={24} color="white" />
                    )}
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
                    <View className="mb-1 border border-primary p-4">
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
