import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCourse, postEvent } from "../api/courseApi";
import { prefetchAudio } from "../offline/prefetch";
import { createGeofenceTracker } from "../utils/geo";
import { AudioQueue } from "../audio/AudioQueue";
import { usePlayerStore } from "../store/playerStore";

/**
 * 코스 진행 오케스트레이션: 위치 구독(또는 데스크톱 시뮬레이트) → 지오펜스 판정 →
 * AudioQueue 재생 → usePlayerStore(zustand)에 반영 → 완주율 이벤트 기록.
 *
 * @param {number} courseId
 * @param {{ onLockedEnter?: (scene) => void }} [options]
 *        onLockedEnter — 잠금 씬 지오펜스 진입 시 호출 (페이월 노출용)
 */
export function useGeofencePlayer(courseId, options = {}) {
  const [status, setStatus] = useState("idle"); // idle|loading|active|completed
  const [course, setCourseData] = useState(null);
  const [playedCount, setPlayedCount] = useState(0);

  const tracker = useRef(null);
  const queue = useRef(null);
  const srcMap = useRef(null);
  const played = useRef(new Set());
  const watchId = useRef(null);
  const dwellTimer = useRef(null);
  const sessionId = useRef(crypto.randomUUID());
  const courseRef = useRef(null); // onPosition 클로저의 stale course 방지
  const onLockedEnterRef = useRef(options.onLockedEnter);
  onLockedEnterRef.current = options.onLockedEnter;

  const setCourseStore = usePlayerStore((s) => s.setCourse);
  const setTrack = usePlayerStore((s) => s.setTrack);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const attachAudioQueue = usePlayerStore((s) => s.attachAudioQueue);
  const play = usePlayerStore((s) => s.play);

  // courseApi.postEvent(courseId, eventType, sceneOrder, sessionId) 계약에 맞춤.
  // 백엔드가 받는 건 sceneId가 아니라 sceneOrder다 (PlaybackEventRequest).
  const emit = useCallback(
    (eventType, sceneOrder = null) => postEvent(courseId, eventType, sceneOrder, sessionId.current),
    [courseId]
  );

  const onPosition = useCallback(
    (lat, lng, accuracyM, nowMs = Date.now()) => {
      if (!tracker.current) return;
      const data = courseRef.current;
      for (const scene of tracker.current.update(lat, lng, accuracyM, nowMs)) {
        if (played.current.has(scene.sceneId)) continue; // 1회성

        // 서버가 잠금 판정한 씬: 재생 대신 페이월 (audioUrl도 내려오지 않음)
        if (scene.locked || !srcMap.current?.get(scene.sceneId)) {
          onLockedEnterRef.current?.(scene);
          continue;
        }

        played.current.add(scene.sceneId);
        setPlayedCount(played.current.size);
        setTrack({ sceneId: scene.sceneId, title: scene.title, subtitle: data?.title });
        setQueue((data?.scenes ?? []).filter((s) => !played.current.has(s.sceneId)));
        queue.current.enqueue(scene, srcMap.current.get(scene.sceneId));
        emit("SCENE_ENTER", scene.order);
      }
      // dwell(체류) 대기 중이면 타이머로 재판정 — 정지 상태에선 watchPosition 이벤트가 안 올 수 있음
      clearTimeout(dwellTimer.current);
      const remainMs = tracker.current.pendingDwellMs(nowMs);
      if (remainMs != null) {
        dwellTimer.current = setTimeout(() => onPosition(lat, lng, accuracyM), remainMs + 250);
      }
    },
    [emit, setTrack, setQueue]
  );

  const start = useCallback(async () => {
    setStatus("loading");
    const data = await fetchCourse(courseId);
    setCourseData(data);
    courseRef.current = data;
    setCourseStore({ id: data.id, title: data.title, region: data.region });

    srcMap.current = await prefetchAudio(data.scenes);
    tracker.current = createGeofenceTracker(data.scenes);
    played.current = new Set();
    setPlayedCount(0);

    const playableCount = data.scenes.filter((s) => !s.locked).length;
    queue.current = new AudioQueue((scene) => {
      emit("SCENE_COMPLETE", scene.order);
      if (played.current.size >= playableCount) {
        emit("COURSE_COMPLETE");
        setStatus("completed");
      }
    });
    attachAudioQueue(queue.current);
    queue.current.prime(); // 사용자 제스처 내에서 오디오 언락

    emit("COURSE_START");
    setStatus("active");
    play();

    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => onPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        (err) => console.warn("geo error", err),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
    }
  }, [courseId, emit, onPosition, setCourseStore, attachAudioQueue, play]);

  // 데스크톱 검증용: 실제 GPS 없이 해당 지점 좌표로 진입을 시뮬레이트.
  // dwell 씬은 체류 시간을 채운 시각을 한 번 더 넣어 즉시 발동시킨다(3초 대기 없이 검증).
  const simulateEnter = useCallback(
    (scene) => {
      const now = Date.now();
      onPosition(scene.lat, scene.lng, 0, now);
      if (scene.triggerType === "dwell") {
        onPosition(scene.lat, scene.lng, 0, now + (scene.dwellSec ?? 3) * 1000 + 1);
      }
    },
    [onPosition]
  );

  useEffect(
    () => () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      clearTimeout(dwellTimer.current);
    },
    []
  );

  return { status, course, playedCount, start, simulateEnter };
}
