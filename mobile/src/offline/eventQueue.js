import AsyncStorage from '@react-native-async-storage/async-storage';
import { postEvent } from '../api/courseApi';

const KEY = 'pending-events';

// TODO: /api/courses/{id}/events 엔드포인트가 현재 백엔드(com.eartrip)에 없음 —
// react_native_백그라운드_설계.md의 이벤트 큐는 구형 backend/(com.hearbusan)의
// PlaybackEvent API를 전제로 함. 어느 쪽을 정본으로 쓸지 확인 후 postEvent 대상 교체할 것.

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
