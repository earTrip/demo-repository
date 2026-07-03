import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCourse, postEvent } from "../api/courseApi";
import { prefetchAudio } from "../offline/prefetch";
import { createGeofenceTracker } from "../utils/geo";
import { AudioQueue } from "../audio/AudioQueue";
import { usePlayerStore } from "../store/playerStore";

/**
 * 코스 진행 오케스트레이션: 위치 구독(또는 데스크톱 시뮬레이트) → 지오펜스 판정 →
 * AudioQueue 재생 → usePlayerStore(zustand)에 반영 → 완주율 이벤트 기록.
 */
export function useGeofencePlayer(courseId) {
  const [status, setStatus] = useState("idle"); // idle|loading|active|completed
  const [course, setCourseData] = useState(null);
  const [playedCount, setPlayedCount] = useState(0);

  const tracker = useRef(null);
  const queue = useRef(null);
  const srcMap = useRef(null);
  const played = useRef(new Set());
  const watchId = useRef(null);
  const sessionId = useRef(crypto.randomUUID());

  const setCourseStore = usePlayerStore((s) => s.setCourse);
  const setTrack = usePlayerStore((s) => s.setTrack);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const attachAudioQueue = usePlayerStore((s) => s.attachAudioQueue);
  const play = usePlayerStore((s) => s.play);

  const emit = useCallback(
    (eventType, sceneOrder = null) =>
      postEvent(courseId, { sessionId: sessionId.current, sceneOrder, eventType }),
    [courseId]
  );

  const onPosition = useCallback(
    (lat, lng) => {
      if (!tracker.current) return;
      for (const scene of tracker.current.update(lat, lng)) {
        if (played.current.has(scene.sceneId)) continue; // 1회성
        played.current.add(scene.sceneId);
        setPlayedCount(played.current.size);
        setTrack({ sceneId: scene.sceneId, title: scene.title, subtitle: course?.title });
        setQueue((course?.scenes ?? []).filter((s) => !played.current.has(s.sceneId)));
        queue.current.enqueue(scene, srcMap.current.get(scene.sceneId));
        emit("SCENE_ENTER", scene.order);
      }
    },
    [emit, setTrack, setQueue, course]
  );

  const start = useCallback(async () => {
    setStatus("loading");
    const data = await fetchCourse(courseId);
    setCourseData(data);
    setCourseStore({ id: data.id, title: data.title, region: data.region });

    srcMap.current = await prefetchAudio(data.scenes);
    tracker.current = createGeofenceTracker(data.scenes);
    played.current = new Set();
    setPlayedCount(0);

    queue.current = new AudioQueue((scene) => {
      emit("SCENE_COMPLETE", scene.order);
      if (scene.order === data.scenes.length) {
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
        (pos) => onPosition(pos.coords.latitude, pos.coords.longitude),
        (err) => console.warn("geo error", err),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
    }
  }, [courseId, emit, onPosition, setCourseStore, attachAudioQueue, play]);

  // 데스크톱 검증용: 실제 GPS 없이 해당 지점 좌표로 진입을 시뮬레이트
  const simulateEnter = useCallback(
    (scene) => onPosition(scene.lat, scene.lng),
    [onPosition]
  );

  useEffect(
    () => () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    },
    []
  );

  return { status, course, playedCount, start, simulateEnter };
}
