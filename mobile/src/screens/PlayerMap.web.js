import { View, Text, StyleSheet } from 'react-native';

/** react-native-maps는 웹 지원이 불안정해 제외 (MapScreen.web.js와 동일 방침). */
export default function PlayerMap() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>지도는 모바일 앱에서만 표시됩니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dde5f5' },
  text: { color: '#6b7699', fontSize: 14 },
});
