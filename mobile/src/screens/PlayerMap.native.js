import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { colors } from '../theme';

/**
 * 플레이어 상단 지도 (자갈치.png 스타일 · 오렌지 경로).
 * 재생 중인 씬(오렌지)·다음 정류장(오렌지 링)을 구분하고 내 위치를 표시한다.
 * 웹은 react-native-maps 미지원이라 PlayerMap.web.js가 대체한다.
 */
export default function PlayerMap({ scenes, activeSceneId, nextSceneId, onMarkerPress }) {
  const mapRef = useRef(null);
  const points = scenes.map((s) => ({ latitude: s.lat, longitude: s.lng }));

  useEffect(() => {
    if (points.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 70, right: 50, bottom: 70, left: 50 },
        animated: true,
      });
    }
  }, [scenes.length]);

  const initialRegion = points.length
    ? { latitude: points[0].latitude, longitude: points[0].longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : { latitude: 35.0966, longitude: 129.0306, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
    >
      {points.length > 1 && (
        <Polyline coordinates={points} strokeColor={colors.orange} strokeWidth={5} lineCap="round" lineJoin="round" />
      )}

      {scenes.map((s) => {
        const active = s.sceneId === activeSceneId;
        const next = s.sceneId === nextSceneId;
        return (
          <Marker
            key={s.sceneId}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            onPress={() => onMarkerPress?.(s)}
            zIndex={active ? 3 : next ? 2 : 1}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            {active ? (
              <View style={styles.target}>
                <View style={styles.targetDot} />
              </View>
            ) : next ? (
              <View style={styles.nextPin} />
            ) : (
              <View style={styles.pin}><Text style={styles.pinText}>{s.order}</Text></View>
            )}
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  // 재생 중(현재 위치) — 오렌지 타겟 도넛
  target: { width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: colors.orange, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  targetDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.orange },
  // 다음 정류장 — 흰 원 + 오렌지 테두리
  nextPin: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.orange },
  // 일반 지점
  pin: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  pinText: { color: colors.white, fontWeight: '800', fontSize: 12 },
});
