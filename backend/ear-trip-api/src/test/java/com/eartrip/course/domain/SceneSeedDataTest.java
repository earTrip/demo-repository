package com.eartrip.course.domain;

import com.eartrip.course.repository.CourseRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 큐시트 B-1의 트리거 설계가 스키마·시드에 실제로 반영돼 있는지 검증한다.
 * 트리거가 빠지면 전 씬이 '진입 즉시'로 떨어지는데, 그건 에러 없이 조용히 일어난다.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("local")
class SceneSeedDataTest {

    @Autowired CourseRepository courseRepository;

    private List<Scene> ep01Scenes() {
        return courseRepository.findByIdWithScenes(1L).orElseThrow().getScenes().stream()
                .sorted(Comparator.comparingInt(Scene::getSceneOrder))
                .toList();
    }

    @Test
    @DisplayName("EP.01 씬은 모두 트리거 조건을 갖는다 (NOT NULL)")
    void everySceneHasTrigger() {
        assertThat(ep01Scenes()).hasSize(5);
        assertThat(ep01Scenes()).allSatisfy(s -> assertThat(s.getTriggerType()).isNotNull());
    }

    @Test
    @DisplayName("S3·S4만 3초 체류 (59m 간격·S1↔S3 48m 밀집 — 오탐 방지), 나머지는 진입 즉시")
    void dwellOnlyOnCrowdedScenes() {
        List<Scene> scenes = ep01Scenes();

        assertThat(scenes.stream().filter(s -> s.getTriggerType() == TriggerType.DWELL)
                .map(Scene::getSceneOrder)).containsExactly(3, 4);
        assertThat(scenes.stream().filter(s -> s.getTriggerType() == TriggerType.DWELL)
                .map(Scene::getDwellSec)).containsOnly(3);
        assertThat(scenes.stream().filter(s -> s.getTriggerType() == TriggerType.ENTER)
                .map(Scene::getDwellSec)).containsOnlyNulls();
    }

    @Test
    @DisplayName("예상 낭독 길이가 큐시트 B-1 값과 일치한다 (S4는 파일럿 검증 4분)")
    void estimatedSecMatchesCueSheet() {
        assertThat(ep01Scenes()).map(Scene::getEstimatedSec)
                .containsExactly(45, 60, 45, 240, 40);
    }

    @Test
    @DisplayName("S3 낭독(45초) < S3→S4 도보(약 60초) — 트리거 충돌 없음 (큐시트 B-1 근거)")
    void s3NarrationFitsBeforeS4() {
        List<Scene> scenes = ep01Scenes();
        Scene s3 = scenes.get(2);
        Scene s4 = scenes.get(3);

        // 59m를 보통 걸음(약 1.0m/s)으로 이동 = 약 59초. 낭독이 그보다 길면 S4 진입 시 겹친다.
        double walkSec = distanceM(s3.getLat(), s3.getLng(), s4.getLat(), s4.getLng()) / 1.0;
        assertThat((double) s3.getEstimatedSec()).isLessThan(walkSec);
    }

    /** 큐시트 좌표 검증용 Haversine (프론트 geo.js와 동일 식) */
    private static double distanceM(double lat1, double lng1, double lat2, double lng2) {
        double r = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * r * Math.asin(Math.sqrt(a));
    }
}
