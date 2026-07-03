import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useCourseStore } from '../store/courseStore';

const LOC_TASK = 'course-location-task';

// defineTask는 전역 스코프에서 호출되어야 함(React 라이프사이클 밖) — 모듈 로드 시 1회 등록.
// 웹은 배경 위치 태스크 자체가 없으므로 등록을 건너뛴다(등록해도 콜백이 오지 않음).
if (Platform.OS !== 'web') {
  TaskManager.defineTask(LOC_TASK, ({ data, error }) => {
    if (error || !data) return;
    const { latitude, longitude } = data.locations.at(-1).coords;
    useCourseStore.getState().onPosition(latitude, longitude);
  });
}

/**
 * 코스 시작 시 호출. 화면 꺼짐/백그라운드 전환 후에도 위치 스트림 유지.
 * 웹은 startLocationUpdatesAsync 자체가 없어(네이티브 전용 API) 호출하지 않고 false를 반환한다.
 */
export async function startTracking() {
  if (Platform.OS === 'web') {
    console.warn('[backgroundTask] 배경 위치 추적은 네이티브 빌드에서만 동작합니다 (웹 미지원).');
    return false;
  }
  await Location.startLocationUpdatesAsync(LOC_TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: 5, // 5m 이동마다 (배터리/정확도 균형)
    foregroundService: {
      notificationTitle: '코스 진행 중',
      notificationBody: '지점에 도착하면 이야기가 재생됩니다.',
    },
  });
}

/** 완주·중단 시 반드시 호출 (세션 스코프 구독 — 배터리 보호) */
export async function stopTracking() {
  if (Platform.OS === 'web') return;
  if (await TaskManager.isTaskRegisteredAsync(LOC_TASK)) {
    await Location.stopLocationUpdatesAsync(LOC_TASK);
  }
}
