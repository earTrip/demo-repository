import { create } from "zustand";

/**
 * 전역 플레이어 상태.
 * useGeofencePlayer가 씬 진입 시 setTrack/play를 호출하고,
 * MiniPlayer는 이 스토어만 구독한다. (기존 AudioQueue와 연결점)
 */
export const usePlayerStore = create((set, get) => ({
  course: null,        // 현재 코스 요약 { id, title, region }
  track: null,         // 현재 씬 { sceneId, title, subtitle, thumb }
  isPlaying: false,
  queue: [],           // 남은 씬 목록
  audioQueueRef: null, // AudioQueue 인스턴스 (useGeofencePlayer가 주입)

  attachAudioQueue: (aq) => set({ audioQueueRef: aq }),
  setCourse: (course) => set({ course }),
  setTrack: (track) => set({ track }),
  setQueue: (queue) => set({ queue }),

  play: () => {
    get().audioQueueRef?.resume?.();
    set({ isPlaying: true });
  },
  pause: () => {
    get().audioQueueRef?.pause?.();
    set({ isPlaying: false });
  },
  toggle: () => (get().isPlaying ? get().pause() : get().play()),
  next: () => get().audioQueueRef?.skipNext?.(),
  prev: () => get().audioQueueRef?.restartCurrent?.(),
}));
