import { create } from 'zustand';
import { createGeofenceTracker } from '../utils/geo';
import { enqueueScene } from '../player/trackQueue';
import { logEvent } from '../offline/eventQueue';

/** 코스 진행 오케스트레이션. 위치 구독(백그라운드 태스크) → 지오펜스 판정 → 재생 큐잉 → 계측. */
export const useCourseStore = create((set, get) => ({
  status: 'idle', // idle|active|completed
  course: null,
  srcMap: null,
  tracker: null,
  played: new Set(), // 진입(큐잉)한 씬 — 재생 완료와 다르다
  playedCount: 0,
  completed: new Set(), // 재생을 마친 씬 — 완주 판정 기준
  sessionId: null,
  dwellTimer: null, // dwell 씬 재판정 타이머 (정지 상태 대비)
  onLockedEnter: null, // 잠금 씬 진입 콜백 (페이월 노출) — 화면이 주입
  playableCount: 0, // 잠금 씬 제외 — 완주 판정 기준

  /** @param {(scene) => void} [onLockedEnter] 잠금 씬 지오펜스 진입 시 호출 */
  init(course, srcMap, sessionId, onLockedEnter = null) {
    clearTimeout(get().dwellTimer); // 이전 세션의 dwell 재판정 타이머 정리
    set({
      dwellTimer: null,
      course,
      srcMap,
      sessionId,
      onLockedEnter,
      tracker: createGeofenceTracker(course.scenes),
      played: new Set(),
      playedCount: 0,
      completed: new Set(),
      playableCount: course.scenes.filter((s) => !s.locked).length,
      status: 'active',
    });
    logEvent(course.id, { sessionId, eventType: 'COURSE_START' });
  },

  onPosition(lat, lng, accuracyM, nowMs = Date.now()) {
    const { tracker, played, srcMap, course, sessionId, dwellTimer, onLockedEnter } = get();
    if (!tracker) return;
    for (const scene of tracker.update(lat, lng, accuracyM, nowMs)) {
      if (played.has(scene.sceneId)) continue; // 1회성

      // 서버가 잠금 판정한 씬은 audioUrl을 내리지 않아 srcMap에 없다 (SceneView.of).
      // 그대로 큐잉하면 player.replace(undefined)로 트랙 큐가 멈춰 이후 씬이 전부 재생되지 않는다.
      if (scene.locked || !srcMap.get(scene.sceneId)) {
        onLockedEnter?.(scene); // 재생 대신 페이월
        continue;
      }

      played.add(scene.sceneId);
      enqueueScene(scene, srcMap.get(scene.sceneId), course.title);
      logEvent(course.id, { sessionId, sceneOrder: scene.order, eventType: 'SCENE_ENTER' });
      set({ playedCount: played.size });
    }
    // dwell(체류) 대기 중이면 타이머로 재판정 — 정지 상태에선 위치 업데이트가 안 올 수 있음
    // (backgroundTask는 distanceInterval 5m 기준이라 멈춰 서면 이벤트가 끊긴다)
    clearTimeout(dwellTimer);
    const remainMs = tracker.pendingDwellMs(nowMs);
    if (remainMs != null) {
      set({ dwellTimer: setTimeout(() => get().onPosition(lat, lng, accuracyM), remainMs + 250) });
    }
  },

  onSceneComplete(sceneId) {
    const { course, sessionId, completed, playableCount } = get();
    // 백엔드 PlaybackEventRequest는 sceneId가 아니라 sceneOrder를 받는다 (@NotNull eventType과 함께).
    const sceneOrder = course.scenes.find((s) => s.sceneId === sceneId)?.order ?? null;
    logEvent(course.id, { sessionId, sceneOrder, eventType: 'SCENE_COMPLETE' });

    // 마지막 씬이 잠겨 있으면 영영 재생되지 않으므로 '마지막 sceneId 도달'로는 완주를 못 잡는다.
    // 진입(played)이 아니라 재생을 마친 씬(completed)으로 세야 한다 — 지점을 다 지나쳐 큐에만
    // 쌓인 상태에서 첫 씬이 끝나면 완주로 오판한다.
    completed.add(sceneId);
    if (playableCount > 0 && completed.size >= playableCount) {
      logEvent(course.id, { sessionId, eventType: 'COURSE_COMPLETE' });
      set({ status: 'completed' });
    }
  },
}));
