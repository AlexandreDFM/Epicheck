import './global.css';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './screens/LoginScreen';
import PresenceScreen from './screens/PresenceScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: { onLoginSuccess?: () => void } | undefined;
  Presence: { onLogout?: () => void } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Presence" component={PresenceScreen} />
        </Stack.Navigator>
      <StatusBar style="auto" />
      </NavigationContainer>
  );
}

