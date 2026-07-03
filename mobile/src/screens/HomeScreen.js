import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { fetchCourses } from '../api/courseApi';
import { REGIONS, MOCK_SCHEDULE } from '../data/mockCourses';

const THUMB_COLOR = { market: '#ffe0b2', bridge: '#c8e6ff', beach: '#c8f5e0' };
const NUM = ['①', '②', '③', '④', '⑤'];

/** 웹 HomeScreen.jsx와 동일 구조(검색 + 지역 칩 + 장소 목록 + 오늘 일정) */
export default function HomeScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [region, setRegion] = useState('busan');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchCourses().then(setCourses);
  }, []);

  const filtered = (region === 'busan' || region === 'more'
    ? courses
    : courses.filter((c) => REGIONS.find((r) => r.key === region)?.label === c.region)
  ).filter((c) => c.title.includes(query) || c.subtitle.includes(query));

  const openCourse = (c) => navigation.navigate('Player', { courseId: c.id, courseTitle: c.title });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionRow}>
          {REGIONS.map((r) => {
            const active = region === r.key;
            return (
              <TouchableOpacity key={r.key} style={styles.regionItem} onPress={() => setRegion(r.key)}>
                <View style={[styles.regionCircle, active && styles.regionCircleActive]}>
                  <Text style={styles.regionIcon}>{r.icon}</Text>
                </View>
                <Text style={[styles.regionLabel, active && styles.regionLabelActive]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>장소 목록</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filtered.map((c, i) => (
            <TouchableOpacity key={c.id} style={styles.placeCard} onPress={() => openCourse(c)}>
              <View style={[styles.placeThumb, { backgroundColor: THUMB_COLOR[c.thumb] ?? '#eee' }]}>
                <Text style={styles.placeNo}>{NUM[i] ?? i + 1}</Text>
              </View>
              <View style={styles.placeBody}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeTitle}>{c.title}</Text>
                  <Text style={styles.placeMeta}>{c.subtitle}</Text>
                </View>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>오늘 일정</Text>
        <View style={styles.scheduleCard}>
          {MOCK_SCHEDULE.map((s) => (
            <View key={s.id} style={styles.scheduleItem}>
              <View style={styles.scheduleDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleTitle}>{s.title}</Text>
                <Text style={styles.scheduleMeta}>{s.meta}</Text>
              </View>
              <View style={[styles.scheduleThumb, { backgroundColor: THUMB_COLOR[s.thumb] ?? '#eee' }]} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  brand: { fontSize: 26, fontWeight: '800', marginBottom: 16 },
  brandHear: { color: '#111' },
  brandBusan: { color: '#3182f6' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  regionRow: { marginBottom: 20 },
  regionItem: { alignItems: 'center', marginRight: 16 },
  regionCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' },
  regionCircleActive: { backgroundColor: '#e0edff' },
  regionIcon: { fontSize: 20 },
  regionLabel: { marginTop: 6, fontSize: 12, color: '#666' },
  regionLabelActive: { color: '#3182f6', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  placeCard: { width: 160, marginRight: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fafafa' },
  placeThumb: { height: 90, alignItems: 'flex-end', padding: 8 },
  placeNo: { fontWeight: '700', color: '#333' },
  placeBody: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  placeTitle: { fontWeight: '700', fontSize: 14 },
  placeMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  playIcon: { color: '#3182f6' },
  scheduleCard: { backgroundColor: '#fafafa', borderRadius: 12, padding: 12, marginBottom: 20 },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  scheduleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3182f6', marginRight: 10 },
  scheduleTitle: { fontWeight: '700', fontSize: 14 },
  scheduleMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  scheduleThumb: { width: 40, height: 40, borderRadius: 8 },
});
