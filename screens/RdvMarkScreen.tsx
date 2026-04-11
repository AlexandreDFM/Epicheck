/**
 * File Name: RdvMarkScreen.tsx
 * Description: Screen to mark and grade RDV (Follow-up) events
 */

import {
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    TextInput,
    ScrollView,
} from "react-native";
import {
    useRoute,
    useNavigation,
    RouteProp,
    NavigationProp,
} from "@react-navigation/native";

import { useEffect, useState } from "react";
import intraApi from "../services/intraApi";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { IIntraEvent } from "../types/IIntraEvent";
import { IBaremeData } from "../types/IBaremeMark";
import baremeService from "../services/baremeService";
import rdvService, { IRegistration } from "../services/rdvService";

type RootStackParamList = {
    RdvMark: { event: IIntraEvent };
};

type RdvMarkRouteProp = RouteProp<RootStackParamList>;
type RdvMarkNavigationProp = NavigationProp<RootStackParamList>;

export default function RdvMarkScreen() {
    const route = useRoute<RdvMarkRouteProp>();
    const navigation = useNavigation<RdvMarkNavigationProp>();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRegistration, setSelectedRegistration] =
    useState<IRegistration | null>(null);
    const [groupName, setGroupName] = useState<string>("");
    const [baremeData, setBaremeData] = useState<IBaremeData | null>(null);
    const [editedMarks, setEditedMarks] = useState<Record<string, any>>({});

    const { event } = route.params;

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch RDV registrations
            const rdvData = await intraApi.getRdvRegistrations(event);
            const parsed = rdvService.parseRdvData(rdvData);

            // Extract group name from registrations
            // Group name format: ProjectCode-ProjectName-Instance-StudentLogin
            // Example: G4-SEC-Hack-&-Juice-LYN-4-1-firstname.lastname@epitech.eu
            if (parsed.length > 0) {
                const firstRegistration = parsed[0];
                const firstMember = parsed[0].master;

                // Set the selected registration
                setSelectedRegistration(firstRegistration);

                // Get project name from RDV data
                let projectName = "project";
                if (rdvData?.project?.title) {
                    // Format: "[G4][SEC] Hack & Juice" or similar
                    // Step 1: Extract the codes from brackets: [G4][SEC] -> G4-SEC
                    const brackets =
                        rdvData.project.title.match(/\[([^\]]+)\]/g) || [];
                    const codes = brackets
                        .map((b: string) => b.slice(1, -1))
                        .join("-");

                    // Step 2: Remove all brackets and get the remaining text
                    const title = rdvData.project.title
                        .replace(/\[[^\]]*\]/g, "")
                        .trim();

                    // Step 3: Combine codes + title
                    projectName =
                        codes && title
                            ? `${codes}-${title}`
                            : codes || title || "project";
                }

                // Replace spaces with dashes
                console.log("[RdvMark] Original project name:", projectName);
                const fullProjectTitle = projectName.replace(/[+]+[-]+\s+/g, "-");
                console.log("[RdvMark] Derived project name:", fullProjectTitle);

                const groupNameValue = `${fullProjectTitle}-${event.codeinstance}-${firstMember.login}`;
                setGroupName(groupNameValue);

                // Fetch bareme marks
                try {
                    const marks = await baremeService.getBaremeMarks(
                        event,
                        groupNameValue + "/?format=json",
                    );
                    setBaremeData(marks);

                    // Initialize edited marks from fetched data
                    const initialMarks: Record<string, any> = {};
                    marks.marks.forEach((mark) => {
                        initialMarks[mark.login] = { ...mark };
                    });
                    setEditedMarks(initialMarks);
                } catch (baremeError) {
                    console.warn(
                        "[RdvMark] Failed to fetch bareme marks:",
                        baremeError,
                    );
                    // Continue without bareme marks
                }
            }
        } catch (err: any) {
            console.error("[RdvMark] Error fetching data:", err);
            setError(err.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleCommentChange = (login: string, value: string) => {
        setEditedMarks((prev) => ({
            ...prev,
            [login]: {
                ...prev[login],
                comment: value,
            },
        }));
    };

    const handleSaveMarks = async () => {
        try {
            setSaving(true);

            const marks = Object.values(editedMarks);
            await baremeService.saveBaremeMarks(event, groupName, marks);

            Toast.show({
                type: "success",
                text1: "Success",
                text2: "Marks saved successfully",
                position: "top",
            });

            // Refresh data after save
            await fetchData();
        } catch (err: any) {
            console.error("[RdvMark] Error saving marks:", err);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: err.message || "Failed to save marks",
                position: "top",
            });
        } finally {
            setSaving(false);
        }
    };

    const renderRegistrationItem = ({ item }: { item: IRegistration }) => {
        return (
            <View className="mb-4 rounded-lg bg-white p-4">
                {/* Team Members Header */}
                {baremeData?.response?.team && baremeData.response.team.length > 0 && (
                    <View className="mb-4 border-b border-gray-100 pb-4">
                        <Text className="mb-3 font-semibold text-gray-700">Team Members</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {baremeData.response.team.map((member) => (
                                <View
                                    key={member.login}
                                    className="flex-row items-center rounded-full bg-gray-50 px-3 py-1"
                                >
                                    {member.picture && (
                                        <Image
                                            source={{
                                                uri: `https://intra.epitech.eu${member.picture}`,
                                            }}
                                            className="mr-2 h-6 w-6 rounded-full"
                                        />
                                    )}
                                    <Text className="text-xs font-medium text-gray-700">
                                        {member.title}
                                        {member.master === 1 && (
                                            <Text className="text-xs text-red-500"> (Leader)</Text>
                                        )}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Bareme Questions/Marks */}
                {baremeData && baremeData.groups.length > 0 ? (
                    <View className="space-y-4">
                        {baremeData.groups.map((group) => (
                            <View key={group.name} className="border-t border-gray-100 pt-4">
                                <Text className="mb-2 text-sm font-semibold text-gray-800">
                                    {group.name}
                                </Text>

                                {group.questions.map((question) => (
                                    <View key={question.id} className="mb-4">
                                        <Text className="mb-2 text-xs text-gray-600">
                                            {question.comment}
                                        </Text>

                                        {/* Marks Selection Buttons */}
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            className="mb-2"
                                        >
                                            <View className="flex-row gap-2">
                                                {question.scales.map((scale) => {
                                                    const isSelected =
                                                        baremeData.marks[0]?.marks[question.id] ===
                                                        scale.name;
                                                    return (
                                                        <TouchableOpacity
                                                            key={scale.name}
                                                            onPress={() => {
                                                                // Update marks for all team members
                                                                const newMarks = { ...editedMarks };
                                                                baremeData.response.team.forEach(
                                                                    (member) => {
                                                                        if (!newMarks[member.login]) {
                                                                            newMarks[member.login] = {
                                                                                login: member.login,
                                                                                name: member.title,
                                                                                marks: {},
                                                                                comment: "",
                                                                            };
                                                                        }
                                                                        newMarks[member.login].marks[
                                                                            question.id
                                                                        ] = scale.name;
                                                                    },
                                                                );
                                                                setEditedMarks(newMarks);
                                                            }}
                                                            className={`rounded-lg px-3 py-2 ${
                                                                isSelected
                                                                    ? "bg-blue-500"
                                                                    : "border border-gray-300 bg-gray-100"
                                                            }`}
                                                        >
                                                            <Text
                                                                className={`text-sm font-semibold ${
                                                                    isSelected
                                                                        ? "text-white"
                                                                        : "text-gray-700"
                                                                }`}
                                                            >
                                                                {scale.name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </ScrollView>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="py-2">
                        <Text className="text-xs italic text-gray-500">
                            No bareme questions available
                        </Text>
                    </View>
                )}

                {/* Comment Section */}
                <View className="mt-3 border-t border-gray-100 pt-3">
                    <Text className="mb-2 text-sm font-semibold text-gray-700">Notes</Text>
                    <TextInput
                        className="max-h-20 rounded border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Add comments..."
                        multiline
                        numberOfLines={3}
                        value={
                            baremeData?.response?.team?.[0]
                                ? editedMarks[baremeData.response.team[0].login]?.comment || ""
                                : ""
                        }
                        onChangeText={(value) => {
                            if (baremeData?.response?.team?.[0]) {
                                handleCommentChange(baremeData.response.team[0].login, value);
                            }
                        }}
                    />
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
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
                        className="text-xl font-bold text-white"
                        style={{ fontFamily: "Anton" }}
                    >
                        MARK PRESENCE
                    </Text>
                    <Text className="text-xs text-white/80">
                        {groupName && `Group: ${groupName}`}
                    </Text>
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0ea5e9" />
                    <Text className="mt-4 text-gray-600">Loading marks...</Text>
                </View>
            ) : error ? (
                <View className="flex-1 items-center justify-center p-4">
                    <Ionicons
                        name="alert-circle-outline"
                        size={48}
                        color="#ef4444"
                    />
                    <Text className="mt-4 text-center text-lg font-semibold text-red-500">
                        Error
                    </Text>
                    <Text className="mt-2 text-center text-gray-600">
                        {error}
                    </Text>
                    <TouchableOpacity
                        className="mt-6 rounded bg-primary px-6 py-3"
                        onPress={fetchData}
                    >
                        <Text className="font-bold text-white">Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView className="flex-1 p-4">
                    {!selectedRegistration ? (
                        <View className="items-center justify-center py-8">
                            <Ionicons
                                name="alert-circle-outline"
                                size={48}
                                color="#9ca3af"
                            />
                            <Text className="mt-4 text-center text-gray-500">
                                No registration selected
                            </Text>
                        </View>
                    ) : (
                        <>
                            {renderRegistrationItem({
                                item: selectedRegistration,
                            })}

                            {/* Save Button */}
                            <TouchableOpacity
                                onPress={handleSaveMarks}
                                disabled={saving}
                                className={`mb-6 mt-6 flex-row items-center justify-center rounded py-3 ${
                                    saving ? "bg-gray-400" : "bg-green-500"
                                }`}
                            >
                                {saving ? (
                                    <>
                                        <ActivityIndicator
                                            size="small"
                                            color="white"
                                        />
                                        <Text className="ml-2 font-bold text-white">
                                            Saving...
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons
                                            name="checkmark-circle-outline"
                                            size={20}
                                            color="white"
                                        />
                                        <Text className="ml-2 font-bold text-white">
                                            Save Marks
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
