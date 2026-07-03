import { View, Text, StyleSheet } from 'react-native';

/** react-native-maps는 웹 지원이 불안정(reactnative.directory에 web 플랫폼 미기재)해서 제외 */
export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>지도는 모바일 앱에서만 지원됩니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  text: { color: '#999', fontSize: 15 },
});
