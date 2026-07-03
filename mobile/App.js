import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import MyScreen from './src/screens/MyScreen';
import PlayerScreen from './src/screens/PlayerScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICON = { Home: '🏠', Map: '🗺️', My: '👤' };

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: () => <Text>{TAB_ICON[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '홈' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: '지도' }} />
      <Tab.Screen name="My" component={MyScreen} options={{ tabBarLabel: '마이페이지' }} />
    </Tab.Navigator>
  );
}

/** 웹 App.jsx의 tab 상태 전환을 react-navigation 스택+탭으로 대체. Player는 탭 바 없는 전체화면. */
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Player" component={PlayerScreen} options={{ headerShown: true, title: '' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
