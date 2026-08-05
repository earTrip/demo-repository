import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * react-native-maps는 웹 지원이 불안정해 제외 (MapScreen.web.js와 동일 방침).
 *
 * 지도가 없으면 웹에서 씬을 발동시킬 방법이 아예 없다 — 배경 GPS는 Platform.OS !== 'web'
 * 가드로 안 켜지고, 네이티브의 지도 핀 탭(onMarkerPress)도 여기엔 없기 때문이다.
 * 그래서 씬 번호 버튼을 두어 진입을 시뮬레이트한다 (네이티브 PlayerMap의 핀 탭과 같은 동작).
 * 대본·재생·페이월을 데스크톱에서 확인하는 유일한 경로다. .web.js라 실기기 번들에는 안 들어간다.
 */
export default function PlayerMap({ scenes = [], activeSceneId, onMarkerPress }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>지도는 모바일 앱에서만 표시됩니다.</Text>
      <View style={styles.chips}>
        {scenes.map((s) => (
          <TouchableOpacity
            key={s.sceneId}
            style={[styles.chip, s.sceneId === activeSceneId && styles.chipOn]}
            onPress={() => onMarkerPress?.(s)}
          >
            <Text style={[styles.chipText, s.sceneId === activeSceneId && styles.chipTextOn]}>{s.order}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dde5f5' },
  text: { color: '#6b7699', fontSize: 14 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: '#f2761b' },
  chipText: { fontWeight: '800', color: '#6b7699' },
  chipTextOn: { color: '#fff' },
});
