import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';

import { useCourseStore } from '../store/courseStore';
import { setupPlayer } from '../player/trackQueue';
import { startTracking, stopTracking } from '../location/backgroundTask';
import { downloadCourseAudio } from '../offline/download';
import { fetchCourse } from '../api/courseApi';
import { MOCK_COURSE, MOCK_LOCAL_AUDIO } from '../data/mockCourse';
import { useAuthSession } from '../auth/useAuthSession';
import { useAccess } from '../payment/useAccess';
import Paywall from '../payment/Paywall';

/** 백엔드 조회 실패 시 폴백. 요청한 코스가 목 데이터(EP.01)면 그걸로, 아니면 로드 실패로 처리 */
async function loadCourse(courseId) {
  try {
    return await fetchCourse(courseId);
  } catch {
    return courseId === MOCK_COURSE.id ? MOCK_COURSE : null;
  }
}

/**
 * 실제 오디오 호스팅이 아직 없어(백엔드가 audioUrl을 서빙하지 않음) 다운로드가 실패하면
 * 번들된 목 오디오(5개)를 순서대로 돌려써서 재생 배선 자체는 항상 테스트 가능하게 한다.
 * 실제 호스팅이 생기면 downloadCourseAudio가 그대로 성공하며 이 폴백은 자연히 안 타게 된다.
 */
async function loadAudio(scenes) {
  const playable = scenes.filter((s) => s.audioUrl);
  try {
    return await downloadCourseAudio(playable);
  } catch {
    const fallback = Object.values(MOCK_LOCAL_AUDIO);
    return new Map(playable.map((s, i) => [s.sceneId, fallback[i % fallback.length]]));
  }
}

/**
 * S1 재생 코어 스모크 테스트 화면 (Home에서 코스 선택 시 진입, route.params.courseId로 실제 코스 로드).
 * 실제 GPS 없이 지점 좌표를 그대로 넣어 지오펜스→재생 배선을 검증한다
 * (설계 문서 7절의 "전경 상태에서 시뮬레이트 이동으로 검증" 게이트에 대응).
 */
export default function PlayerScreen({ route }) {
  const courseId = route?.params?.courseId ?? MOCK_COURSE.id;
  const [course, setCourse] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [ready, setReady] = useState(false);
  const status = useCourseStore((s) => s.status);
  const playedCount = useCourseStore((s) => s.playedCount);
  const onPosition = useCourseStore((s) => s.onPosition);
  const authLoading = useAuthSession((s) => s.loading);
  const userId = useAuthSession((s) => s.session?.user?.id);
  const { loaded: accessLoaded, hasAccess, freeSceneOrders, canPlayScene, reload: reloadAccess } = useAccess(courseId);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState('idle'); // idle|active|denied

  const startBackgroundTracking = async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      setTrackingStatus('denied');
      return;
    }
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      setTrackingStatus('denied'); // 항상 허용 미승인 시 배경 추적 불가
      return;
    }
    await startTracking();
    setTrackingStatus('active');
  };

  useEffect(() => {
    useAuthSession.getState().init(); // Supabase 프로젝트 미설정이면 fail-open (콘솔 경고만)
    (async () => {
      const data = await loadCourse(courseId);
      if (!data) {
        setLoadError(true);
        return;
      }
      setCourse(data);

      await setupPlayer((sceneId) => useCourseStore.getState().onSceneComplete(sceneId));
      const srcMap = await loadAudio(data.scenes);
      useCourseStore.getState().init(data, srcMap, `session-${Date.now()}`);
      setReady(true);

      // 코스 진입 시 바로 백그라운드 GPS 추적 시작 — 지점 반경에 들어오면 자동 재생됨.
      // 웹은 배경 위치 API 자체가 없어 건너뜀(startTracking이 내부적으로도 no-op 처리함).
      if (Platform.OS !== 'web') {
        await startBackgroundTracking();
      }
    })();

    return () => {
      stopTracking();
    };
  }, [courseId]);

  const simulateEnter = (scene) => onPosition(scene.lat, scene.lng);

  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFill}>
          <Text style={styles.meta}>코스를 아직 준비 중입니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFill}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{course.title}</Text>
        <Text style={styles.meta}>status: {status} · playedCount: {playedCount}/{course.scenes.length}</Text>
        <Text style={styles.meta}>
          auth: {authLoading ? '초기화 중...' : userId ? `연결됨 (${userId.slice(0, 8)}...)` : '미인증 (Supabase 미설정)'}
        </Text>
        <Text style={styles.meta}>
          access: {!accessLoaded ? '확인 중...' : `hasAccess=${hasAccess} free=${freeSceneOrders.join(',')}`}
        </Text>
        <Text style={styles.meta}>
          GPS 자동 재생: {trackingStatus === 'active' ? '켜짐 (지점 도착 시 자동 재생)' : trackingStatus === 'denied' ? '위치 권한 거부됨' : '대기 중'}
        </Text>

        <Text style={styles.section}>지점 진입 시뮬레이트 (순서대로)</Text>
        {course.scenes.map((scene) => {
          const locked = accessLoaded && !canPlayScene(scene.order);
          return (
            <TouchableOpacity
              key={scene.sceneId}
              style={styles.button}
              disabled={!ready || locked}
              onPress={() => simulateEnter(scene)}
            >
              <Text style={styles.buttonText}>
                {locked ? '🔒 ' : ''}S{scene.order} 진입 · {scene.title}
              </Text>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.section}>실제 백그라운드 GPS (자동 시작됨 · 수동 제어용)</Text>
        <TouchableOpacity style={styles.button} onPress={startBackgroundTracking}>
          <Text style={styles.buttonText}>배경 추적 다시 시작</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            stopTracking();
            setTrackingStatus('idle');
          }}
        >
          <Text style={styles.buttonText}>배경 추적 중지</Text>
        </TouchableOpacity>

        <Text style={styles.section}>결제 (Toss WebView SDK 프로토타입)</Text>
        <TouchableOpacity style={styles.button} onPress={() => setPaywallOpen(true)}>
          <Text style={styles.buttonText}>페이월 열기</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={paywallOpen} animationType="slide" transparent onRequestClose={() => setPaywallOpen(false)}>
        <View style={styles.modalDim}>
          <Paywall
            courseTitle={course.title}
            onClose={() => setPaywallOpen(false)}
            onGranted={reloadAccess}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 8 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  meta: { color: '#666', marginBottom: 16 },
  section: { marginTop: 20, marginBottom: 8, fontWeight: '600', color: '#333' },
  button: { backgroundColor: '#f2f2f2', padding: 14, borderRadius: 8, marginBottom: 8 },
  buttonText: { fontSize: 15 },
  modalDim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
});
