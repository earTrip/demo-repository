import { useEffect, useRef, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import { fetchCourse } from '../api/courseApi';
import { MOCK_COURSE } from '../data/mockCourse';
import { colors, radius, shadow } from '../theme';

/** 웹 MapScreen.jsx(react-leaflet)를 react-native-maps로 이식 */
export default function MapScreen({ route, navigation }) {
  const courseId = route?.params?.courseId ?? MOCK_COURSE.id;
  const [course, setCourseData] = useState(null);
  const [query, setQuery] = useState('');
  const mapRef = useRef(null);

  const openScene = () => {
    navigation.navigate('Player', { courseId, courseTitle: course?.title });
  };

  useEffect(() => {
    fetchCourse(courseId)
      .then(setCourseData)
      .catch(() => setCourseData(MOCK_COURSE));
  }, [courseId]);

  const scenes = course?.scenes ?? [];
  const points = scenes.map((s) => ({ latitude: s.lat, longitude: s.lng }));

  useEffect(() => {
    if (points.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  }, [scenes.length]);

  const initialRegion = points.length
    ? {
        latitude: points[0].latitude,
        longitude: points[0].longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : { latitude: 35.0966, longitude: 129.0306, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.brand} accessibilityRole="header">
          <Text style={styles.brandHear}>EAR </Text>
          <Text style={styles.brandBusan}>TRIP</Text>
        </Text>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="검색창"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            accessibilityLabel="장소 검색"
          />
        </View>
      </View>

      <View style={styles.mapWrap}>
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={initialRegion}>
          {points.length > 1 && (
            <Polyline coordinates={points} strokeColor={colors.purple} strokeWidth={4} lineDashPattern={[10, 8]} lineCap="round" />
          )}

          {/* dwell(체류 트리거) 씬은 주황으로 구분 — 밀집 지역 오탐 방지 반경임을 지도에서 바로 확인 */}
          {scenes.map((s) => (
            <Circle
              key={`r-${s.sceneId}`}
              center={{ latitude: s.lat, longitude: s.lng }}
              radius={s.radiusM}
              strokeColor={s.triggerType === 'dwell' ? colors.orange : colors.purple}
              strokeWidth={1}
              fillColor={s.triggerType === 'dwell' ? 'rgba(224,134,60,0.10)' : 'rgba(108,76,224,0.08)'}
            />
          ))}

          {scenes.map((s) => (
            <Marker
              key={s.sceneId}
              coordinate={{ latitude: s.lat, longitude: s.lng }}
              onPress={openScene}
            >
              <View style={styles.pin}>
                <Text style={styles.pinText}>{s.order}</Text>
              </View>
            </Marker>
          ))}
        </MapView>

        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Route Legend</Text>
          <Text style={styles.legendRow}>1–{scenes.length || 5} stops</Text>
          <Text style={styles.legendRow}>┄ AI 추천 코스</Text>
          <Text style={styles.legendRow}>🚶 도보</Text>
          <Text style={styles.legendRow}>🚌 대중교통</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  top: { padding: 20, paddingBottom: 12 },
  brand: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  brandHear: { color: colors.ink },
  brandBusan: { color: colors.purple },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSoft, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink },
  mapWrap: { flex: 1 },
  pin: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  pinText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  legend: { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.md, padding: 12, ...shadow.card },
  legendTitle: { fontWeight: '800', fontSize: 12, marginBottom: 4, color: colors.ink },
  legendRow: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
});
