import AsyncStorage from '@react-native-async-storage/async-storage';
import { postEvent } from '../api/courseApi';

const KEY = 'pending-events';

// 정본: com.eartrip의 CourseController POST /api/courses/{id}/events.
// payload는 CourseDtos.PlaybackEventRequest(sessionId, sceneOrder, eventType) 형태여야 하며
// sessionId·eventType은 @NotNull이라 누락/오타 시 400이다 (구형 com.hearbusan 백엔드는 제거됨).

/** 완주율 계측 이벤트. 오프라인이면 로컬 큐에 적재 후 다음 flush에서 재시도 */
export async function logEvent(courseId, payload) {
  const ok = await postEvent(courseId, payload).then(() => true).catch(() => false);
  if (!ok) {
    const q = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]');
    q.push({ courseId, payload });
    await AsyncStorage.setItem(KEY, JSON.stringify(q));
  }
}

/** 앱 포그라운드 복귀/온라인 전환 시 호출 */
export async function flushEvents() {
  const q = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]');
  const rest = [];
  for (const e of q) {
    const ok = await postEvent(e.courseId, e.payload).then(() => true).catch(() => false);
    if (!ok) rest.push(e);
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(rest));
}
