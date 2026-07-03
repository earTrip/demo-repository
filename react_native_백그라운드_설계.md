# React Native 백그라운드 버전 설계

*귀로 듣는 여행 — "폰을 주머니에" 경험을 완성하는 네이티브 아키텍처*

---

## 0. 왜 네이티브인가

웹 MVP의 두 가지 근본 한계를 네이티브만 해결한다.

1. **백그라운드 위치** — 브라우저는 화면이 꺼지거나 앱이 백그라운드로 가면 `watchPosition`을 멈춘다. 걷는 내내 폰을 주머니에 넣는 이 제품의 핵심 경험이 웹에서는 불가능하다.
2. **백그라운드 오디오** — 화면 잠금 상태에서 이어폰으로 계속 재생 + 잠금화면 컨트롤이 필요하다.

핵심 재생 로직(`geo.js`의 히스테리시스 트래커, `AudioQueue`의 큐잉)은 **그대로 이식**되고, 위치 구독·오디오 출력·오프라인 저장 계층만 네이티브 API로 교체한다.

---

## 1. 라이브러리 선택 (MVP 기준)

| 역할 | 선택 | 비고 |
|---|---|---|
| 런타임 | **Expo (Dev Client)** | 배경 태스크·위치·오디오 네이티브 모듈 사용 위해 bare가 아닌 dev client |
| 위치(전경/배경) | **expo-location** | `watchPositionAsync` + `startLocationUpdatesAsync`(배경) |
| 배경 태스크 | **expo-task-manager** | 배경 위치 콜백 진입점 |
| 배경 오디오 | **react-native-track-player** | 잠금화면 컨트롤·오디오 세션·큐 내장 |
| 오프라인 파일 | **expo-file-system** | `downloadAsync`로 클립 로컬 캐싱 |
| 로컬 이벤트 큐 | **expo-sqlite** 또는 AsyncStorage | 오프라인 이벤트 적재 후 flush |
| 상태관리 | **Zustand** | 기존 선호 스택 |

> 대안: 상용 `react-native-background-geolocation`(TransistorSoft)은 배경 위치 안정성이 최상급이지만 유료. MVP는 expo 스택으로 시작하고, 배경 신뢰성 이슈가 확인되면 교체를 검토한다.

---

## 2. 핵심 설계 결정: OS 지오펜스가 아니라 "지속 위치 + 자체 트래커"

**함정:** iOS/Android의 네이티브 지오펜스(region monitoring)는 **최소 반경이 크다(실측 100m 내외 권장).** 그런데 자갈치 지점 간 반경은 20~55m다. 네이티브 지오펜스만 쓰면 지점들이 서로 겹치거나 트리거가 부정확해진다.

**해법 (하이브리드):**

- **코스 진행 중(active session):** 전경 서비스/배경 위치 권한으로 **지속 위치 스트림**을 받고, 우리가 만든 `createGeofenceTracker`로 **정밀 반경 판정**을 직접 한다. → 20~55m 반경을 정확히 제어. (이게 주력)
- **네이티브 지오펜스(보조):** 앱이 완전히 종료된 뒤 사용자가 코스 근처로 돌아왔을 때 "코스 재개" 알림을 띄우는 용도로만 큰 반경(150m+) 1개를 건다.

즉 **정밀 트리거는 우리 로직, 앱 부활은 OS 지오펜스**로 역할을 분리한다.

```
[OS 위치 스트림] --(lat,lng)--> [GeofenceTracker(재사용)] --enter--> [TrackPlayer.enqueue]
                                                          └--------> [EventLogger(오프라인 큐)]
[OS 네이티브 지오펜스(큰 반경 1개)] --앱 종료 후 근접--> [로컬 알림: 코스 이어듣기]
```

---

## 3. OS별 권한·설정

### iOS (`app.json` / Info.plist)
- `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`
- `UIBackgroundModes`: `location`, `audio`
- 권한은 **2단계**: 먼저 "앱 사용 중 허용" → 코스 시작 시 "항상 허용" 상향 요청.

### Android (`app.json` / AndroidManifest)
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION` (Android 10+, **별도 화면에서 재요청** 필요)
- `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`
- `POST_NOTIFICATIONS` (Android 13+, 전경 서비스 알림)
- Doze/배터리 최적화 예외 안내(제조사별 종료 방지).

```json
// app.json (발췌)
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["location", "audio"],
        "NSLocationAlwaysAndWhenInUseUsageDescription": "코스를 걷는 동안 지점에 도착하면 이야기를 자동 재생합니다.",
        "NSLocationWhenInUseUsageDescription": "지점 도착을 감지해 오디오를 재생합니다."
      }
    },
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION", "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION", "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "POST_NOTIFICATIONS"
      ]
    },
    "plugins": ["expo-location", "expo-task-manager"]
  }
}
```

---

## 4. 재사용/이식 매핑

| 웹 MVP | RN 대응 | 변경 |
|---|---|---|
| `utils/geo.js` | 동일 파일 | **그대로 재사용** (순수 함수) |
| `audio/AudioQueue.js` | `player/trackQueue.js` | HTMLAudio → TrackPlayer 큐로 교체 |
| `offline/prefetch.js` | `offline/download.js` | fetch/blob → `FileSystem.downloadAsync` |
| `api/courseApi.js` | 거의 동일 | fetch 유지, 이벤트는 오프라인 큐 경유 |
| `hooks/useGeofencePlayer.js` | Zustand store + 배경 태스크 | 위치 구독을 배경 태스크로 이동 |
| `PlaybackEvent` API | 동일 백엔드 | **백엔드 그대로 재사용** |

---

## 5. 핵심 코드 스케치

### 5-1. 오프라인 다운로드 (expo-file-system)
```javascript
import * as FileSystem from 'expo-file-system';

export async function downloadCourseAudio(scenes) {
  const dir = FileSystem.documentDirectory + 'audio/';
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const srcMap = new Map();
  for (const s of scenes) {
    const dest = `${dir}s${s.sceneOrder}.aac`;
    const info = await FileSystem.getInfoAsync(dest);
    if (!info.exists) await FileSystem.downloadAsync(s.audioClipUrl, dest);
    srcMap.set(s.sceneOrder, dest); // 로컬 file:// 경로 (완전 오프라인 재생)
  }
  return srcMap;
}
```

### 5-2. 배경 오디오 큐 (react-native-track-player)
```javascript
import TrackPlayer, { Capability, Event } from 'react-native-track-player';

export async function setupPlayer(onSceneComplete) {
  await TrackPlayer.setupPlayer();
  await TrackPlayer.updateOptions({
    capabilities: [Capability.Play, Capability.Pause], // 잠금화면 최소 컨트롤
  });
  // 트랙(=지점) 하나가 끝나면 완주 로깅
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (e) => {
    if (e.lastTrack) onSceneComplete(Number(e.lastTrack.id));
  });
}

// 재생 중이면 자동으로 큐 뒤에 붙는다 = "걷는 속도 적응"(끊지 않음)
export async function enqueueScene(scene, localUri) {
  await TrackPlayer.add({
    id: String(scene.sceneOrder),
    url: localUri,
    title: scene.title,
    artist: '새벽, 자갈치',
  });
  const state = (await TrackPlayer.getPlaybackState()).state;
  if (state !== 'playing') await TrackPlayer.play();
}
```

### 5-3. 배경 위치 태스크 + 자체 트래커 (정밀 판정)
```javascript
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { createGeofenceTracker } from '../utils/geo'; // 웹과 동일 파일
import { useCourseStore } from '../store/courseStore';

const LOC_TASK = 'course-location-task';

TaskManager.defineTask(LOC_TASK, ({ data, error }) => {
  if (error || !data) return;
  const { latitude, longitude } = data.locations.at(-1).coords;
  useCourseStore.getState().onPosition(latitude, longitude); // 트래커 → 큐잉
});

export async function startTracking() {
  await Location.startLocationUpdatesAsync(LOC_TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: 5,          // 5m 이동마다 (배터리/정확도 균형)
    foregroundService: {          // Android 전경 서비스(종료 방지)
      notificationTitle: '코스 진행 중',
      notificationBody: '지점에 도착하면 이야기가 재생됩니다.',
    },
  });
}

export async function stopTracking() {
  if (await TaskManager.isTaskRegisteredAsync(LOC_TASK)) {
    await Location.stopLocationUpdatesAsync(LOC_TASK);
  }
}
```

### 5-4. Zustand 스토어 (오케스트레이션)
```javascript
import { create } from 'zustand';
import { createGeofenceTracker } from '../utils/geo';
import { enqueueScene } from '../player/trackQueue';
import { logEvent } from '../offline/eventQueue';

export const useCourseStore = create((set, get) => ({
  status: 'idle',
  course: null,
  srcMap: null,
  tracker: null,
  played: new Set(),
  sessionId: null,

  init(course, srcMap, sessionId) {
    set({ course, srcMap, sessionId, tracker: createGeofenceTracker(course.scenes), status: 'active' });
    logEvent(course.id, { sessionId, eventType: 'COURSE_START' });
  },

  onPosition(lat, lng) {
    const { tracker, played, srcMap, course, sessionId } = get();
    if (!tracker) return;
    for (const scene of tracker.update(lat, lng)) {
      if (played.has(scene.sceneOrder)) continue; // 1회성
      played.add(scene.sceneOrder);
      enqueueScene(scene, srcMap.get(scene.sceneOrder));
      logEvent(course.id, { sessionId, sceneOrder: scene.sceneOrder, eventType: 'SCENE_ENTER' });
      set({ playedCount: played.size });
    }
  },

  onSceneComplete(sceneOrder) {
    const { course, sessionId } = get();
    logEvent(course.id, { sessionId, sceneOrder, eventType: 'SCENE_COMPLETE' });
    if (sceneOrder === course.scenes.length) {
      logEvent(course.id, { sessionId, eventType: 'COURSE_COMPLETE' });
      set({ status: 'completed' });
    }
  },
}));
```

### 5-5. 오프라인 이벤트 큐 (완주율 계측 정확도)
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postEvent } from '../api/courseApi';

const KEY = 'pending-events';

export async function logEvent(courseId, payload) {
  const ok = await postEvent(courseId, payload).then(() => true).catch(() => false);
  if (!ok) {
    const q = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]');
    q.push({ courseId, payload });
    await AsyncStorage.setItem(KEY, JSON.stringify(q));
  }
}

// 앱 포그라운드 복귀/온라인 전환 시 호출
export async function flushEvents() {
  const q = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]');
  const rest = [];
  for (const e of q) {
    const ok = await postEvent(e.courseId, e.payload).then(() => true).catch(() => false);
    if (!ok) rest.push(e);
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(rest));
}
```

---

## 6. 배터리·안정성 튜닝 포인트

- **세션 스코프 구독:** 지속 위치는 코스 진행 중에만. 완주·중단 시 `stopTracking()` 반드시 호출.
- `distanceInterval`(5m)과 `Accuracy.High`의 균형 — 지점 반경이 좁으면 정확도 우선, 넓으면 간격을 늘려 절전.
- **Android 전경 서비스 알림**은 필수(없으면 OS가 태스크를 죽인다). 사용자에게 "왜 계속 실행되는지" 명확히.
- 제조사 배터리 최적화(삼성·샤오미 등) 예외 등록 안내 화면 제공.
- iOS는 `audio` 백그라운드 모드가 활성(재생 중)일 때 위치 유지가 안정적 — 오디오와 위치를 함께 살린다.

---

## 7. 구현 순서 (스프린트)

1. **S1 — 재생 코어:** expo-file-system 다운로드 + track-player 큐 + `geo.js` 이식. 전경 상태에서 5-2·5-3 연결해 시뮬레이트 이동으로 검증.
2. **S2 — 배경화:** 배경 위치 태스크 + Android 전경 서비스 + iOS 백그라운드 모드. **화면 잠근 채 실제 자갈치 코스 완주 테스트**(보행 QA와 병행).
3. **S3 — 계측·복원력:** 오프라인 이벤트 큐 + flush, 앱 종료 후 네이티브 지오펜스로 "이어듣기" 알림.
4. **S4 — 권한 UX:** 2단계 위치 권한 온보딩, 배터리 최적화 안내.

**검증 게이트(S2):** 화면 잠금 + 폰 주머니 상태에서 지점 도착 시 3초 내 자동 재생 && 완주율 이벤트가 서버에 정확히 적재되는가.

---

## 8. 웹 MVP와의 관계

웹 MVP(zip)는 **로직·API·완주율 계측의 검증장**이다. `geo.js`와 백엔드 전체가 네이티브로 무손실 이식되므로, 웹에서 포맷과 지표를 먼저 확정한 뒤 네이티브는 "배경 실행 계층"만 얹는 순서가 가장 빠르고 안전하다.
