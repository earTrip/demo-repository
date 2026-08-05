import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthSession } from '../auth/useAuthSession';
import { fetchMyCourses } from '../payment/paymentApi';
import { fetchCourses } from '../api/courseApi';
import { colors, radius, shadow } from '../theme';

/** 마이페이지 (해운대 톤 · 퍼플). 인증 상태 + 구매한 코스. */
export default function MyScreen() {
  const authLoading = useAuthSession((s) => s.loading);
  const userId = useAuthSession((s) => s.session?.user?.id);
  const [myCourses, setMyCourses] = useState(null); // null=로딩중, []=빈 목록
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [ownedIds, allCourses] = await Promise.all([fetchMyCourses(), fetchCourses()]);
        setMyCourses(allCourses.filter((c) => ownedIds.includes(c.id)));
      } catch {
        setLoadFailed(true);
        setMyCourses([]);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">마이페이지</Text>

        <View style={styles.authCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{userId ? '👤' : '🙂'}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.authStatus}>
              {authLoading ? '초기화 중...' : userId ? `연결됨 (${userId.slice(0, 8)}...)` : '로그인이 필요해요'}
            </Text>
            <Text style={styles.authSub}>부산의 골목을 귀로 걷는 여행</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.linkButton} disabled>
          <Text style={styles.linkButtonText}>카카오로 로그인 (Supabase 설정 후 사용 가능)</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle} accessibilityRole="header">구매한 코스</Text>
        {myCourses === null && <Text style={styles.meta}>불러오는 중...</Text>}
        {loadFailed && <Text style={styles.meta}>구매 내역을 불러오지 못했어요. 다시 시도해 주세요.</Text>}
        {myCourses?.length === 0 && !loadFailed && <Text style={styles.meta}>아직 구매한 코스가 없어요.</Text>}
        {myCourses?.map((c) => (
          <View key={c.id} style={styles.courseCard}>
            <Text style={styles.courseTitle}>{c.title}</Text>
            <Text style={styles.courseMeta}>{c.subtitle}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 18 },
  authCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.purpleSoft, borderRadius: radius.lg, padding: 16, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22 },
  authStatus: { fontWeight: '800', fontSize: 15, color: colors.ink },
  authSub: { fontSize: 12, color: colors.purpleDeep, marginTop: 3 },
  linkButton: { backgroundColor: colors.bgSoft, borderRadius: radius.md, padding: 14, opacity: 0.7, marginBottom: 26 },
  linkButtonText: { fontSize: 13, color: colors.inkSoft, textAlign: 'center', fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  meta: { color: colors.inkSoft },
  courseCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 8, ...shadow.card },
  courseTitle: { fontWeight: '800', fontSize: 15, color: colors.ink },
  courseMeta: { color: colors.inkSoft, fontSize: 12, marginTop: 2 },
});
