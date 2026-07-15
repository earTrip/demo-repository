# 지오펜스 재생 엔진 MVP — Spring Boot 3.3 + React

**스택:** Java 21 · Spring Boot 3.3 · MySQL · JUnit 5 / React
**설계 원칙:** SOLID, 메서드 분리, 오프라인 우선, 완주율 계측 내장

아래는 이 문서의 설계가 실제로 안착한 저장소 구조다 (백엔드는 `ear-trip-api` 단일 모듈 —
구형 `com.hearbusan` 백엔드는 PlaybackEvent를 이식한 뒤 은퇴했다).

```
Ear-Trip/
├─ backend/ear-trip-api/   (Spring Boot 3.3 · Java 21)
│  └─ com.eartrip
│     ├─ common/           SecurityConfig, CorsConfig, ApiExceptionHandler
│     ├─ course/
│     │  ├─ domain/        Course, Scene, PlaybackEvent, EventType
│     │  ├─ repository/    CourseRepository, PlaybackEventRepository
│     │  ├─ dto/           CourseDtos (Summary, Detail, PlaybackEventRequest, CourseStats)
│     │  ├─ service/       PlaybackEventService
│     │  └─ controller/    CourseController
│     └─ payment/          (토스 결제·이용권 — 이 문서 범위 밖)
│        ├─ domain/        PurchaseOrder, Payment, Product, Entitlement
│        ├─ infra/         TossPaymentsClient
│        ├─ service/       PaymentConfirmService, PaymentConfirmProcessor, EntitlementService
│        └─ controller/    PaymentController
│  ├─ resources/           application.yml, data.sql, db/migration/ (Flyway)
│  └─ test/                PlaybackEventContractTest, PaymentConfirm{Service,Processor}Test
├─ frontend/               (React 18 · Vite — 웹 검증장)
│  ├─ src/
│  │  ├─ api/courseApi.js
│  │  ├─ utils/geo.js            히스테리시스 트래커 (+dwell)
│  │  ├─ audio/AudioQueue.js
│  │  ├─ offline/prefetch.js
│  │  ├─ hooks/useGeofencePlayer.js
│  │  ├─ store/playerStore.js
│  │  ├─ screens/               Home, Map, Player
│  │  ├─ payment/               Paywall, useAccess, paymentApi
│  │  └─ qa/                    QaOverlay (현장 보행 QA)
│  └─ tests/geo.test.mjs         node --test
└─ mobile/                 (Expo React Native — 배경 실행 계층)
   └─ src/
      ├─ utils/geo.js            frontend와 동일 계약 (함께 수정할 것)
      ├─ location/backgroundTask.js
      ├─ store/courseStore.js
      ├─ player/trackQueue.js
      ├─ offline/                download, eventQueue
      └─ auth/                   supabaseClient, LargeSecureStore
```

---

# BACKEND

## domain/EventType.java
```java
package com.travelbyear.geofence.domain;

public enum EventType {
    COURSE_START, SCENE_ENTER, SCENE_COMPLETE, COURSE_COMPLETE
}
```

## domain/Course.java
```java
package com.travelbyear.geofence.domain;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "course")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String city;
    private Integer durationSec;
    private Integer totalDistanceM;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sceneOrder ASC")
    private List<Scene> scenes = new ArrayList<>();

    protected Course() {}

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getCity() { return city; }
    public Integer getDurationSec() { return durationSec; }
    public Integer getTotalDistanceM() { return totalDistanceM; }
    public List<Scene> getScenes() { return scenes; }
}
```

## domain/Scene.java
```java
package com.travelbyear.geofence.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "scene")
public class Scene {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    private Integer sceneOrder;
    private String title;

    private Double triggerLat;
    private Double triggerLng;
    private Integer enterRadiusM;   // 진입 판정 반경
    private Integer exitRadiusM;    // 이탈 판정 반경 (> enter, 히스테리시스)

    private String audioClipUrl;
    private Integer durationSec;

    @Column(length = 2000)
    private String fallbackText;    // 접근성/자막

    protected Scene() {}

    public Long getId() { return id; }
    public Integer getSceneOrder() { return sceneOrder; }
    public String getTitle() { return title; }
    public Double getTriggerLat() { return triggerLat; }
    public Double getTriggerLng() { return triggerLng; }
    public Integer getEnterRadiusM() { return enterRadiusM; }
    public Integer getExitRadiusM() { return exitRadiusM; }
    public String getAudioClipUrl() { return audioClipUrl; }
    public Integer getDurationSec() { return durationSec; }
    public String getFallbackText() { return fallbackText; }
}
```

## domain/PlaybackEvent.java
```java
package com.travelbyear.geofence.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "playback_event",
       indexes = @Index(name = "idx_course_type", columnList = "courseId,eventType"))
public class PlaybackEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long courseId;
    private Integer sceneOrder;      // nullable (COURSE_* 이벤트)
    private String sessionId;        // 클라이언트 1회 청취 세션

    @Enumerated(EnumType.STRING)
    private EventType eventType;

    private Instant occurredAt;

    protected PlaybackEvent() {}

    private PlaybackEvent(Long courseId, Integer sceneOrder, String sessionId, EventType eventType) {
        this.courseId = courseId;
        this.sceneOrder = sceneOrder;
        this.sessionId = sessionId;
        this.eventType = eventType;
        this.occurredAt = Instant.now();
    }

    public static PlaybackEvent of(Long courseId, Integer sceneOrder, String sessionId, EventType type) {
        return new PlaybackEvent(courseId, sceneOrder, sessionId, type);
    }
}
```

## repository/CourseRepository.java
```java
package com.travelbyear.geofence.repository;

import com.travelbyear.geofence.domain.Course;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    @EntityGraph(attributePaths = "scenes")   // N+1 방지
    Optional<Course> findWithScenesById(Long id);
}
```

## repository/PlaybackEventRepository.java
```java
package com.travelbyear.geofence.repository;

import com.travelbyear.geofence.domain.EventType;
import com.travelbyear.geofence.domain.PlaybackEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaybackEventRepository extends JpaRepository<PlaybackEvent, Long> {
    long countByCourseIdAndEventType(Long courseId, EventType eventType);
}
```

## dto/SceneResponse.java
```java
package com.travelbyear.geofence.dto;

public record SceneResponse(
        int sceneOrder,
        String title,
        double triggerLat,
        double triggerLng,
        int enterRadiusM,
        int exitRadiusM,
        String audioClipUrl,
        int durationSec,
        String fallbackText
) {}
```

## dto/CourseResponse.java
```java
package com.travelbyear.geofence.dto;

import java.util.List;

public record CourseResponse(
        Long id,
        String title,
        String city,
        int durationSec,
        int totalDistanceM,
        List<SceneResponse> scenes
) {}
```

## dto/PlaybackEventRequest.java
```java
package com.travelbyear.geofence.dto;

import com.travelbyear.geofence.domain.EventType;
import jakarta.validation.constraints.NotNull;

public record PlaybackEventRequest(
        @NotNull String sessionId,
        Integer sceneOrder,          // COURSE_* 이벤트는 null 허용
        @NotNull EventType eventType
) {}
```

## dto/CourseStats.java
```java
package com.travelbyear.geofence.dto;

// 핵심 성공지표: 완주율
public record CourseStats(long starts, long completions, double completionRate) {}
```

## service/GeoUtils.java
```java
package com.travelbyear.geofence.service;

// 서버측 거리 계산(이벤트 검증/정렬용). 실시간 트리거는 클라이언트가 수행.
public final class GeoUtils {

    private static final double EARTH_RADIUS_M = 6_371_000.0;

    private GeoUtils() {}

    public static double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
```

## service/CourseService.java
```java
package com.travelbyear.geofence.service;

import com.travelbyear.geofence.domain.Course;
import com.travelbyear.geofence.domain.Scene;
import com.travelbyear.geofence.dto.CourseResponse;
import com.travelbyear.geofence.dto.SceneResponse;
import com.travelbyear.geofence.repository.CourseRepository;
import com.travelbyear.geofence.web.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CourseService {

    private final CourseRepository courseRepository;

    public CourseService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @Transactional(readOnly = true)
    public CourseResponse getCourse(Long id) {
        Course course = courseRepository.findWithScenesById(id)
                .orElseThrow(() -> new NotFoundException("course not found: " + id));
        return toResponse(course);
    }

    private CourseResponse toResponse(Course c) {
        List<SceneResponse> scenes = c.getScenes().stream()
                .map(this::toSceneResponse)
                .toList();
        return new CourseResponse(
                c.getId(), c.getTitle(), c.getCity(),
                c.getDurationSec(), c.getTotalDistanceM(), scenes);
    }

    private SceneResponse toSceneResponse(Scene s) {
        return new SceneResponse(
                s.getSceneOrder(), s.getTitle(),
                s.getTriggerLat(), s.getTriggerLng(),
                s.getEnterRadiusM(), s.getExitRadiusM(),
                s.getAudioClipUrl(), s.getDurationSec(), s.getFallbackText());
    }
}
```

## service/PlaybackEventService.java
```java
package com.travelbyear.geofence.service;

import com.travelbyear.geofence.domain.EventType;
import com.travelbyear.geofence.domain.PlaybackEvent;
import com.travelbyear.geofence.dto.CourseStats;
import com.travelbyear.geofence.dto.PlaybackEventRequest;
import com.travelbyear.geofence.repository.PlaybackEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlaybackEventService {

    private final PlaybackEventRepository eventRepository;

    public PlaybackEventService(PlaybackEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @Transactional
    public void record(Long courseId, PlaybackEventRequest req) {
        eventRepository.save(
                PlaybackEvent.of(courseId, req.sceneOrder(), req.sessionId(), req.eventType()));
    }

    @Transactional(readOnly = true)
    public CourseStats stats(Long courseId) {
        long starts = eventRepository.countByCourseIdAndEventType(courseId, EventType.COURSE_START);
        long completions = eventRepository.countByCourseIdAndEventType(courseId, EventType.COURSE_COMPLETE);
        double rate = starts == 0 ? 0.0 : (double) completions / starts;
        return new CourseStats(starts, completions, rate);
    }
}
```

## web/NotFoundException.java
```java
package com.travelbyear.geofence.web;

public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) { super(message); }
}
```

## web/ApiExceptionHandler.java
```java
package com.travelbyear.geofence.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail handleNotFound(NotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }
}
```

## web/CourseController.java
```java
package com.travelbyear.geofence.web;

import com.travelbyear.geofence.dto.CourseResponse;
import com.travelbyear.geofence.dto.CourseStats;
import com.travelbyear.geofence.dto.PlaybackEventRequest;
import com.travelbyear.geofence.service.CourseService;
import com.travelbyear.geofence.service.PlaybackEventService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseService courseService;
    private final PlaybackEventService eventService;

    public CourseController(CourseService courseService, PlaybackEventService eventService) {
        this.courseService = courseService;
        this.eventService = eventService;
    }

    // 오프라인 사전 다운로드용: 코스 + 전 지점 좌표/오디오 URL
    @GetMapping("/{id}")
    public CourseResponse getCourse(@PathVariable Long id) {
        return courseService.getCourse(id);
    }

    @PostMapping("/{id}/events")
    public ResponseEntity<Void> recordEvent(@PathVariable Long id,
                                            @Valid @RequestBody PlaybackEventRequest req) {
        eventService.record(id, req);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{id}/stats")
    public CourseStats stats(@PathVariable Long id) {
        return eventService.stats(id);
    }
}
```

## resources/application.yml
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/travelbyear?serverTimezone=UTC
    username: root
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: update      # MVP 전용. 운영은 Flyway 권장
    open-in-view: false
    defer-datasource-initialization: true
  sql:
    init:
      mode: always          # data.sql 시딩

server:
  port: 8080
```

## resources/data.sql  (자갈치 시드)
```sql
-- 좌표는 근사값. 반드시 현장 답사(보행 QA)로 재보정할 것.
INSERT INTO course (id, title, city, duration_sec, total_distance_m)
VALUES (1, '새벽, 자갈치', '부산', 1680, 1100);

INSERT INTO scene (course_id, scene_order, title, trigger_lat, trigger_lng,
                   enter_radius_m, exit_radius_m, audio_clip_url, duration_sec, fallback_text) VALUES
(1, 1, '자갈밭 위의 좌판', 35.0972, 129.0298, 25, 45, 'https://cdn.example/jagalchi/s1.aac', 210, '지금 이 자리는 백 년 전 바다였습니다...'),
(1, 2, '삼경에 일어나는 사람들', 35.0938, 129.0272, 30, 55, 'https://cdn.example/jagalchi/s2.aac', 260, '새벽 다섯 시, 시장이 가장 뜨거운 시간...'),
(1, 3, '버려지던 것들', 35.0968, 129.0300, 20, 40, 'https://cdn.example/jagalchi/s3.aac', 240, '이 냄새는 곰장어 굽는 냄새입니다...'),
(1, 4, '오이소, 보이소', 35.0966, 129.0306, 20, 40, 'https://cdn.example/jagalchi/s4.aac', 250, '오이소 보이소 사이소, 그 유명한 소리...'),
(1, 5, '다리가 열리던 시절', 35.0975, 129.0345, 30, 55, 'https://cdn.example/jagalchi/s5.aac', 230, '저기 영도대교가 보입니다...');
```

## test/GeoUtilsTest.java
```java
package com.travelbyear.geofence.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GeoUtilsTest {

    @Test
    @DisplayName("동일 좌표의 거리는 0m")
    void zeroDistanceForSamePoint() {
        double d = GeoUtils.distanceMeters(35.0966, 129.0306, 35.0966, 129.0306);
        assertEquals(0.0, d, 0.001);
    }

    @Test
    @DisplayName("자갈치 인접 두 지점 거리 오차 검증")
    void knownDistance() {
        // s4(회센터) ~ s3(곰장어골목) 근사 거리 ≈ 55m
        double d = GeoUtils.distanceMeters(35.0966, 129.0306, 35.0968, 129.0300);
        assertEquals(55.0, d, 15.0);   // 근사 허용 오차
    }
}
```

---

# FRONTEND

## utils/geo.js
```javascript
const EARTH_RADIUS_M = 6_371_000;

export function distanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const toRad = (deg) => (deg * Math.PI) / 180;

// 히스테리시스 지오펜스: 진입/이탈 반경을 분리해 GPS 튐에 강함
export function createGeofenceTracker(scenes) {
  const inside = new Set(); // 현재 진입 상태인 sceneOrder

  return {
    // 새로 '진입'한 scene 목록만 반환
    update(lat, lng) {
      const entered = [];
      for (const s of scenes) {
        const d = distanceMeters(lat, lng, s.triggerLat, s.triggerLng);
        if (!inside.has(s.sceneOrder) && d <= s.enterRadiusM) {
          inside.add(s.sceneOrder);
          entered.push(s);
        } else if (inside.has(s.sceneOrder) && d > s.exitRadiusM) {
          inside.delete(s.sceneOrder); // 이탈 (재진입 허용)
        }
      }
      return entered;
    },
  };
}
```

## audio/AudioQueue.js
```javascript
// 걷는 속도 적응의 핵심: 재생 중이면 끊지 않고 큐잉, 완주 후 다음 재생
export class AudioQueue {
  constructor(onSceneComplete) {
    this.queue = [];
    this.current = null;
    this.playing = false;
    this.onSceneComplete = onSceneComplete;
    this.audio = new Audio();
    this.audio.addEventListener('ended', () => this._next());
  }

  // 자동재생 정책 우회용: 시작 버튼(사용자 제스처)에서 1회 호출
  prime() {
    this.audio.muted = true;
    this.audio.play().catch(() => {});
    this.audio.pause();
    this.audio.muted = false;
  }

  enqueue(scene, src) {
    this.queue.push({ scene, src });
    if (!this.playing) this._next();
  }

  _next() {
    if (this.current) this.onSceneComplete?.(this.current.scene);
    const item = this.queue.shift();
    if (!item) {
      this.playing = false;
      this.current = null;
      return;
    }
    this.playing = true;
    this.current = item;
    this.audio.src = item.src;
    this.audio.play().catch((e) => console.warn('play blocked', e));
  }
}
```

## offline/prefetch.js
```javascript
// 코스 시작 시 전 지점 오디오를 미리 받아 오프라인 재생 보장 (시장 내 통신 불안정 대비)
// 네이티브(React Native)에서는 expo-file-system/react-native-fs 로 로컬 경로 캐싱으로 교체
export async function prefetchAudio(scenes) {
  const srcMap = new Map(); // sceneOrder -> objectURL
  await Promise.all(
    scenes.map(async (s) => {
      const res = await fetch(s.audioClipUrl);
      const blob = await res.blob();
      srcMap.set(s.sceneOrder, URL.createObjectURL(blob));
    })
  );
  return srcMap;
}
```

## api/courseApi.js
```javascript
const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';

export async function fetchCourse(id) {
  const res = await fetch(`${BASE}/api/courses/${id}`);
  if (!res.ok) throw new Error(`course ${id} load failed`);
  return res.json();
}

export function postEvent(courseId, payload) {
  // fire-and-forget (계측용). 오프라인 시 큐잉 후 재전송은 향후 개선
  return fetch(`${BASE}/api/courses/${courseId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
```

## hooks/useGeofencePlayer.js
```javascript
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCourse, postEvent } from '../api/courseApi';
import { prefetchAudio } from '../offline/prefetch';
import { createGeofenceTracker } from '../utils/geo';
import { AudioQueue } from '../audio/AudioQueue';

export function useGeofencePlayer(courseId) {
  const [status, setStatus] = useState('idle'); // idle|loading|active|completed
  const [course, setCourse] = useState(null);
  const [currentScene, setCurrentScene] = useState(null);
  const [playedCount, setPlayedCount] = useState(0);

  const tracker = useRef(null);
  const queue = useRef(null);
  const srcMap = useRef(null);
  const played = useRef(new Set());
  const watchId = useRef(null);
  const sessionId = useRef(crypto.randomUUID());

  const emit = useCallback(
    (eventType, sceneOrder = null) =>
      postEvent(courseId, { sessionId: sessionId.current, sceneOrder, eventType }),
    [courseId]
  );

  const onPosition = useCallback(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      for (const scene of tracker.current.update(latitude, longitude)) {
        if (played.current.has(scene.sceneOrder)) continue; // 1회성
        played.current.add(scene.sceneOrder);
        setCurrentScene(scene);
        setPlayedCount(played.current.size);
        queue.current.enqueue(scene, srcMap.current.get(scene.sceneOrder));
        emit('SCENE_ENTER', scene.sceneOrder);
      }
    },
    [emit]
  );

  const start = useCallback(async () => {
    setStatus('loading');
    const data = await fetchCourse(courseId);
    setCourse(data);
    srcMap.current = await prefetchAudio(data.scenes);
    tracker.current = createGeofenceTracker(data.scenes);
    queue.current = new AudioQueue((scene) => {
      emit('SCENE_COMPLETE', scene.sceneOrder);
      if (scene.sceneOrder === data.scenes.length) {
        emit('COURSE_COMPLETE');
        setStatus('completed');
      }
    });
    queue.current.prime(); // 사용자 제스처 내에서 오디오 언락
    emit('COURSE_START');
    setStatus('active');
    watchId.current = navigator.geolocation.watchPosition(onPosition, console.error, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    });
  }, [courseId, emit, onPosition]);

  useEffect(
    () => () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    },
    []
  );

  return { status, course, currentScene, playedCount, start };
}
```

## components/CoursePlayer.jsx
```jsx
import { useGeofencePlayer } from '../hooks/useGeofencePlayer';

export default function CoursePlayer({ courseId = 1 }) {
  const { status, course, currentScene, playedCount, start } = useGeofencePlayer(courseId);

  if (status === 'idle') {
    return (
      <button onClick={start}>코스 시작 (오디오 다운로드 후 걷기)</button>
    );
  }
  if (status === 'loading') return <p>오디오 내려받는 중…</p>;

  return (
    <div>
      <h2>{course?.title}</h2>
      <p>진행: {playedCount} / {course?.scenes.length}</p>
      <p>현재 지점: {currentScene?.title ?? '다음 지점으로 이동하세요'}</p>
      {status === 'completed' && <p>완주하셨습니다. 고맙습니다.</p>}
      <small>이어폰을 끼고 화면은 주머니에 넣어도 됩니다.</small>
    </div>
  );
}
```

---

# 통합/한계 노트

- **배경 재생·화면 꺼짐:** 웹 브라우저는 백그라운드에서 `watchPosition`이 대부분 정지된다. "폰을 주머니에" 경험의 완성은 **React Native(백그라운드 위치 + 지오펜스 API + 백그라운드 오디오)** 또는 제한적 PWA가 목표. 위 코드는 로직 검증용 웹 MVP이며, `utils/geo.js`·`AudioQueue.js`·`useGeofencePlayer.js`의 핵심 로직은 RN으로 그대로 이식된다.
- **네이티브 이식 포인트:** `prefetch.js`(→ 파일시스템 캐싱), 위치 구독(→ OS 지오펜스 API로 교체해 배터리 최적화), `AudioQueue`(→ 백그라운드 오디오 세션).
- **놓친 지점 처리(향후):** 지점을 건너뛰면 지도에서 수동 재생. 현재 MVP는 `inside` 이탈 후에도 `played`로 1회성 유지하므로 자동 재재생은 없음.
- **이벤트 오프라인 큐잉(향후):** `postEvent` 실패분을 로컬 저장 후 온라인 복귀 시 재전송하면 완주율 계측 정확도 상승.
- **상태관리:** MVP는 훅 자체 완결. 화면 확장 시 `useGeofencePlayer`의 상태를 Zustand 스토어로 승격하면 됨.
```
```
