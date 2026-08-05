import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Dimensions, Modal, Platform, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as Location from 'expo-location';

import { useCourseStore } from '../store/courseStore';
import {
  setupPlayer, subscribePlayback, pause, resume, skipNext, restartCurrent, seekTo,
} from '../player/trackQueue';
import { startTracking, stopTracking } from '../location/backgroundTask';
import { downloadCourseAudio } from '../offline/download';
import { fetchCourse } from '../api/courseApi';
import { MOCK_COURSE, MOCK_LOCAL_AUDIO } from '../data/mockCourse';
import { useAuthSession } from '../auth/useAuthSession';
import { useAccess } from '../payment/useAccess';
import { distanceM } from '../utils/geo';
import { colors, radius, shadow } from '../theme';
import Paywall from '../payment/Paywall';
import PlayerMap from './PlayerMap';

const MAP_HEIGHT = Math.round(Dimensions.get('window').height * 0.4);

const SCRIPT_PLACEHOLDER =
  '이 장면의 대본은 준비 중입니다. 지점에 도착하면 오디오 안내가 자동으로 재생됩니다.';

// 지원 언어. 현재 콘텐츠(대본·오디오)는 한국어만 있어 나머지는 '준비 중'(비활성)으로 노출한다.
const LANGS = [
  { code: 'ko', label: '한국어', ready: true },
  { code: 'en', label: 'English', ready: false },
  { code: 'ja', label: '日本語', ready: false },
  { code: 'zh', label: '中文', ready: false },
];

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

function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

/** 자막 하이라이트 근사: 타임스탬프가 없으므로 첫 문장을 '현재 대사'로 굵게, 나머지는 회색. */
function splitScript(text) {
  const m = text.match(/^[\s\S]*?[.!?。][\s]?/);
  if (!m) return { current: text, upcoming: '' };
  return { current: m[0].trim(), upcoming: text.slice(m[0].length).trim() };
}

/**
 * 코스 플레이어 (자갈치.png 스타일 · 오렌지 포인트).
 * 지도(상단)·현재 씬 대본(중단)·재생 컨트롤(하단)로 구성된다.
 * 실 보행 중엔 백그라운드 GPS가 지점 반경 진입 시 자동 재생하고, 시뮬레이터/데스크톱에선
 * 지도 핀을 탭해 진입을 시뮬레이트한다(잠금 씬은 페이월). 재생 상태는 trackQueue 구독으로 받는다.
 */
export default function PlayerScreen({ route, navigation }) {
  const courseId = route?.params?.courseId ?? MOCK_COURSE.id;
  const [course, setCourse] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [ready, setReady] = useState(false);
  const status = useCourseStore((s) => s.status);
  const playedCount = useCourseStore((s) => s.playedCount);
  const onPosition = useCourseStore((s) => s.onPosition);
  const { loaded: accessLoaded, canPlayScene, reload: reloadAccess } = useAccess(courseId);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState('idle'); // idle|active|denied

  const [playback, setPlayback] = useState({ scene: null, positionSec: 0, durationSec: 0, isPlaying: false });
  const [userPos, setUserPos] = useState(null); // 내 위치(전경 watch) — 다음 정류장 거리 계산용
  const [showScript, setShowScript] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState('ko');
  const posSubRef = useRef(null);
  const barWidthRef = useRef(0);

  const langLabel = LANGS.find((l) => l.code === lang)?.label ?? '한국어';

  const startBackgroundTracking = async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      setTrackingStatus('denied');
      return;
    }
    if (!posSubRef.current) {
      posSubRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
        (loc) => setUserPos({ lat: loc.coords.latitude, lng: loc.coords.longitude }),
      );
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
    const unsub = subscribePlayback(setPlayback);
    (async () => {
      const data = await loadCourse(courseId);
      if (!data) {
        setLoadError(true);
        return;
      }
      setCourse(data);

      await setupPlayer((sceneId) => useCourseStore.getState().onSceneComplete(sceneId));
      const srcMap = await loadAudio(data.scenes);
      useCourseStore.getState().init(data, srcMap, `session-${Date.now()}`, () => setPaywallOpen(true));
      setReady(true);

      if (Platform.OS !== 'web') {
        await startBackgroundTracking();
      }
    })();

    return () => {
      unsub();
      posSubRef.current?.remove?.();
      posSubRef.current = null;
      stopTracking();
    };
  }, [courseId]);

  const simulateEnter = (scene) => {
    const now = Date.now();
    onPosition(scene.lat, scene.lng, 0, now);
    if (scene.triggerType === 'dwell') {
      onPosition(scene.lat, scene.lng, 0, now + (scene.dwellSec ?? 3) * 1000 + 1);
    }
  };

  const onMarkerPress = (scene) => {
    if (!ready) return;
    if (accessLoaded && !canPlayScene(scene.order)) {
      setPaywallOpen(true);
      return;
    }
    simulateEnter(scene);
  };

  const scenes = course?.scenes ?? [];
  const currentScene = playback.scene;
  const currentOrder = currentScene?.order ?? 0;
  const nextScene = useMemo(
    () => scenes.find((s) => s.order > currentOrder) ?? null,
    [scenes, currentOrder],
  );
  const nextDist = userPos && nextScene
    ? fmtDist(distanceM(userPos.lat, userPos.lng, nextScene.lat, nextScene.lng))
    : null;

  const totalSec = playback.durationSec || currentScene?.estimatedSec || 0;
  const progress = totalSec > 0 ? Math.min(1, playback.positionSec / totalSec) : 0;

  const onSeekPress = (e) => {
    if (totalSec <= 0 || barWidthRef.current <= 0) return;
    const frac = Math.min(1, Math.max(0, e.nativeEvent.locationX / barWidthRef.current));
    seekTo(frac * totalSec);
  };

  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFill}><Text style={styles.dimText}>코스를 아직 준비 중입니다.</Text></View>
      </SafeAreaView>
    );
  }
  if (!course) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFill}><ActivityIndicator color={colors.orange} /></View>
      </SafeAreaView>
    );
  }

  const script = currentScene ? (currentScene.script ?? SCRIPT_PLACEHOLDER) : SCRIPT_PLACEHOLDER;
  const { current: scriptCurrent, upcoming: scriptUpcoming } = splitScript(script);

  const triggerText = currentScene
    ? `${course.region ?? ''} · 진입`
    : trackingStatus === 'active' ? '지점에 도착하면 자동 재생'
      : trackingStatus === 'denied' ? '위치 권한이 필요합니다'
        : status === 'completed' ? '코스를 완주했습니다' : '위치 확인 중...';

  // NEXT STOP과 같은 지점명(landmark)을 쓴다 — 보행 중엔 서사용 씬 제목보다
  // "지금 어디에 서 있는지"가 먼저다. landmark가 없는 코스는 title로 폴백.
  const sceneTitle = currentScene
    ? `SCENE ${currentScene.order} · ${currentScene.landmark ?? currentScene.title}`
    : status === 'completed' ? '완주' : '출발 전';

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단바 */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.iconBtn} accessibilityLabel="나가기">
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1} accessibilityRole="header">{course.title}</Text>
        <View style={styles.iconBtn}><Text style={styles.menuIcon}>⋮</Text></View>
      </View>

      {/* 지도 (상단 40%) */}
      <View style={[styles.mapWrap, { height: MAP_HEIGHT }]}>
        <PlayerMap
          scenes={scenes}
          activeSceneId={currentScene?.sceneId ?? null}
          nextSceneId={nextScene?.sceneId ?? null}
          onMarkerPress={onMarkerPress}
        />
        <View style={styles.mapTitle} pointerEvents="none">
          <Text style={styles.mapTitleText}>부산 {course.region} 시장</Text>
        </View>
        {nextScene && (
          <View style={styles.nextCard} pointerEvents="none">
            <Text style={styles.nextLabel}>NEXT STOP</Text>
            <Text style={styles.nextTitle} numberOfLines={1}>
              {/* 보행 안내라 서사용 씬 제목이 아니라 실제 지점명(landmark)을 띄운다.
                  백엔드 코스에는 아직 landmark가 없어 없으면 title로 폴백. */}
              {nextScene.landmark ?? nextScene.title}{nextDist ? ` · ${nextDist}` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* 위치 트리거 배지 */}
      <View style={styles.triggerRow}>
        <View style={[styles.ring, currentScene ? styles.ringOn : styles.ringOff]} />
        <Text style={[styles.triggerText, currentScene && styles.triggerTextOn]} numberOfLines={1}>
          {triggerText}
        </Text>
        <Text style={styles.progressCount}>{playedCount}/{scenes.length}</Text>
      </View>

      {/* 현재 씬 제목 */}
      <Text style={styles.sceneTitle} numberOfLines={2}>{sceneTitle}</Text>

      {/* 스크립트(자막) — 현재 대사 굵게, 다음 줄 회색 */}
      {showScript ? (
        <ScrollView style={styles.scriptWrap} contentContainerStyle={styles.scriptContent}>
          <Text style={styles.scriptCurrent}>
            {scriptCurrent}
            {scriptUpcoming ? <Text style={styles.scriptUpcoming}>{'\n' + scriptUpcoming}</Text> : null}
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.scriptWrap} />
      )}

      {/* 하단 재생 컨트롤 */}
      <View style={styles.playerBar}>
        <Pressable
          style={styles.track}
          onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}
          onPress={onSeekPress}
        >
          <View style={styles.trackBg} />
          <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
          <View style={[styles.trackKnob, { left: `${progress * 100}%` }]} />
        </Pressable>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{fmtTime(playback.positionSec)}</Text>
          <Text style={styles.timeText}>{fmtTime(totalSec)}</Text>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={restartCurrent} disabled={!currentScene} style={styles.ctrlBtn} accessibilityLabel="처음부터">
            <Text style={[styles.ctrlIcon, !currentScene && styles.ctrlDisabled]}>⏮</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (playback.isPlaying ? pause() : resume())}
            disabled={!currentScene}
            style={styles.ctrlBtn}
            accessibilityLabel={playback.isPlaying ? '일시정지' : '재생'}
          >
            <Text style={[styles.playIcon, !currentScene && styles.ctrlDisabled]}>{playback.isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={skipNext} style={styles.ctrlBtn} accessibilityLabel="다음">
            <Text style={styles.ctrlIcon}>⏭</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.langChip}
            onPress={() => setLangOpen(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={`언어 선택, 현재 ${langLabel}`}
          >
            <Text style={styles.langGlobe}>🌐</Text>
            <Text style={styles.langText}>{langLabel} ▾</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowScript((v) => !v)}
            style={styles.subToggle}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityState={{ selected: showScript }}
            accessibilityLabel="자막 켜기/끄기"
          >
            <Text style={styles.subGlyph}>🗎</Text>
            <Text style={[styles.subText, showScript && styles.subTextOn]}>자막</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={paywallOpen} animationType="slide" transparent onRequestClose={() => setPaywallOpen(false)}>
        <View style={styles.modalDim}>
          <Paywall courseTitle={course.title} onClose={() => setPaywallOpen(false)} onGranted={reloadAccess} />
        </View>
      </Modal>

      <Modal visible={langOpen} animationType="slide" transparent onRequestClose={() => setLangOpen(false)}>
        <Pressable style={styles.modalDim} onPress={() => setLangOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle} accessibilityRole="header">언어 선택</Text>
            {LANGS.map((l) => {
              const selected = l.code === lang;
              return (
                <TouchableOpacity
                  key={l.code}
                  style={styles.langRow}
                  disabled={!l.ready}
                  onPress={() => { setLang(l.code); setLangOpen(false); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: !l.ready }}
                  accessibilityLabel={`${l.label}${l.ready ? '' : ', 준비 중'}`}
                >
                  <Text style={[styles.langRowText, !l.ready && styles.langRowDim]}>{l.label}</Text>
                  {l.ready
                    ? (selected ? <Text style={styles.langCheck}>✓</Text> : null)
                    : <Text style={styles.langSoon}>준비 중</Text>}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dimText: { color: colors.inkSoft, fontSize: 15 },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 52 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: colors.ink },
  menuIcon: { fontSize: 22, color: colors.ink },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.ink },

  mapWrap: { width: '100%', backgroundColor: '#e9ecf2' },
  mapTitle: { position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center' },
  mapTitleText: { fontSize: 17, fontWeight: '800', color: colors.ink, textShadowColor: 'rgba(255,255,255,0.9)', textShadowRadius: 6 },
  nextCard: {
    position: 'absolute', left: 12, bottom: 12, backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '72%', ...shadow.card,
  },
  nextLabel: { fontSize: 9, color: colors.orange, fontWeight: '800', letterSpacing: 1 },
  nextTitle: { fontSize: 13, color: colors.ink, fontWeight: '800', marginTop: 1 },

  triggerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 2 },
  ring: { width: 15, height: 15, borderRadius: 8, borderWidth: 4, marginRight: 8 },
  ringOn: { borderColor: colors.orange },
  ringOff: { borderColor: '#cfd3dd' },
  triggerText: { flex: 1, fontSize: 14, color: colors.inkSoft, fontWeight: '700' },
  triggerTextOn: { color: colors.orangeDeep },
  progressCount: { fontSize: 13, color: colors.orange, fontWeight: '800', marginLeft: 8 },

  sceneTitle: { fontSize: 21, fontWeight: '800', color: colors.ink, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },

  scriptWrap: { flex: 1, paddingHorizontal: 20 },
  scriptContent: { paddingTop: 4, paddingBottom: 16 },
  scriptCurrent: { fontSize: 20, lineHeight: 32, fontWeight: '800', color: colors.ink },
  scriptUpcoming: { fontWeight: '600', color: '#b9bdc9' },

  playerBar: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14, backgroundColor: colors.bg },
  track: { height: 22, justifyContent: 'center' },
  trackBg: { position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: '#e6e7ec' },
  trackFill: { position: 'absolute', left: 0, height: 3, borderRadius: 2, backgroundColor: colors.orange },
  trackKnob: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.white, marginLeft: -7, borderWidth: 3, borderColor: colors.orange },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  timeText: { fontSize: 12, color: colors.inkSoft, fontWeight: '600' },

  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 44, paddingVertical: 10 },
  ctrlBtn: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  ctrlIcon: { fontSize: 28, color: colors.ink },
  playIcon: { fontSize: 34, color: colors.ink },
  ctrlDisabled: { color: '#cfd3dd' },

  optionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  langChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  langGlobe: { fontSize: 15 },
  langText: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  subToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subGlyph: { fontSize: 15 },
  subText: { fontSize: 14, color: colors.inkSoft, fontWeight: '700' },
  subTextOn: { color: colors.ink },

  modalDim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#dfe1e8', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  langRowText: { fontSize: 16, fontWeight: '600', color: colors.ink },
  langRowDim: { color: '#c2c5cf' },
  langCheck: { fontSize: 18, fontWeight: '800', color: colors.orange },
  langSoon: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, backgroundColor: colors.bgSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
});
