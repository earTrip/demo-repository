import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
// PlayerScreen과 같은 이유 — react-native의 SafeAreaView는 안드로이드에서 no-op이라
// 하단 CTA('코스 재생하기')가 시스템 내비게이션 바에 깔린다.
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchCourse } from '../api/courseApi';
import { HERO_IMAGES } from '../data/mockCourses';
import { colors, radius, shadow, regionTint } from '../theme';

/**
 * 코스 소개/상세 화면 (해운대.png 스타일 · 퍼플).
 * 홈에서 코스를 탭하면 진입 → 히어로 이미지 + 담기/다운로드/재생/지도 액션 + 태그 + 설명.
 * 재생 버튼이 실제 플레이어(자갈치 스타일)로 넘어간다. 홈→상세→플레이어 흐름.
 */
export default function CourseDetailScreen({ route, navigation }) {
  const summary = route?.params?.course ?? {};
  const courseId = route?.params?.courseId ?? summary.id;
  const [full, setFull] = useState(null);

  useEffect(() => {
    fetchCourse(courseId).then(setFull).catch(() => setFull(null));
  }, [courseId]);

  const course = { ...summary, ...(full ?? {}) };
  const heroImage = HERO_IMAGES[course.hero];
  const tint = regionTint[course.region] ?? colors.purpleHeader;
  const tags = course.tags ?? ['부산', course.region].filter(Boolean);
  const description = course.description ?? '코스 소개는 준비 중입니다.';
  const sceneCount = course.sceneCount ?? course.scenes?.length ?? 5;

  const goPlayer = () => navigation.navigate('Player', { courseId, courseTitle: course.title });
  const goMap = () => navigation.navigate('Tabs', { screen: 'Map', params: { courseId } });

  const actions = [
    { key: 'save', icon: '＋', label: '담기', onPress: () => {} },
    { key: 'download', icon: '↓', label: '다운로드', onPress: () => {} },
    { key: 'play', icon: '▷', label: '재생', onPress: goPlayer, primary: true },
    { key: 'map', icon: '◎', label: '지도', onPress: goMap },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 퍼플 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.hIcon} accessibilityLabel="뒤로">
          <Text style={styles.hIconText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.hRight} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.hIcon}><Text style={styles.hIconText}>⤴</Text></View>
          <View style={styles.hIcon}><Text style={styles.hIconText}>≡</Text></View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 히어로 — 실사진 있으면 사진, 없으면 지역 색 플레이스홀더 */}
        <View style={[styles.hero, { backgroundColor: tint }]}>
          {heroImage && (
            <Image source={heroImage} style={styles.heroImg} resizeMode="cover" accessible accessibilityLabel={`${course.title} 사진`} />
          )}
          <View style={styles.heroShade} />
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotOff]} />
            <View style={[styles.dot, styles.dotOn]} />
            <View style={[styles.dot, styles.dotOff]} />
          </View>
        </View>

        {/* 플로팅 액션 버튼 */}
        <View style={styles.actions}>
          {actions.map((a) => (
            <TouchableOpacity key={a.key} style={styles.action} onPress={a.onPress} accessibilityLabel={a.label}>
              <View style={[styles.actionCircle, a.primary && styles.actionCirclePrimary]}>
                <Text style={[styles.actionIcon, a.primary && styles.actionIconPrimary]}>{a.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 제목 + 메타 */}
        <View style={styles.body}>
          <Text style={styles.title} accessibilityRole="header">{course.title}</Text>
          <Text style={styles.meta}>
            {course.region}
            {course.durationMin ? ` · ${course.durationMin}분` : ''}
            {course.distanceKm ? ` · ${course.distanceKm}km` : ''}
            {` · ${sceneCount}개 지점`}
          </Text>

          {/* 태그 */}
          <View style={styles.tagRow}>
            <View style={styles.tagChip}><Text style={styles.tagChipText}>태그</Text></View>
            <Text style={styles.tags}>{tags.map((t) => `#${t}`).join(' ')}</Text>
          </View>

          {/* 설명 */}
          <Text style={styles.desc}>{description}</Text>

          <TouchableOpacity style={styles.cta} onPress={goPlayer} accessibilityRole="button" accessibilityLabel="코스 재생하기">
            <Text style={styles.ctaText}>▷  코스 재생하기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: { height: 52, backgroundColor: colors.purpleHeader, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  hRight: { flexDirection: 'row' },
  hIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hIconText: { fontSize: 24, color: colors.white, fontWeight: '700' },

  scroll: { paddingBottom: 40 },
  hero: { height: 240, justifyContent: 'flex-end', overflow: 'hidden' },
  heroImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.10)' },
  dots: { flexDirection: 'row', alignSelf: 'center', gap: 6, marginBottom: 46 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { backgroundColor: colors.white },
  dotOff: { backgroundColor: 'rgba(255,255,255,0.5)' },

  actions: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: -36 },
  action: { alignItems: 'center', width: 66 },
  actionCircle: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.float },
  actionCirclePrimary: { backgroundColor: colors.purple },
  actionIcon: { fontSize: 24, color: colors.purple, fontWeight: '700' },
  actionIconPrimary: { color: colors.white },
  actionLabel: { marginTop: 6, fontSize: 12, color: colors.inkMid, fontWeight: '600' },

  body: { paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  meta: { marginTop: 6, fontSize: 13, color: colors.inkSoft, fontWeight: '600' },

  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  tagChip: { borderWidth: 1.5, borderColor: colors.purple, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  tagChipText: { fontSize: 12, color: colors.purple, fontWeight: '700' },
  tags: { flex: 1, fontSize: 14, color: colors.purpleDeep, fontWeight: '600' },

  desc: { marginTop: 20, fontSize: 16, lineHeight: 28, color: colors.inkMid },

  cta: { marginTop: 26, backgroundColor: colors.purple, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', ...shadow.card },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
