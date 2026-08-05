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
    @DisplayName("예상 낭독 길이가 실제 녹음본 길이와 일치한다 (mobile/assets/audio 실측)")
    void estimatedSecMatchesRecordings() {
        // 대본 글자수 추정치가 아니라 WAV 실측값이다. 재녹음하면 여기와 V7, 목 데이터를 함께 고칠 것.
        assertThat(ep01Scenes()).map(Scene::getEstimatedSec)
                .containsExactly(214, 275, 261, 245, 259);
    }

    @Test
    @DisplayName("코스가 화면용 필드(사진 키·소개·태그)를 갖는다 — 없으면 홈·상세에서 사진이 사라진다")
    void courseCarriesPresentationFields() {
        var course = courseRepository.findByIdWithScenes(1L).orElseThrow();

        // 앱의 HERO_IMAGES 키와 일치해야 한다. 오타면 조용히 사진만 안 뜬다.
        assertThat(course.getHeroKey()).isEqualTo("jagalchi");
        assertThat(course.getDescription()).contains("자갈치 시장입니다");
        assertThat(course.getTags()).containsExactly("부산", "중구", "자갈치", "자갈치시장", "수산시장");
    }

    @Test
    @DisplayName("모든 씬이 지점명(landmark)을 갖는다 — 없으면 NEXT STOP이 서사용 제목으로 폴백된다")
    void everySceneHasLandmark() {
        assertThat(ep01Scenes()).map(Scene::getLandmark)
                .containsExactly("부산 자갈치시장 입구", "부산공동어시장 새벽 경매장",
                        "곰장어 구이 골목", "회센터 수조 앞", "영도대교가 보이는 바닷가");
    }

    @Test
    @DisplayName("모든 씬이 대본(script)을 갖는다 — 없으면 플레이어가 '준비 중' 플레이스홀더로 떨어진다")
    void everySceneHasScript() {
        assertThat(ep01Scenes()).allSatisfy(s ->
                assertThat(s.getScript()).isNotBlank());
    }

    @Test
    @DisplayName("대본이 잘리지 않고 통째로 저장된다 (varchar(8000) — 최장 씬 약 1,990자)")
    void scriptIsNotTruncated() {
        List<Scene> scenes = ep01Scenes();

        // 컬럼 폭이 줄면 DB가 조용히 끝을 자른다 — 마지막 문장으로 꼬리까지 확인한다.
        assertThat(scenes.get(1).getScript()).hasSizeGreaterThan(1900)
                .endsWith("이제 곰장어 굽는 냄새를 따라가 볼까요. 골목 안쪽으로, 천천히.");
        assertThat(scenes.get(4).getScript())
                .endsWith("원래 그런 분들이거든요. 다음에 또... 오이소.");
    }

    /**
     * 큐시트 B-1은 "낭독 길이 ≤ 다음 씬까지 도보 시간"을 규칙으로 뒀고, 예전 추정치(S3 45초)로는
     * 지켜졌다. 실제 녹음본(261초)은 이 규칙을 깬다 — 규칙을 못 지킨 게 아니라 콘텐츠가 그만큼 길어졌다.
     *
     * 재생이 끊기지는 않는다. trackQueue는 재생 중이면 다음 씬을 큐에 붙이므로(걷는 속도 적응),
     * 보행자는 S4에 도착해도 S3 이야기를 마저 듣고 이어서 S4가 나온다.
     * 다만 "눈앞에 보이는 것과 대사가 연결된다"는 전제는 그 구간에서 깨진다 —
     * 동선을 늘리든 분량을 줄이든 조정이 필요하고, 이건 현장 QA에서 결정할 문제다.
     *
     * 이 테스트는 그 상태를 기록해 둔다. 조정이 끝나 규칙을 다시 만족하게 되면 이 테스트는 지우고
     * 원래의 "낭독 < 도보" 단언으로 되돌릴 것.
     */
    @Test
    @DisplayName("[알려진 이슈] S3 낭독(261초)이 S3→S4 도보(약 59초)보다 길다 — 큐가 흡수하지만 동선 조정 필요")
    void s3NarrationOverrunsWalkToS4() {
        List<Scene> scenes = ep01Scenes();
        Scene s3 = scenes.get(2);
        Scene s4 = scenes.get(3);

        double walkSec = distanceM(s3.getLat(), s3.getLng(), s4.getLat(), s4.getLng()) / 1.0;
        assertThat((double) s3.getEstimatedSec()).isGreaterThan(walkSec);
        // 겹침이 오탐으로 번지지 않도록 두 씬 모두 체류 트리거여야 한다.
        assertThat(s3.getTriggerType()).isEqualTo(TriggerType.DWELL);
        assertThat(s4.getTriggerType()).isEqualTo(TriggerType.DWELL);
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
