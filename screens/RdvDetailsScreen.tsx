/**
 * File Name: RdvDetailsScreen.tsx
 * Description: Screen to display details of an RDV event and its registered students/groups.
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import intraAuth from '../services/intraAuth';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import rdvService, { IRegistration } from '../services/rdvService';
import { IIntraEvent } from '../types/IIntraEvent';

type RootStackParamList = {
  RdvDetails: { event: IIntraEvent };
};

type RdvDetailsRouteProp = RouteProp<RootStackParamList, 'RdvDetails'>;

export default function RdvDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RdvDetailsRouteProp>();
  const { event } = route.params;

  const [registrations, setRegistrations] = useState<IRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [cookie, setCookie] = useState<string | null>(null);
  // Fetch the user cookie on mount
  useEffect(() => {
    intraAuth.getIntraCookie().then(setCookie);
  }, []);

  const webViewRef = useRef<WebView>(null);
  // Construct RDV URL: https://intra.epitech.eu/module/{year}/{module}/{instance}/acti-{acti}/rdv/
  let codeActi = event.codeacti.startsWith('acti-') ? event.codeacti : `acti-${event.codeacti}`;
  const rdvUrl = `https://intra.epitech.eu/module/${event.scolaryear}/${event.codemodule}/${event.codeinstance}/${codeActi}/rdv/`;
  console.log('[EpiCheck] RDV WebView URL:', rdvUrl);

  const handleWebViewMessage = async (event: any) => {
    try {
      const dom = event.nativeEvent.data;
      if (typeof dom !== 'string') {
        setStatusMessage('Message non string reçu');
        setError('WebView did not return a string');
        setLoading(false);
        return;
      }
      // Regex robuste pour launchApp('module.activite.rdv', { ... })
      const regex = /launchApp\(['"]module\\?.activite\\?.rdv['"],\s*(\{[\s\S]*?\})\s*\);/m;
      const match = dom.match(regex);
      if (!match || !match[1]) {
        setError('Impossible de trouver le script launchApp dans le DOM.');
        setStatusMessage('Script launchApp non trouvé.');
        setLoading(false);
        return;
      }
      let jsonString = match[1];
      try {
        // On tente d'évaluer le JSON (parfois ce n'est pas du JSON strict)
        let dataObj;
        try {
          dataObj = JSON.parse(jsonString);
        } catch (e) {
          // fallback: eval (dangereux mais utile ici car on contrôle la source)
          // eslint-disable-next-line no-eval
          dataObj = eval('(' + jsonString + ')');
        }
        // On parse les inscriptions comme avant
        const newRegistrations = rdvService.parseRdvData(dataObj);
        setRegistrations(newRegistrations);
        setStatusMessage('Inscriptions extraites.');
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du parsing du JSON launchApp: ' + (err as any).toString());
        setStatusMessage('Erreur parsing JSON.');
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to process WebView message');
      setLoading(false);
    }
  };

  const renderRegistration = ({ item }: { item: IRegistration }) => {
    const isGroup = item.type === 'group';
    const title = isGroup
      ? `Groupe (${item.members.length} membres)`
      : item.members[0].title;

    const logins = item.members.map(m => m.login).join(', ');

    // Affiche la note du slot si présente, sinon le statut du slot, sinon fallback sur le statut du premier membre
    const getStatusOrNote = (item: any) => {
      if (item.note !== undefined && item.note !== null && item.note !== '') {
        return item.note;
      }
      if (item.status === 'present') return 'Présent';
      if (item.status === 'absent') return 'Absent';
      // fallback: premier membre
      if (item.members && item.members.length > 0) {
        const member = item.members[0];
        if (member.present === 'present') return 'Présent';
        if (member.present === 'absent') return 'Absent';
      }
      return 'Non renseigné';
    };

    const mainStatus = getStatusOrNote(item);

    // Couleur badge
    let badgeColor = 'bg-gray-100', textColor = 'text-gray-500';
    if (mainStatus === 'Présent') { badgeColor = 'bg-green-100'; textColor = 'text-green-700'; }
    else if (mainStatus === 'Absent') { badgeColor = 'bg-red-100'; textColor = 'text-red-700'; }
    else if (mainStatus && mainStatus !== 'Non renseigné') { badgeColor = 'bg-blue-100'; textColor = 'text-blue-700'; }

    return (
      <View className="mb-3 flex-row items-center rounded-xl bg-white p-4 shadow-sm border border-gray-100">
        {/* Avatar */}
        <View className="mr-4">
          {isGroup ? (
            <View className="h-10 w-10 items-center justify-center rounded-full bg-epitech-blue">
              <Text className="font-bold text-white">G</Text>
            </View>
          ) : (
            item.members[0].picture ? (
              (() => {
                // Try to use miniview version if .bmp
                const original = item.members[0].picture;
                let miniview = original;
                if (original && original.endsWith('.bmp')) {
                  // /file/userprofil/xxx.bmp => /file/userprofil/miniview/xxx.jpg
                  const match = original.match(/\/file\/userprofil\/(.+)\.bmp$/);
                  if (match && match[1]) {
                    miniview = `/file/userprofil/miniview/${match[1]}.jpg`;
                  }
                }
                return (
                  <Image
                    source={{ uri: miniview }}
                    className="h-10 w-10 rounded-full bg-gray-200"
                  />
                );
              })()
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Text className="font-bold text-white">
                  {item.members[0].login.substring(0, 2).toUpperCase()}
                </Text>
              </View>
            )
          )}
        </View>

        {/* Info */}
        <View className="flex-1">
          <Text className="text-base font-semibold text-text-primary" style={{ fontFamily: "IBMPlexSansSemiBold" }}>
            {title}
          </Text>
          <Text className="text-xs text-text-secondary" style={{ fontFamily: "IBMPlexSans" }} numberOfLines={2}>
            {logins}
          </Text>
          {item.date && (
            <Text className="mt-1 text-xs text-gray-400">
              {item.date}
            </Text>
          )}
        </View>

        {/* Status/Note Badge */}
        <View className={`rounded-full px-3 py-1 ${badgeColor} ml-2`}>
          <Text className={`text-xs font-bold ${textColor}`}>{mainStatus}</Text>
        </View>
      </View>
    );
  };

  // Prepare JS to inject the cookie before page loads
  const injectedCookie = cookie
    ? `document.cookie = "user=${cookie}; domain=.epitech.eu; path=/"; true;`
    : '';

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center bg-primary px-4 py-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl text-white" style={{ fontFamily: "Anton" }}>
            RDV DETAILS
          </Text>
          <Text className="text-xs text-white/80" style={{ fontFamily: "IBMPlexSans" }} numberOfLines={1}>
            {event.acti_title}
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text className="mt-4 text-center text-text-secondary" style={{ fontFamily: "IBMPlexSans" }}>
            {statusMessage}
          </Text>
          <Text className="mt-2 text-center text-xs text-gray-400">
            Fetching data from Intranet...
          </Text>

          {/* Hidden WebView for scraping */}
          <View style={{ height: 0, width: 0, opacity: 0 }}>
            <WebView
              ref={webViewRef}
              source={{ uri: rdvUrl }}
              sharedCookiesEnabled={true}
              domStorageEnabled={true}
              injectedJavaScript={"window.ReactNativeWebView.postMessage(document.documentElement.outerHTML);true;"}
              injectedJavaScriptBeforeContentLoaded={injectedCookie}
              onMessage={handleWebViewMessage}
              onLoadStart={() => setStatusMessage("Loading RDV page...")}
              onLoadEnd={() => setStatusMessage("DOM envoyé à la console...")}
              onError={() => setError("Failed to load Intranet page")}
            />
          </View>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text className="mt-4 text-center text-lg text-red-500" style={{ fontFamily: "IBMPlexSansSemiBold" }}>
            Error
          </Text>
          <Text className="mt-2 text-center text-text-secondary">
            {error}
          </Text>
          <TouchableOpacity
            className="mt-6 rounded bg-primary px-6 py-3"
            onPress={() => {
              setLoading(true);
              setError(null);
            }}
          >
            <Text className="text-white font-bold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1 p-4">
          <View className="bg-white p-4 shadow-sm mb-1 rounded-xl border border-gray-100">
            <Text className="text-sm text-gray-500">
              <Text className="font-bold text-text-primary">{registrations.length}</Text> inscription{registrations.length > 1 ? 's' : ''} trouvée{registrations.length > 1 ? 's' : ''}
            </Text>
          </View>
          <FlatList
            data={registrations}
            renderItem={renderRegistration}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
