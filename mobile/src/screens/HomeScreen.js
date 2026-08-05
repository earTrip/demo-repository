import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { fetchCourses } from '../api/courseApi';
import { REGIONS, MOCK_SCHEDULE, HERO_IMAGES } from '../data/mockCourses';
import { colors, radius, shadow, regionTint } from '../theme';

const THUMB_TINT = { market: regionTint.자갈치, bridge: regionTint.광안리, beach: regionTint.영도 };
const NUM = ['1', '2', '3', '4', '5'];

/** 홈 (해운대.png 톤 · 퍼플). 검색 + 지역 칩 + 장소 목록 + 오늘 일정. 코스 탭 → 상세 화면. */
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

  const openCourse = (c) => navigation.navigate('Detail', { course: c, courseId: c.id });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand} accessibilityRole="header">
          <Text style={styles.brandHear}>EAR </Text>
          <Text style={styles.brandTrip}>TRIP</Text>
        </Text>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="어디로 떠나볼까요?"
            placeholderTextColor={colors.inkSoft}
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
              <TouchableOpacity
                key={r.key}
                style={styles.regionItem}
                onPress={() => setRegion(r.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${r.label} 지역`}
              >
                <View style={[styles.regionCircle, active && styles.regionCircleActive]}>
                  <Text style={styles.regionIcon}>{r.icon}</Text>
                </View>
                <Text style={[styles.regionLabel, active && styles.regionLabelActive]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle} accessibilityRole="header">추천 코스</Text>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>검색 결과가 없어요.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
            {filtered.map((c, i) => (
              <TouchableOpacity
                key={c.id}
                style={styles.placeCard}
                onPress={() => openCourse(c)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${c.title}, ${c.subtitle}`}
              >
                <View style={[styles.placeThumb, { backgroundColor: THUMB_TINT[c.thumb] ?? colors.purpleHeader }]}>
                  {HERO_IMAGES[c.hero] && (
                    <Image source={HERO_IMAGES[c.hero]} style={styles.placeThumbImg} resizeMode="cover" accessible={false} />
                  )}
                  <View style={styles.placeNo}><Text style={styles.placeNoText}>{NUM[i] ?? i + 1}</Text></View>
                </View>
                <View style={styles.placeBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.placeTitle} numberOfLines={1}>{c.title}</Text>
                    <Text style={styles.placeMeta} numberOfLines={1}>{c.subtitle}</Text>
                  </View>
                  <View style={styles.playBtn}><Text style={styles.playIcon}>▷</Text></View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.sectionTitle} accessibilityRole="header">오늘 일정</Text>
        <View style={styles.scheduleCard}>
          {MOCK_SCHEDULE.map((s, i) => (
            <View key={s.id} style={[styles.scheduleItem, i > 0 && styles.scheduleDivider]}>
              <View style={styles.scheduleDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleTitle}>{s.title}</Text>
                <Text style={styles.scheduleMeta}>{s.meta}</Text>
              </View>
              <View style={[styles.scheduleThumb, { backgroundColor: THUMB_TINT[s.thumb] ?? colors.purpleHeader }]} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  brand: { fontSize: 26, fontWeight: '800', marginBottom: 16 },
  brandHear: { color: colors.ink },
  brandTrip: { color: colors.purple },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSoft, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18 },
  searchIcon: { marginRight: 8, fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink },
  regionRow: { marginBottom: 22 },
  regionItem: { alignItems: 'center', marginRight: 16 },
  regionCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.bgSoft, alignItems: 'center', justifyContent: 'center' },
  regionCircleActive: { backgroundColor: colors.purpleSoft, borderWidth: 2, borderColor: colors.purple },
  regionIcon: { fontSize: 20 },
  regionLabel: { marginTop: 6, fontSize: 12, color: colors.inkSoft },
  regionLabelActive: { color: colors.purple, fontWeight: '800' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  empty: { color: colors.inkSoft, fontSize: 14, paddingVertical: 24, textAlign: 'center' },
  placeCard: { width: 168, marginRight: 12, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.white, ...shadow.card },
  placeThumb: { height: 104, alignItems: 'flex-start', padding: 10, overflow: 'hidden' },
  placeThumbImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  placeNo: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  placeNoText: { fontWeight: '800', color: colors.ink, fontSize: 13 },
  placeBody: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  placeTitle: { fontWeight: '800', fontSize: 15, color: colors.ink },
  placeMeta: { color: colors.inkSoft, fontSize: 12, marginTop: 2 },
  playBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  playIcon: { color: colors.purple, fontSize: 14, fontWeight: '800' },
  scheduleCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, ...shadow.card },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  scheduleDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  scheduleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.purple, marginRight: 12 },
  scheduleTitle: { fontWeight: '700', fontSize: 14, color: colors.ink },
  scheduleMeta: { color: colors.inkSoft, fontSize: 12, marginTop: 2 },
  scheduleThumb: { width: 42, height: 42, borderRadius: 10 },
});
