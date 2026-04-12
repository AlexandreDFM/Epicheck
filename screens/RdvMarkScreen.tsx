/**
 * File Name: RdvMarkScreen.tsx
 * Description: Screen to mark and grade RDV (Follow-up) events
 */

import {
    View,
    Text,
    Image,
    TextInput,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    Pressable,
} from "react-native";
import {
    useRoute,
    RouteProp,
    useNavigation,
    NavigationProp,
} from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";

import baremeService from "../services/baremeService";
import { IIntraEvent } from "../types/IIntraEvent";
import {
    IBaremeData,
    IBaremeMark,
    IBaremeSavePayload,
} from "../types/IBaremeMark";

type RootStackParamList = {
    RdvMark: { event: IIntraEvent; masterLogin: string; groupName: string };
};

type RdvMarkRouteProp = RouteProp<RootStackParamList>;
type RdvMarkNavigationProp = NavigationProp<RootStackParamList>;

export default function RdvMarkScreen() {
    const route = useRoute<RdvMarkRouteProp>();
    const navigation = useNavigation<RdvMarkNavigationProp>();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [groupName, setGroupName] = useState<string>("");
    const [baremeData, setBaremeData] = useState<IBaremeData | null>(null);
    const [editedMarks, setEditedMarks] = useState<Record<string, IBaremeMark>>(
        {},
    );
    const [editedComments, setEditedComments] = useState<
        Record<string, string>
    >({});
    const [criteriaComments, setCriteriaComments] = useState<
        Record<string, string>
    >({});
    const [individuelNotes, setIndividuelNotes] = useState<
        Record<string, string>
    >({});

    const { event, groupName: groupNameParam } = route.params;

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event]);

    // ---------------------------------------------------------------------------
    // Data fetching
    // ---------------------------------------------------------------------------

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            setGroupName(groupNameParam);

            const {
                baremeData: data,
                initialMarks,
                criteriaComments: loadedCriteriaComments,
                individuelNotes: loadedIndividuelNotes,
            } = await baremeService.loadFull(event, groupNameParam);

            setBaremeData(data);
            setEditedMarks(initialMarks);
            setCriteriaComments(loadedCriteriaComments);
            setIndividuelNotes(loadedIndividuelNotes);
        } catch (err: any) {
            console.error("[RdvMark] Error fetching data:", err);
            setError(err.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------

    const handleTeamCommentChange = (login: string, value: string) => {
        setEditedComments((prev) => ({ ...prev, [login]: value }));
    };

    const handleCriteriaCommentChange = (questionId: string, value: string) => {
        setCriteriaComments((prev) => ({ ...prev, [questionId]: value }));
    };

    /** Tapping the same star a second time resets the rating to 0. */
    const handleIndividuelNoteChange = (login: string, value: string) => {
        setIndividuelNotes((prev) => ({
            ...prev,
            [login]: prev[login] === value ? "0" : value,
        }));
    };

    const handleSaveMarks = async () => {
        try {
            setSaving(true);

            // All team members share the same criterion marks — use the first entry
            const firstMemberMarks = Object.values(editedMarks)[0]?.marks ?? {};

            const notes: IBaremeSavePayload["notes"] = Object.entries(
                firstMemberMarks,
            )
                .filter(
                    ([, value]) =>
                        value !== null && value !== undefined && value !== "",
                )
                .map(([criterionKey, noteValue]) => ({
                    name: criterionKey,
                    note: String(noteValue),
                    comment: criteriaComments[criterionKey] ?? "",
                }));

            // note_finale = sum of all criterion notes
            const noteFinale = notes.reduce(
                (sum, n) => sum + parseInt(n.note || "0", 10),
                0,
            );

            const individuel = (baremeData?.response?.team ?? []).map(
                (member) => ({
                    login: member.login,
                    note: individuelNotes[member.login] ?? "0",
                    comment: editedComments[member.login] ?? "",
                }),
            );

            await baremeService.saveBareme(event, groupName, {
                notes,
                individuel,
                note_finale: String(noteFinale),
                group_status: "present",
            });

            Toast.show({
                type: "success",
                text1: "Success",
                text2: "Bareme saved successfully",
                position: "top",
            });

            await fetchData();
        } catch (err: any) {
            console.error("[RdvMark] Error saving bareme:", err);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: err.message || "Failed to save bareme",
                position: "top",
            });
        } finally {
            setSaving(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Render helpers
    // ---------------------------------------------------------------------------

    const renderContent = () => (
        <View className="mb-4 rounded-lg">
            {/* ── Team Members Overview ─────────────────────────────────────── */}
            {baremeData?.response?.team &&
                baremeData.response.team.length > 0 && (
                    <View className="mb-4 border border-primary p-4">
                        <Text className="mb-3 font-semibold text-primary">
                            Team Members
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                            {baremeData.response.team.map((member) => (
                                <View
                                    key={member.login}
                                    className="flex-row items-center rounded-full px-3 py-1"
                                >
                                    {member.picture && (
                                        <Image
                                            source={{
                                                uri: `https://intra.epitech.eu${member.picture}`,
                                            }}
                                            className="mr-2 h-8 w-8 rounded-full border-2 border-primary"
                                        />
                                    )}
                                    <Text className="text-xs font-medium text-text-tertiary">
                                        {member.title}
                                        {member.master === 1 && (
                                            <Text className="text-xs text-red-500">
                                                {" "}
                                                (Leader)
                                            </Text>
                                        )}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

            {/* ── Bareme Criteria & Marks ───────────────────────────────────── */}
            {baremeData && baremeData.groups.length > 0 ? (
                <View className="gap-y-4">
                    {baremeData.groups.map((group) => (
                        <View
                            key={group.name}
                            className="border border-primary p-4"
                        >
                            <Text className="mb-2 text-sm font-semibold text-primary">
                                {group.name}
                            </Text>

                            {group.questions.map((question) => (
                                <View key={question.id} className="py-2">
                                    {/* Criterion description */}
                                    <Text className="mb-8 text-xs text-text-tertiary">
                                        {question.comment}
                                    </Text>

                                    {/* Scale buttons */}
                                    <View className="mb-8 flex-row flex-wrap justify-center gap-2">
                                        {question.scales.map((scale) => {
                                            const isSelected =
                                                Object.values(editedMarks)[0]
                                                    ?.marks[question.id] ===
                                                scale.name;

                                            return (
                                                <TouchableOpacity
                                                    key={scale.name}
                                                    onPress={() => {
                                                        const newMarks = {
                                                            ...editedMarks,
                                                        };
                                                        baremeData.response.team.forEach(
                                                            (member) => {
                                                                if (
                                                                    !newMarks[
                                                                        member
                                                                            .login
                                                                    ]
                                                                ) {
                                                                    newMarks[
                                                                        member.login
                                                                    ] = {
                                                                        login: member.login,
                                                                        name: member.title,
                                                                        marks: {},
                                                                    };
                                                                }
                                                                newMarks[
                                                                    member.login
                                                                ].marks[
                                                                    question.id
                                                                ] = scale.name;
                                                            },
                                                        );
                                                        setEditedMarks(
                                                            newMarks,
                                                        );
                                                    }}
                                                    className={`w-14 px-3 py-2 ${
                                                        isSelected
                                                            ? "bg-primary"
                                                            : "border-2 border-tertiary"
                                                    }`}
                                                >
                                                    <Text
                                                        className={`text-center text-xs font-semibold ${
                                                            isSelected
                                                                ? "text-white"
                                                                : "text-text-tertiary"
                                                        }`}
                                                        numberOfLines={1}
                                                    >
                                                        {scale.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* Criterion comment */}
                                    <TextInput
                                        className="max-h-40 border border-tertiary px-3 py-2 text-sm text-text-secondary"
                                        placeholder={`Add comment for "${question.name}"...`}
                                        multiline
                                        value={
                                            criteriaComments[question.id] || ""
                                        }
                                        onChangeText={(value) =>
                                            handleCriteriaCommentChange(
                                                question.id,
                                                value,
                                            )
                                        }
                                    />
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

            {/* ── Individual Notes & Comments per Member ────────────────────── */}
            {baremeData?.response?.team && (
                <View className="mt-6 pt-4">
                    <Text className="mb-3 text-sm font-semibold text-primary">
                        Individual Notes &amp; Comments
                    </Text>

                    {baremeData.response.team.map((member) => (
                        <View
                            key={member.login}
                            className="mb-6 border border-primary p-3"
                        >
                            <View className="flex-row">
                                {/* Member name */}
                                <Text className="text-md mb-3 align-middle font-semibold text-text-tertiary">
                                    {member.title}
                                </Text>

                                {/* Star rating 1–5 */}
                                <View className="mb-3 ml-auto flex flex-row items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <TouchableOpacity
                                            key={star}
                                            onPress={() =>
                                                handleIndividuelNoteChange(
                                                    member.login,
                                                    String(star),
                                                )
                                            }
                                            className="p-1"
                                        >
                                            <Ionicons
                                                name={
                                                    parseInt(
                                                        individuelNotes[
                                                            member.login
                                                        ] || "0",
                                                        10,
                                                    ) >= star
                                                        ? "star"
                                                        : "star-outline"
                                                }
                                                size={16}
                                                color="#f59e0b"
                                            />
                                        </TouchableOpacity>
                                    ))}
                                    <Text className="ml-2 text-xs text-text-tertiary">
                                        {individuelNotes[member.login] || "0"} /
                                        5
                                    </Text>
                                </View>
                            </View>

                            {/* Member comment */}
                            <TextInput
                                className="border border-gray-300 px-3 py-2 text-sm"
                                placeholder={`Add comment for ${member.prenom}...`}
                                multiline
                                numberOfLines={10}
                                value={editedComments[member.login] || ""}
                                onChangeText={(value) =>
                                    handleTeamCommentChange(member.login, value)
                                }
                            />
                        </View>
                    ))}
                </View>
            )}
        </View>
    );

    // ---------------------------------------------------------------------------
    // Root render
    // ---------------------------------------------------------------------------

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
                        className="text-xl font-bold text-white"
                        style={{ fontFamily: "Anton" }}
                    >
                        MARK PROJECT
                    </Text>
                    <Text className="text-xs text-white/80">
                        {groupName && `Group: ${groupName}`}
                    </Text>
                </View>
            </View>

            {/* Body */}
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
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <ScrollView
                        className="flex-1 p-4"
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        automaticallyAdjustKeyboardInsets
                        contentContainerStyle={{ paddingBottom: 24 }}
                    >
                        <Pressable onPress={Keyboard.dismiss}>
                            {!baremeData ? (
                                <View className="items-center justify-center py-8">
                                    <Ionicons
                                        name="alert-circle-outline"
                                        size={48}
                                        color="#9ca3af"
                                    />
                                    <Text className="mt-4 text-center text-gray-500">
                                        No bareme data available
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {renderContent()}

                                    {/* Save Button */}
                                    <TouchableOpacity
                                        onPress={handleSaveMarks}
                                        disabled={saving}
                                        className={`mb-6 mt-6 flex-row items-center justify-center rounded py-3 ${
                                            saving
                                                ? "bg-gray-400"
                                                : "bg-green-500"
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
                        </Pressable>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}
