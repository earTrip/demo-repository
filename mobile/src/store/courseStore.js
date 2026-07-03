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

  init(course, srcMap, sessionId) {
    set({
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

  onPosition(lat, lng) {
    const { tracker, played, srcMap, course, sessionId } = get();
    if (!tracker) return;
    for (const scene of tracker.update(lat, lng)) {
      if (played.has(scene.sceneId)) continue; // 1회성
      played.add(scene.sceneId);
      enqueueScene(scene, srcMap.get(scene.sceneId), course.title);
      logEvent(course.id, { sessionId, sceneOrder: scene.order, eventType: 'SCENE_ENTER' });
      set({ playedCount: played.size });
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
