package com.eartrip.course.dto;

import com.eartrip.course.domain.Course;
import com.eartrip.course.domain.EventType;
import com.eartrip.course.domain.Scene;
import com.eartrip.course.domain.TriggerType;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class CourseDtos {

    public record Summary(Long id, String title, String subtitle, String region,
                          int durationMin, double distanceKm, int sceneCount, String thumb) {
        public static Summary from(Course c) {
            return new Summary(c.getId(), c.getTitle(), c.getSubtitle(), c.getRegion(),
                    c.getDurationMin(), c.getDistanceKm(), c.getScenes().size(), c.getThumbKey());
        }
    }

    /**
     * 상세 응답 — 잠금 씬은 audioUrl을 내리지 않는다 (서버 측 프리미엄 강제).
     * locked=true인 씬은 좌표·제목만 노출해 지도의 자물쇠 핀으로 사용.
     *
     * triggerType/dwellSec은 클라이언트 geo.js의 트래커가 그대로 읽는 계약이다
     * (큐시트 B-1). 빠뜨리면 전 씬이 진입 즉시로 떨어져 밀집 지역 오탐 방지가 사라진다.
     */
    public record SceneView(Long sceneId, int order, String title,
                            double lat, double lng, int radiusM,
                            TriggerType triggerType, Integer dwellSec, Integer estimatedSec,
                            boolean locked, String audioUrl) {
        public static SceneView of(Scene s, boolean unlocked) {
            boolean locked = !unlocked;
            return new SceneView(s.getId(), s.getSceneOrder(), s.getTitle(),
                    s.getLat(), s.getLng(), s.getRadiusM(),
                    s.getTriggerType(), s.getDwellSec(), s.getEstimatedSec(),
                    locked, locked ? null : s.getAudioUrl());
        }
    }

    public record Detail(Long id, String title, String region, int durationMin,
                         double distanceKm, boolean owned, List<SceneView> scenes) {}

    /** 완주율 계측 이벤트 기록 요청 (모바일 오프라인 이벤트 큐가 posting) */
    public record PlaybackEventRequest(
            @NotNull String sessionId,
            Integer sceneOrder,   // COURSE_* 이벤트는 null 허용
            @NotNull EventType eventType
    ) {}

    public record CourseStats(long starts, long completions, double completionRate) {}
}
