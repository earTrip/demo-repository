package com.eartrip.course.dto;

import com.eartrip.course.domain.Course;
import com.eartrip.course.domain.Scene;

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
     */
    public record SceneView(Long sceneId, int order, String title,
                            double lat, double lng, int radiusM,
                            boolean locked, String audioUrl) {
        public static SceneView of(Scene s, boolean unlocked) {
            boolean locked = !unlocked;
            return new SceneView(s.getId(), s.getSceneOrder(), s.getTitle(),
                    s.getLat(), s.getLng(), s.getRadiusM(),
                    locked, locked ? null : s.getAudioUrl());
        }
    }

    public record Detail(Long id, String title, String region, int durationMin,
                         double distanceKm, boolean owned, List<SceneView> scenes) {}
}
