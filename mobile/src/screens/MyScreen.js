import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthSession } from '../auth/useAuthSession';
import { fetchMyCourses } from '../payment/paymentApi';
import { fetchCourses } from '../api/courseApi';

/** 마이페이지 — 웹에는 아직 준비 중 상태라 참고할 화면이 없어 데이터 모델 기준으로 설계 */
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
        <Text style={styles.title}>마이페이지</Text>

        <View style={styles.authCard}>
          <Text style={styles.authStatus}>
            {authLoading ? '초기화 중...' : userId ? `연결됨 (${userId.slice(0, 8)}...)` : '미인증'}
          </Text>
          <TouchableOpacity style={styles.linkButton} disabled>
            <Text style={styles.linkButtonText}>카카오로 로그인 (Supabase 설정 후 사용 가능)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>구매한 코스</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  authCard: { backgroundColor: '#fafafa', borderRadius: 12, padding: 14, marginBottom: 24 },
  authStatus: { fontWeight: '600', marginBottom: 8 },
  linkButton: { backgroundColor: '#f2f2f2', borderRadius: 8, padding: 10, opacity: 0.6 },
  linkButtonText: { fontSize: 13, color: '#888', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  meta: { color: '#999' },
  courseCard: { backgroundColor: '#fafafa', borderRadius: 10, padding: 14, marginBottom: 8 },
  courseTitle: { fontWeight: '700', fontSize: 14 },
  courseMeta: { color: '#888', fontSize: 12, marginTop: 2 },
});
