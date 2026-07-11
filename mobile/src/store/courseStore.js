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
  played: new Set(),
  playedCount: 0,
  sessionId: null,
  dwellTimer: null, // dwell 씬 재판정 타이머 (정지 상태 대비)

  init(course, srcMap, sessionId) {
    clearTimeout(get().dwellTimer); // 이전 세션의 dwell 재판정 타이머 정리
    set({
      dwellTimer: null,
      course,
      srcMap,
      sessionId,
      tracker: createGeofenceTracker(course.scenes),
      played: new Set(),
      playedCount: 0,
      status: 'active',
    });
    logEvent(course.id, { sessionId, eventType: 'COURSE_START' });
  },

  onPosition(lat, lng, nowMs = Date.now()) {
    const { tracker, played, srcMap, course, sessionId, dwellTimer } = get();
    if (!tracker) return;
    for (const scene of tracker.update(lat, lng, nowMs)) {
      if (played.has(scene.sceneId)) continue; // 1회성
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
      set({ dwellTimer: setTimeout(() => get().onPosition(lat, lng), remainMs + 250) });
    }
  },

  onSceneComplete(sceneId) {
    const { course, sessionId } = get();
    logEvent(course.id, { sessionId, sceneId, eventType: 'SCENE_COMPLETE' });
    const last = course.scenes[course.scenes.length - 1];
    if (sceneId === last.sceneId) {
      logEvent(course.id, { sessionId, eventType: 'COURSE_COMPLETE' });
      set({ status: 'completed' });
    }
  },
}));
