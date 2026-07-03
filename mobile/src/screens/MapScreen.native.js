import { useEffect, useRef, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import { fetchCourse } from '../api/courseApi';
import { MOCK_COURSE } from '../data/mockCourse';

/** 웹 MapScreen.jsx(react-leaflet)를 react-native-maps로 이식 */
export default function MapScreen({ route }) {
  const courseId = route?.params?.courseId ?? MOCK_COURSE.id;
  const [course, setCourseData] = useState(null);
  const [query, setQuery] = useState('');
  const mapRef = useRef(null);

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
        <Text style={styles.brand}>
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
            <Polyline coordinates={points} strokeColor="#2f6bff" strokeWidth={4} lineDashPattern={[10, 8]} lineCap="round" />
          )}

          {scenes.map((s) => (
            <Circle
              key={`r-${s.sceneId}`}
              center={{ latitude: s.lat, longitude: s.lng }}
              radius={s.radiusM}
              strokeColor="#2f6bff"
              strokeWidth={1}
              fillColor="rgba(47,107,255,0.08)"
            />
          ))}

          {scenes.map((s) => (
            <Marker
              key={s.sceneId}
              coordinate={{ latitude: s.lat, longitude: s.lng }}
              title={`S${s.order} ${s.title}`}
              description={`반경 ${s.radiusM}m`}
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
  container: { flex: 1, backgroundColor: '#fff' },
  top: { padding: 20, paddingBottom: 12 },
  brand: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  brandHear: { color: '#111' },
  brandBusan: { color: '#3182f6' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  mapWrap: { flex: 1 },
  pin: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2f6bff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  pinText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  legend: { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 10 },
  legendTitle: { fontWeight: '700', fontSize: 12, marginBottom: 4 },
  legendRow: { fontSize: 11, color: '#555', marginTop: 2 },
});
