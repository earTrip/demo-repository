import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import MyScreen from './src/screens/MyScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import CourseDetailScreen from './src/screens/CourseDetailScreen';
import MiniPlayer from './src/components/MiniPlayer';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICON = { Home: '🏠', Map: '🗺️', My: '👤' };
const TAB_LABEL = { Home: '홈', Map: '지도', My: '마이페이지' };

/**
 * 하단 내비게이션 — 고정 미니 재생바(재생바.jpg)를 탭 행 바로 위에 얹는다.
 * 탭 행: 홈 / 지도 / 마이페이지.
 */
function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  const cell = (route) => {
    const idx = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === idx;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <TouchableOpacity key={route.key} style={styles.tab} onPress={onPress} accessibilityRole="tab">
        <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.4 }]}>{TAB_ICON[route.name]}</Text>
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{TAB_LABEL[route.name]}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.bottomWrap}>
      <MiniPlayer />
      <View style={[styles.tabBar, { paddingBottom: insets.bottom, height: 60 + insets.bottom }]}>
        {state.routes.map(cell)}
      </View>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="My" component={MyScreen} />
    </Tab.Navigator>
  );
}

/** 홈/상세는 탭 안, Player·Detail은 탭 위 전체화면 스택. */
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="Detail" component={CourseDetailScreen} />
          <Stack.Screen name="Player" component={PlayerScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bottomWrap: { backgroundColor: colors.white },
  tabBar: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 3 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },
  tabLabelActive: { color: colors.purple, fontWeight: '800' },
});
